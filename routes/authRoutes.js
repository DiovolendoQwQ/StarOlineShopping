// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const behaviorTracker = require('../middleware/behaviorTracker');

// 随机生成用户 ID 的函数（生成随机数字）
function generateUserId() {
  return Math.floor(Math.random() * 1000000); // 示例：生成一个 1 到 999999 的随机整数
}

// 注册路由
router.post('/register', async (req, res) => {
  const { register_username, register_email, register_password, confirm_password } = req.body;

  try {
    console.log('收到注册请求:', req.body);

    if (!register_password || register_password !== confirm_password) {
      console.error('注册失败: 密码不能为空或两次输入不一致');
      return res.send(`
                <script>
                    alert("密码不能为空或两次输入不一致");
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
                    alert("用户已存在，请登录");
                    window.location.href = "/login.html";
                </script>
            `);
    }

    // 加密密码
    console.log('开始加密密码...');
    const hashedPassword = await bcrypt.hash(register_password, 10);

    // 随机生成用户 ID
    const userId = generateUserId();

    // 插入新用户
    await db.runAsync(
      "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
      [userId, register_username, register_email, hashedPassword]
    );

    console.log('注册成功，生成的用户 ID:', userId);

    // 设置用户会话
    req.session.userId = userId;
    req.session.user = {
      user_id: userId.toString(),
      username: register_username,
      email: register_email,
      role: null // 新注册用户默认没有角色
    };

    res.send(`
            <script>
                alert("注册成功，正在跳转到主页");
                window.location.href = "/homepage";
            </script>
        `);
  } catch (err) {
    console.error("注册失败:", err);
    res.send(`
            <script>
                alert("注册失败，请稍后再试");
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
    const user = await db.getAsync("SELECT id, username, email, password, role FROM users WHERE email = ?", [email]);

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
        role: user.role
      };

      // 记录登录行为
      const loginTracker = behaviorTracker.trackLogin();
      await new Promise((resolve) => {
        loginTracker(req, res, resolve);
      });

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

module.exports = router;
