const cluster = require('cluster');
if (String(process.env.CLUSTER_ENABLED || '0') === '1' && cluster.isPrimary) {
  const fork = () => { const w = cluster.fork({ WORKER: '1' }); w.on('exit', () => { setTimeout(fork, 1000); }); };
  fork();
  module.exports = {};
  return;
}
const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const session = require('express-session');
require('dotenv').config();
const morgan = require('morgan');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const db = require('./config/database');

const app = express();
let server;

const COLORS = { reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', bold: '\x1b[1m' };
function color(level, text) { const map = { INFO: COLORS.green, QUESTION: COLORS.cyan, REPLY: COLORS.yellow, ERROR: COLORS.red }; return `${map[level] || ''}${text}${COLORS.reset}`; }
function ts() { return new Date().toISOString(); }

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.once('finish', () => {
    try {
      const ms = Number((process.hrtime.bigint() - start) / 1000000n);
      const len = res.getHeader('Content-Length') || '';
      broadcastAdmin({ type: 'server_log', data: { method: req.method, url: req.originalUrl, status: res.statusCode, time: ms, length: len } });
    } catch (_) { }
  });
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: process.env.SESSION_SECRET || 'your_secret_key', resave: false, saveUninitialized: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const tagRoutes = require('./routes/tagRoutes');
const { requireAdminJwt } = require('./middleware/jwtAuth');
const { isAdmin } = require('./middleware/adminAuth');

app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/product', productRoutes);
app.use('/products', productRoutes);
app.use('/order', orderRoutes);
app.use('/orders', orderRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/tags', tagRoutes);

app.post('/register', (req, res) => res.redirect(307, '/auth/register'));
app.post('/login', (req, res) => res.redirect(307, '/auth/login'));

app.get('/', (req, res) => { console.log(color('INFO', `[${ts()}] 访问根路径，跳转到登录页面`)); res.sendFile(path.join(__dirname, 'public', 'login.html')); });
app.get('/login', (req, res) => { console.log(color('INFO', `[${ts()}] 访问登录页面`)); res.sendFile(path.join(__dirname, 'public', 'login.html')); });
app.get('/homepage', (req, res) => {
  console.log(color('INFO', `[${ts()}] 访问主页`));
  const ua = req.headers['user-agent'] || '';
  if (/Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
    console.log(color('INFO', `[${ts()}] 检测到移动端 UA,跳转 mobile.html`));
    return res.redirect('/mobile.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

const csStats = { 支付: 0, 物流: 0, 商品: 0, 账户: 0, 其他: 0 };
function classify(text) { const t = (text || '').toLowerCase(); if (/[付|pay|支付|退款]/.test(text)) return '支付'; if (/[物流|快递|shipping|delivery]/.test(text)) return '物流'; if (/[货|商品|质量|product]/.test(text)) return '商品'; if (/[账|登录|注册|密码|account|login]/.test(text)) return '账户'; return '其他'; }
app.post('/api/customer-service/inquiry', (req, res) => {
  const { sessionId, message } = req.body || {};
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || 'unknown';
  const cat = classify(message); csStats[cat]++;
  console.log(color('QUESTION', `[${ts()}] 客服询问[REST] 会话:${sessionId} 分类:${cat}\nIP:${ip} UA:${ua}\n消息:${message}`));
  const resp = { ok: true, sessionId, receivedAt: ts(), echo: message, category: cat, meta: { ip, ua, reqTime: new Date().toISOString() } };
  const ws = sessions.get(sessionId);
  if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify({ type: 'ack', sessionId, timestamp: ts() })); } catch (_) { } }
  if (ws) { setActiveSession(sessionId); }
  (async () => { try { const row = await db.getAsync(`SELECT status FROM cs_sessions WHERE session_id=?`, [sessionId]); if (row && row.status === 'ended') { return; } await db.runAsync(`INSERT OR IGNORE INTO cs_sessions(session_id, status, online, user_agent, created_at, last_active_at) VALUES(?, 'active', 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [sessionId, ua]); await db.runAsync(`UPDATE cs_sessions SET last_active_at=CURRENT_TIMESTAMP WHERE session_id=? AND status!='ended'`, [sessionId]); await db.runAsync(`INSERT INTO cs_messages(session_id, sender, content, time) VALUES(?, 'user', ?, CURRENT_TIMESTAMP)`, [sessionId, message]); const rows = await db.allAsync(`SELECT session_id, username, email, status, online, last_active_at FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`); broadcastAdmin({ type: 'sessions', sessions: rows }); } catch (_) { } })();
  res.json(resp);
});

app.use((req, res) => { console.error(color('ERROR', `[${ts()}] 未定义路由: ${req.originalUrl}`)); pushLog('error', '未定义路由: ' + req.originalUrl); res.status(404).send('404 页面未找到'); });
app.use((err, req, res, next) => { console.error(color('ERROR', `[${ts()}] 全局错误: ${err.stack}`)); pushLog('error', err.message); res.status(500).send('500 服务器内部错误'); });

let WebSocketServer; try { WebSocketServer = require('ws').WebSocketServer; } catch (e) { WebSocketServer = null; }
const sessions = new Map();
let wss;
let wssAdmin;
let adminClients = new Set();
let activeSessionId = null;
const WS_PING_INTERVAL_MS = 30000;
const CS_IDLE_TIMEOUT_MS = Number(process.env.CS_IDLE_TIMEOUT_MS || 1800000);
function setActiveSession(sid) { activeSessionId = sid; console.log(color('INFO', `[${ts()}] 当前会话已设置为: ${sid}，直接输入消息即可回复该会话。`)); }
function replyActive(message) {
  if (!activeSessionId) {
    console.error(color('ERROR', `[${ts()}] 未设置当前会话。使用 'use <sessionId>' 或 'reply <sessionId> <message>'。`));
    return;
  }
  const ws = sessions.get(activeSessionId);
  if (ws && ws.readyState === 1) {
    try {
      ws.send(JSON.stringify({ type: 'reply', sessionId: activeSessionId, message, timestamp: ts() }));
      console.log(color('REPLY', `[${ts()}] 已回复 会话:${activeSessionId} 消息:${message}`));
      broadcastAdmin({ type: 'reply', sessionId: activeSessionId, message, timestamp: ts() });
    } catch (e) {
      console.error(color('ERROR', `[${ts()}] 回复失败: ${e.message}`));
    }
  } else {
    console.error(color('ERROR', `[${ts()}] 会话不可用或未连接: ${activeSessionId}`));
  }
}
function setupWebSockets() {
  if (!WebSocketServer) return;
  wss = new WebSocketServer({ noServer: true });
  wss.on('error', (err) => { try { pushLog('error', err.message); } catch (_) { } });
  wss.on('connection', async (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || 'unknown';
    try { console.log(color('INFO', `[${ts()}] WS连接建立 IP:${ip} UA:${ua}`)); } catch (_) { }
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.connectedAt = ts();
    ws.on('message', async (data) => {
      let msg; try { msg = JSON.parse(typeof data === 'string' ? data : String(data instanceof Buffer ? data.toString() : data)); } catch (e) { msg = { type: 'raw', data: (data instanceof Buffer ? data.toString() : String(data)) }; }
      const sid = msg.sessionId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      ws.sessionId = sid;
      if (!sessions.has(sid)) sessions.set(sid, ws);
      const cat = classify(msg.message || ''); csStats[cat]++;
      try {
        await db.runAsync(`INSERT OR IGNORE INTO cs_sessions(session_id, user_id, username, email, status, online, user_agent, created_at, last_active_at) VALUES(?,?,?,?, 'active', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [sid, (msg.user && (msg.user.userId || msg.user.user_id)) || null, (msg.user && msg.user.username) || null, (msg.user && msg.user.email) || null, ua]);
        await db.runAsync(`UPDATE cs_sessions SET online=1, user_id=COALESCE(?, user_id), username=COALESCE(?, username), email=COALESCE(?, email), user_agent=COALESCE(?, user_agent), last_active_at=CURRENT_TIMESTAMP WHERE session_id=? AND status!='ended'`, [(msg.user && (msg.user.userId || msg.user.user_id)) || null, (msg.user && msg.user.username) || null, (msg.user && msg.user.email) || null, ua, sid]);
      } catch (_) { }
      if (msg.type === 'init') {
        try { const row = await db.getAsync(`SELECT status FROM cs_sessions WHERE session_id=?`, [sid]); if (row && row.status === 'ended') { try { ws.send(JSON.stringify({ type: 'session_ended', sessionId: sid, timestamp: ts() })); } catch (_) {} return; } } catch (_) {}
        ws.user = msg.user || {};
        console.log(color('INFO', `[${ts()}] 会话建立 WS 会话:${sid} 用户:${JSON.stringify(ws.user)}`));
        try { ws.send(JSON.stringify({ type: 'ack', sessionId: sid, timestamp: ts() })); } catch (_) { }
        if (!sessionHistory.has(sid)) sessionHistory.set(sid, []);
        sessionHistory.get(sid).push({ sender: 'system', content: 'session_started', time: ts(), user: ws.user });
        try { await db.runAsync(`INSERT INTO cs_messages(session_id, sender, content, time) VALUES(?, 'system', 'session_started', CURRENT_TIMESTAMP)`, [sid]); } catch (_) { }
        try { const rows = await db.allAsync(`SELECT session_id, username, email, status, online, last_active_at FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`); broadcastAdmin({ type: 'sessions', sessions: rows }); } catch (_) { }
        return;
      }
      if (msg.type === 'question') {
        try { const row = await db.getAsync(`SELECT status FROM cs_sessions WHERE session_id=?`, [sid]); if (row && row.status === 'ended') { return; } } catch (_) {}
        console.log(color('QUESTION', `[${ts()}] 客服询问[WS] 会话:${sid} 分类:${cat}\nIP:${ip} UA:${ua}\n消息:${msg.message}`));
        try { ws.send(JSON.stringify({ type: 'ack', sessionId: sid, timestamp: ts() })); } catch (_) { }

        if (!sessionHistory.has(sid)) sessionHistory.set(sid, []);
        sessionHistory.get(sid).push({ sender: 'user', content: msg.message, time: ts(), user: ws.user });
        try { await db.runAsync(`INSERT INTO cs_messages(session_id, sender, content, time) VALUES(?, 'user', ?, CURRENT_TIMESTAMP)`, [sid, msg.message]); await db.runAsync(`UPDATE cs_sessions SET last_active_at=CURRENT_TIMESTAMP WHERE session_id=?`, [sid]); } catch (_) { }
        setActiveSession(sid);
        try { const rows = await db.allAsync(`SELECT session_id, username, email, status, online, last_active_at FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`); broadcastAdmin({ type: 'sessions', sessions: rows }); } catch (_) { }
        broadcastAdmin({ type: 'message', sessionId: sid, message: msg.message, user: ws.user, timestamp: ts(), category: cat });
        return;
      }
      console.log(color('INFO', `[${ts()}] WS消息 会话:${sid} 类型:${msg.type}`));
    });
    ws.on('close', async (code, reason) => {
      let closedSid = ws.sessionId || null;
      if (!closedSid) {
        for (const [sid, s] of sessions.entries()) { if (s === ws) { closedSid = sid; sessions.delete(sid); break; } }
      } else {
        sessions.delete(closedSid);
      }
      console.log(color('INFO', `[${ts()}] WS连接关闭 IP:${ip} code:${code} reason:${reason}`));
      if (closedSid) {
        try { await db.runAsync(`UPDATE cs_sessions SET online=0, last_active_at=CURRENT_TIMESTAMP WHERE session_id=? AND status='active'`, [closedSid]); } catch (_) { }
        try { const rows = await db.allAsync(`SELECT session_id, username, email, status, online, last_active_at FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`); broadcastAdmin({ type: 'sessions', sessions: rows }); } catch (_) { }
      }
    });
    ws.on('error', (err) => {
      console.error(color('ERROR', `[${ts()}] WS错误: ${err.message}`));
      pushLog('error', err.message);
    });
  });
  const interval = setInterval(() => {
    try {
      for (const ws of wss.clients) {
        if (!ws) continue;
        if (ws.isAlive === false) { try { ws.terminate(); } catch (_) { }; continue; }
        ws.isAlive = false;
        try { ws.ping(); } catch (_) { }
      }
    } catch (_) { }
  }, WS_PING_INTERVAL_MS);
  wss.on('close', () => { try { clearInterval(interval); } catch (_) { } });
  wssAdmin = new WebSocketServer({ noServer: true });
  wssAdmin.on('error', (err) => { try { pushLog('error', err.message); } catch (_) { } });
  wssAdmin.on('connection', (ws) => {
    ws.isAdmin = true;
    adminClients.add(ws);
    (async () => { try { const rows = await db.allAsync(`SELECT session_id, username, email, status, online, last_active_at FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`); ws.send(JSON.stringify({ type: 'sessions', sessions: rows })); } catch (_) { } })();
    try { ws.send(JSON.stringify({ type: 'log_init', logs: logs.slice(-100) })); } catch (_) { }
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'reply' && msg.sessionId && msg.message) {
          const clientWs = sessions.get(msg.sessionId);
          if (clientWs && clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({ type: 'reply', sessionId: msg.sessionId, message: msg.message, timestamp: ts() }));
            console.log(color('REPLY', `[${ts()}] Admin回复 会话:${msg.sessionId} 消息:${msg.message}`));
            broadcastAdmin({ type: 'reply', sessionId: msg.sessionId, message: msg.message, timestamp: ts() });
          }
          (async () => { try { await db.runAsync(`INSERT INTO cs_messages(session_id, sender, content, time) VALUES(?, 'admin', ?, CURRENT_TIMESTAMP)`, [msg.sessionId, msg.message]); await db.runAsync(`UPDATE cs_sessions SET last_active_at=CURRENT_TIMESTAMP WHERE session_id=?`, [msg.sessionId]); } catch (_) { } })();
        }
        if (msg.type === 'end_session' && msg.sessionId) {
          if (!ws.isAdmin) return; 
          (async () => {
            try {
              {
                let ok=false; for (let i=0;i<3;i++){ try { await db.runAsync(`UPDATE cs_sessions SET status='ended', online=0, ended_at=CURRENT_TIMESTAMP WHERE session_id=?`, [msg.sessionId]); ok=true; break; } catch(e){ await new Promise(r=>setTimeout(r, 120*(i+1))); } }
                if (!ok) throw new Error('db_update_failed');
              }
              try { await db.runAsync(`INSERT INTO cs_messages(session_id, sender, content, time) VALUES(?, 'system', 'session_ended', CURRENT_TIMESTAMP)`, [msg.sessionId]); } catch (_) {}
              try { await db.runAsync(`CREATE TABLE IF NOT EXISTS cs_sessions_archive (session_id TEXT PRIMARY KEY, username TEXT, email TEXT, status TEXT, online INTEGER, user_agent TEXT, created_at TEXT, last_active_at TEXT, ended_at TEXT)`); } catch (_) {}
              try {
                const row = await db.getAsync(`SELECT session_id, username, email, status, online, user_agent, created_at, last_active_at, ended_at FROM cs_sessions WHERE session_id=?`, [msg.sessionId]);
                if (row) {
                  await db.runAsync(`INSERT OR REPLACE INTO cs_sessions_archive(session_id, username, email, status, online, user_agent, created_at, last_active_at, ended_at) VALUES(?,?,?,?,?,?,?,?,?)`, [row.session_id, row.username, row.email, 'ended', 0, row.user_agent, row.created_at, row.last_active_at, row.ended_at || new Date().toISOString()]);
                }
              } catch (_) {}
              const clientWs = sessions.get(msg.sessionId);
              if (clientWs && clientWs.readyState === 1) {
                clientWs.send(JSON.stringify({ type: 'session_ended', sessionId: msg.sessionId, timestamp: ts() }));
              }
              broadcastAdmin({ type: 'session_ended', sessionId: msg.sessionId, endedAt: ts() });
              const rows = await db.allAsync(`SELECT session_id, username, email, status, online, last_active_at FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`);
              broadcastAdmin({ type: 'sessions', sessions: rows });
              pushLog('info', `Admin ended session ${msg.sessionId}`);
            } catch (e) { pushLog('error', `end_session_failed: ${e && e.message ? e.message : e}`); broadcastAdmin({ type: 'app_error', data: 'end_session_failed' }); }
          })();
        }
      } catch (e) { console.error('Admin message error:', e); }
    });
    ws.on('close', () => { adminClients.delete(ws); });
    ws.on('error', () => { adminClients.delete(ws); });
  });
  server.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url, (TLS_ENABLED ? 'https://' : 'http://') + req.headers.host);
      if (url.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => { wss.emit('connection', ws, req); });
        return;
      }
      if (url.pathname === '/admin/ws') {
        const cookieHeader = req.headers.cookie || '';
        const authHeader = req.headers.authorization || '';
        const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const tokenFromCookie = (cookieHeader.match(/(?:^|;\s*)(?:token|jwt)=([^;]+)/) || [])[1] || null;
        const token = tokenFromHeader || tokenFromCookie;
        let payload = null;
        if (token) {
          try { payload = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your_secret_key'); } catch (_) { payload = null; }
        }
        if (!payload || !isAdmin(payload)) { try { socket.destroy(); } catch (_) {} return; }
        wssAdmin.handleUpgrade(req, socket, head, (ws) => { ws.isAdmin = true; wssAdmin.emit('connection', ws, req); });
        return;
      }
      socket.destroy();
    } catch (_) {
      try { socket.destroy(); } catch (__) { }
    }
  });
}

