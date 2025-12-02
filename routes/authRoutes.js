// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const behaviorTracker = require('../middleware/behaviorTracker');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadRateMap = new Map();

// 随机生成用户 ID 的函数（生成随机数字）
function generateUserId() {
  return Math.floor(Math.random() * 1000000); // 示例：生成一个 1 到 999999 的随机整数
}

// 注册路由
router.post('/register', async (req, res) => {
  const { register_email, register_password, confirm_password } = req.body;

  try {
    console.log('收到注册请求:', req.body);

    if (!register_password || register_password !== confirm_password) {
      console.error('注册失败: 密码不能为空或两次输入不一致');
      return res.send(`
                <script>
                    alert("Password cannot be empty or passwords do not match");
                    window.location.href = "/login.html";
                </script>
            `);
    }

    // 检查用户是否已存在
    const user = await db.getAsync("SELECT * FROM users WHERE email = ?", [register_email]);
    if (user) {
      console.error(`注册失败: 用户已存在 - ${register_email}`);
      return res.send(`
                <script>
                    alert("User already exists. Please log in");
                    window.location.href = "/login.html";
                </script>
            `);
    }

    // 加密密码
    console.log('开始加密密码...');
    const hashedPassword = await bcrypt.hash(register_password, 10);

    // 随机生成用户 ID
    const userId = generateUserId();

    // 默认昵称为 star+ID
    const defaultUsername = `star${userId}`;
    // 插入新用户
    await db.runAsync(
      "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
      [String(userId), defaultUsername, register_email, hashedPassword]
    );

    console.log('注册成功，生成的用户 ID:', userId);

    // 设置用户会话
    req.session.userId = userId;
    req.session.user = {
      user_id: userId.toString(),
      username: defaultUsername,
      email: register_email,
      role: null,
      avatar_url: null
    };

    res.send(`
            <script>
                alert("Sign up successful. Redirecting to homepage");
                window.location.href = "/homepage";
            </script>
        `);
  } catch (err) {
    console.error("注册失败:", err);
    res.send(`
            <script>
                alert("Sign up failed. Please try again later");
                window.location.href = "/login.html";
            </script>
        `);
  }
});

// 登录路由
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('收到登录请求:', req.body);
    const wantsJson = (req.headers.accept && req.headers.accept.includes('application/json')) || req.get('X-Requested-With') === 'XMLHttpRequest';

    // 查找用户并获取完整信息
    const user = await db.getAsync("SELECT id, username, email, password, role, avatar_url FROM users WHERE email = ?", [email]);

    if (!user) {
      console.error(`登录失败: 用户不存在 - ${email}`);
      if (wantsJson) return res.status(400).json({ error: 'invalid_user' });
      return res.redirect('/login.html?error=invalid_user');
    }

    // 验证密码
    console.log('验证密码中...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      console.log('登录成功:', email);

      // 保存完整用户信息到会话
      req.session.userId = user.id;
      req.session.user = {
        user_id: user.id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url || null
      };

      // 记录登录行为
      const loginTracker = behaviorTracker.trackLogin();
      await new Promise((resolve) => {
        loginTracker(req, res, resolve);
      });

      const { issueToken } = require('../middleware/jwtAuth');
      const token = issueToken(req.session.user);
      res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: String(process.env.TLS_ENABLED||'0')==='1' });
      // 检查是否为管理员，如果是则跳转到数据分析后台
      const { isAdmin } = require('../middleware/adminAuth');
      if (isAdmin(req.session.user)) {
        console.log('管理员登录，跳转到数据分析后台');
        if (wantsJson) return res.json({ ok: true, redirect: '/analytics/dashboard' });
        return res.redirect('/analytics/dashboard');
      }
      if (wantsJson) return res.json({ ok: true, redirect: '/homepage' });
      return res.redirect('/homepage');
    } else {
      console.error('登录失败: 密码错误');
      if (wantsJson) return res.status(401).json({ error: 'invalid_password' });
      return res.redirect('/login.html?error=invalid_password');
    }
  } catch (error) {
    console.error('登录失败:', error);
    const wantsJson = (req.headers.accept && req.headers.accept.includes('application/json')) || req.get('X-Requested-With') === 'XMLHttpRequest';
    if (wantsJson) return res.status(500).json({ error: 'server_error' });
    return res.redirect('/login.html?error=server_error');
  }
});