function broadcastAdmin(msg) {
  const data = JSON.stringify(msg);
  for (const ws of Array.from(adminClients)) {
    try { if (ws.readyState === 1) ws.send(data); } catch (_) { }
  }
}

const logs = [];
function pushLog(level, message, meta) {
  const item = { level, message, meta: meta || {}, timestamp: ts() };
  logs.push(item);
  if (logs.length > 1000) logs.shift();
  broadcastAdmin({ type: 'log', log: item });
}

// 捕获并广播服务器错误到前端（在 WebSocket 初始化之后）
(() => {
  const origError = console.error.bind(console);
  console.error = function (...args) {
    try { origError(...args); } finally {
      try {
        const msg = args.map(a => {
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === 'string') return a;
          try { return JSON.stringify(a); } catch (_) { return String(a); }
        }).join(' ');
        const clean = msg.replace(/\x1b\[[0-9;]*m/g, '');
        broadcastAdmin({ type: 'error_log', data: clean });
      } catch (_) { }
    }
  };
})();

process.stdin.setEncoding('utf8');
process.stdin.on('data', (line) => { const input = line.trim(); if (!input) return; if (input === 'help') { console.log(color('INFO', '命令: reply <sessionId> <message> | use <sessionId> | who | stats | list | help')); return; } if (input === 'stats') { console.log(color('INFO', `问题分类统计: ${JSON.stringify(csStats)}`)); return; } if (input === 'list') { console.log(color('INFO', `在线会话: ${JSON.stringify(Array.from(sessions.keys()))}`)); return; } if (input === 'who') { console.log(color('INFO', `当前会话: ${activeSessionId || '未设置'}`)); return; } const u = input.match(/^use\s+(\S+)$/); if (u) { setActiveSession(u[1]); return; } const m = input.match(/^reply\s+(\S+)\s+([\s\S]+)$/); if (m) { const sid = m[1]; const msg = m[2]; const ws = sessions.get(sid); if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify({ type: 'reply', sessionId: sid, message: msg, timestamp: ts() })); console.log(color('REPLY', `[${ts()}] 已回复 会话:${sid} 消息:${msg}`)); } catch (e) { console.error(color('ERROR', `[${ts()}] 回复失败: ${e.message}`)); } } else { console.error(color('ERROR', `[${ts()}] 会话不可用或未连接: ${sid}`)); } return; } replyActive(input); });

let PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const WIFI_IFACE = process.env.WIFI_IFACE || '';
const TLS_ENABLED = String(process.env.TLS_ENABLED || '0') === '1';
const TLS_KEY_PATH = process.env.TLS_KEY_PATH || '';
const TLS_CERT_PATH = process.env.TLS_CERT_PATH || '';
function wifiAddrs() { const nets = os.networkInterfaces(); const res = []; const patterns = ['wi-fi', 'wifi', 'wlan', 'wireless']; for (const name of Object.keys(nets)) { const lname = name.toLowerCase(); const match = WIFI_IFACE ? (name === WIFI_IFACE) : patterns.some(p => lname.includes(p)); if (!match) continue; for (const ni of nets[name] || []) { if (ni.family === 'IPv4' && !ni.internal) { res.push(ni.address); } } } return res; }
async function isPortFree(port, host) { return await new Promise((resolve) => { const s = net.createServer(); s.once('error', () => resolve(false)); s.once('listening', () => { s.close(() => resolve(true)); }); s.listen(port, host); }); }
async function findFreePort(start, host) { for (let p = start; p < start + 20; p++) { if (await isPortFree(p, host)) return p; } return null; }
function startServer() {
  if (TLS_ENABLED) {
    try {
      const key = fs.readFileSync(TLS_KEY_PATH);
      const cert = fs.readFileSync(TLS_CERT_PATH);
      server = https.createServer({ key, cert }, app);
    } catch (e) {
      server = http.createServer(app);
      pushLog('error', 'TLS加载失败: ' + e.message);
    }
  } else {
    server = http.createServer(app);
  }

  setupWebSockets();
  const onListening = () => {
    const urls = wifiAddrs().map(ip => `${TLS_ENABLED ? 'https' : 'http'}://${ip}:${PORT}`).join(', ');
    console.log(color('INFO', `服务器运行在 ${TLS_ENABLED ? 'https' : 'http'}://localhost:${PORT}`));
    if (urls) console.log(color('INFO', `无线局域网访问: ${urls}`));
    console.log(color('INFO', '后台数据分析系统已启动'));
    console.log(color('INFO', '- 数据面板: ' + (TLS_ENABLED ? 'https' : 'http') + '://localhost:' + PORT + '/analytics/dashboard'));
    console.log(color('INFO', '- 客服系统: ' + (TLS_ENABLED ? 'https' : 'http') + '://localhost:' + PORT + '/customer-service.html'));
    if (!wss) { console.log(color('ERROR', '未安装 ws 依赖，WebSocket 功能不可用。请安装后重启。')); } else { console.log(color('INFO', 'WebSocket 客服模块已启用，命令: help')); }
  };
  const attempt = async (port) => {
    server.once('error', async (err) => {
      if (err && err.code === 'EADDRINUSE') {
        const next = await findFreePort(port + 1, HOST);
        if (next) {
          console.log(color('ERROR', `端口已被占用: ${port}，切换到: ${next}`));
          PORT = next;
          attempt(PORT);
          return;
        }
        pushLog('error', '端口被占用且未找到可用端口');
        process.exit(1);
        return;
      }
      pushLog('error', '服务器错误: ' + err.message);
      process.exit(1);
    });
    server.listen(port, HOST, onListening);
  };
  attempt(PORT);
}