// 登出路由
router.post('/logout', (req, res) => {
  try {
    const uid = req.session && req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        console.error('登出失败:', err);
        return res.status(500).json({ error: 'logout_failed' });
      }
      res.clearCookie('connect.sid');
      (async () => { try { if (uid) { const db = require('../config/database'); await db.runAsync(`UPDATE cs_sessions SET status='ended', online=0, ended_at=CURRENT_TIMESTAMP WHERE user_id=? AND status='active'`, [String(uid)]); } } catch (e) {} })();
      return res.json({ ok: true, redirect: '/login.html' });
    });
  } catch (error) {
    console.error('登出异常:', error);
    return res.status(500).json({ error: 'logout_failed' });
  }
});

// 获取当前登录用户信息（含头像）
router.get('/me', async (req, res) => {
  try {
    const sessUser = req.session && req.session.user;
    const userId = req.session && req.session.userId;
    if (!userId || !sessUser) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const AVATAR_DIR = path.join(__dirname, '../public/uploads/avatars');
    const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
    ensureDir(AVATAR_DIR);
    let avatarUrl = sessUser.avatar_url || null;
    let username = sessUser.username || null;
    // 优先从数据库读取以确保最新
    try {
      const row = await db.getAsync('SELECT username, avatar_url FROM users WHERE id = ?', [String(userId)]);
      if (row) {
        username = row.username || username;
        avatarUrl = row.avatar_url || avatarUrl;
      }
    } catch (e) {}
    if (!avatarUrl) {
      try {
        const row = await db.getAsync('SELECT avatar_url FROM users WHERE id = ?', [String(userId)]);
        avatarUrl = (row && row.avatar_url) || null;
      } catch (e) {}
    }
    if (!avatarUrl) {
      const list = fs.readdirSync(AVATAR_DIR).filter((f) => f.startsWith(String(userId) + '_'));
      let latest = null;
      if (list.length > 0) {
        latest = list
          .map((name) => ({ name, ts: Number(name.split('_')[1]) || 0 }))
          .sort((a, b) => b.ts - a.ts)[0].name;
      }
      avatarUrl = latest ? `/uploads/avatars/${latest}` : null;
    }
    req.session.user.avatar_url = avatarUrl || null;
    req.session.user.username = username || req.session.user.username;

    return res.json({
      user_id: String(userId),
      username,
      email: sessUser.email,
      role: sessUser.role,
      avatar_url: avatarUrl
    });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
});

// 头像上传（需登录），返回最新头像 URL
(() => {
  const AVATAR_DIR = path.join(__dirname, '../public/uploads/avatars');
  const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
  ensureDir(AVATAR_DIR);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => {
      const uid = req.session && (req.session.userId || (req.session.user && req.session.user.user_id));
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
      cb(null, `${uid}_${Date.now()}${safeExt}`);
    }
  });

  const uploadAvatar = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file) return cb(new Error('no_file'));
      const okMime = /^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype || '');
      if (okMime) return cb(null, true);
      cb(new Error('invalid_type'));
    }
  });

  router.post(
    '/avatar',
    (req, res, next) => {
      if (!(req.session && req.session.userId && req.session.user)) {
        return res.status(401).json({ error: 'unauthenticated' });
      }
      const uid = String(req.session.userId);
      const now = Date.now();
      const last = uploadRateMap.get(uid) || 0;
      if (now - last < 10 * 1000) {
        return res.status(429).json({ error: 'rate_limited' });
      }
      uploadRateMap.set(uid, now);
      next();
    },
    uploadAvatar.single('avatar'),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'no_file' });
        const filePath = req.file.path || path.join(AVATAR_DIR, req.file.filename);
        const fd = fs.openSync(filePath, 'r');
        const header = Buffer.alloc(32);
        fs.readSync(fd, header, 0, 32, 0);
        fs.closeSync(fd);
        const isPng = header.slice(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]));
        const isJpg = header[0]===0xFF && header[1]===0xD8 && header[2]===0xFF;
        const isGif = header.slice(0,6).toString('ascii').startsWith('GIF8');
        const isWebp = header.slice(0,4).toString('ascii')==='RIFF' && header.slice(8,12).toString('ascii')==='WEBP';
        if (!(isPng||isJpg||isGif||isWebp)) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ error: 'invalid_signature' });
        }

        const uid = String(req.session.userId);
        const existing = await db.getAsync('SELECT avatar_url FROM users WHERE id = ?', [uid]);
        if (existing && existing.avatar_url) {
          try {
            const oldAbs = path.join(__dirname, '../public', existing.avatar_url.replace(/^\/*/, ''));
            if (oldAbs.startsWith(path.join(__dirname, '../public/uploads/avatars'))) {
              if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
            }
          } catch(e) {}
        }

        // 清理其他旧文件
        try {
          const files = fs.readdirSync(AVATAR_DIR).filter(f=>f.startsWith(uid+'_'));
          for (const f of files) {
            if (f!==req.file.filename) {
              const p = path.join(AVATAR_DIR, f);
              if (fs.existsSync(p)) fs.unlinkSync(p);
            }
          }
        } catch(e) {}

        const url = `/uploads/avatars/${req.file.filename}`;
        await db.runAsync('UPDATE users SET avatar_url = ? WHERE id = ?', [url, uid]);
        req.session.user.avatar_url = url;
        return res.json({ ok: true, url });
      } catch (err) {
        return res.status(500).json({ error: 'server_error' });
      }
    }
  );
})();

// 根据用户ID返回其头像资源（若不存在则返回默认）
router.get('/avatar/:userId', async (req, res) => {
  try {
    const userId = String(req.params.userId);
    const AVATAR_DIR = path.join(__dirname, '../public/uploads/avatars');
    const initial = path.join(__dirname, '../public/image/initial.png');
    let url = null;
    try {
      const row = await db.getAsync('SELECT avatar_url FROM users WHERE id = ?', [userId]);
      url = row && row.avatar_url;
    } catch(e) {}
    if (url) {
      const abs = path.join(__dirname, '../public', url.replace(/^\/*/, ''));
      if (fs.existsSync(abs)) return res.sendFile(abs);
    }
    const list = fs.existsSync(AVATAR_DIR) ? fs.readdirSync(AVATAR_DIR).filter(f=>f.startsWith(userId+'_')) : [];
    if (list.length>0) {
      const latest = list.map(n=>({n, ts:Number(n.split('_')[1])||0})).sort((a,b)=>b.ts-a.ts)[0].n;
      const abs = path.join(AVATAR_DIR, latest);
      if (fs.existsSync(abs)) return res.sendFile(abs);
    }
    return res.sendFile(initial);
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
});

// 用户更名（更新数据库昵称）
router.post('/nickname', async (req, res) => {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    let nickname = (req.body && (req.body.nickname || req.body.username)) || '';
    if (typeof nickname !== 'string') nickname = '';
    nickname = nickname.trim();
    if (!nickname) return res.status(400).json({ error: 'empty' });
    if (nickname.length > 64) return res.status(400).json({ error: 'too_long' });
    await db.runAsync('UPDATE users SET username = ? WHERE id = ?', [nickname, String(userId)]);
    req.session.user.username = nickname;
    return res.json({ ok: true, username: nickname });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