function listClients() {
  const res = [];
  for (const [sid, ws] of sessions.entries()) {
    try {
      res.push({
        sessionId: sid,
        user: ws.user || { username: 'Guest' },
        connectedAt: ws.connectedAt || null
      });
    } catch (_) { }
  }
  return res;
}

function sampleCpu() {
  const cpus = os.cpus();
  let user = 0, sys = 0, idle = 0, nice = 0, irq = 0;
  for (const c of cpus) { user += c.times.user; sys += c.times.sys; idle += c.times.idle; nice += c.times.nice; irq += c.times.irq; }
  const total = user + sys + idle + nice + irq;
  const busy = total - idle;
  const cpu = total > 0 ? Math.round((busy / total) * 100) : 0;
  return cpu;
}

setInterval(() => {
  const metrics = {
    cpu: sampleCpu(),
    memory: { total: os.totalmem(), free: os.freemem(), rss: process.memoryUsage().rss },
    uptime: process.uptime(),
    timestamp: ts()
  };
  broadcastAdmin({ type: 'metrics', metrics });
}, 3000);

app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), memory: process.memoryUsage(), timestamp: ts() });
});

startServer();
app.get('/admin/api/clients', requireAdminJwt, async (req, res) => {
  try {
    const rows = await db.allAsync(`SELECT session_id AS sessionId, username, email, status, online, last_active_at AS lastActive FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`);
    res.json({ ok: true, clients: rows });
  } catch (e) { res.json({ ok: false, error: 'db_error' }); }
});
app.get('/admin/api/logs', requireAdminJwt, (req, res) => {
  res.json({ ok: true, logs });
});

app.get('/api/customer-service/history/:sessionId', async (req, res) => {
  const sid = req.params.sessionId;
  try {
    const rows = await db.allAsync(`SELECT sender, content, time FROM cs_messages WHERE session_id=? ORDER BY time ASC`, [sid]);
    res.json({ ok: true, history: rows });
  } catch (e) { res.status(500).json({ ok: false }); }
});


setInterval(async () => {
  try {
    const cutoff = Date.now() - CS_IDLE_TIMEOUT_MS;
    const isoCut = new Date(cutoff).toISOString();
    const idleSessions = await db.allAsync(`SELECT session_id FROM cs_sessions WHERE status='active' AND online=0 AND last_active_at IS NOT NULL AND last_active_at < ?`, [isoCut]);
    for (const s of idleSessions) {
      await db.runAsync(`UPDATE cs_sessions SET status='ended', ended_at=CURRENT_TIMESTAMP WHERE session_id=?`, [s.session_id]);
      broadcastAdmin({ type: 'session_ended', sessionId: s.session_id, endedAt: ts() });
    }
    const rows = await db.allAsync(`SELECT session_id, username, email, status, online, last_active_at FROM cs_sessions WHERE status='active' ORDER BY last_active_at DESC`);
    broadcastAdmin({ type: 'sessions', sessions: rows });
  } catch (_) { }
}, 30000);
