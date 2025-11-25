const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const session = require('express-session');
require('dotenv').config();
const morgan = require('morgan');
const methodOverride = require('method-override');
const db = require('./config/database');

const app = express();
const server = http.createServer(app);

const COLORS = { reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', bold: '\x1b[1m' };
function color(level, text){ const map = { INFO: COLORS.green, QUESTION: COLORS.cyan, REPLY: COLORS.yellow, ERROR: COLORS.red }; return `${map[level] || ''}${text}${COLORS.reset}`; }
function ts(){ return new Date().toISOString(); }

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
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
app.get('/homepage', (req, res) => { console.log(color('INFO', `[${ts()}] 访问主页`)); res.sendFile(path.join(__dirname, 'public', 'homepage.html')); });

const csStats = { 支付:0, 物流:0, 商品:0, 账户:0, 其他:0 };
function classify(text){ const t = (text||'').toLowerCase(); if (/[付|pay|支付|退款]/.test(text)) return '支付'; if (/[物流|快递|shipping|delivery]/.test(text)) return '物流'; if (/[货|商品|质量|product]/.test(text)) return '商品'; if (/[账|登录|注册|密码|account|login]/.test(text)) return '账户'; return '其他'; }
app.post('/api/customer-service/inquiry', (req, res) => {
  const { sessionId, message } = req.body || {};
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || 'unknown';
  const cat = classify(message); csStats[cat]++;
  console.log(color('QUESTION', `[${ts()}] 客服询问[REST] 会话:${sessionId} 分类:${cat}\nIP:${ip} UA:${ua}\n消息:${message}`));
  const resp = { ok:true, sessionId, receivedAt: ts(), echo: message, category: cat, meta: { ip, ua, reqTime: new Date().toISOString() } };
  const ws = sessions.get(sessionId);
  if (ws && ws.readyState === 1){ try { ws.send(JSON.stringify({ type:'ack', sessionId, timestamp: ts() })); } catch(_){} }
  if (ws){ setActiveSession(sessionId); }
  res.json(resp);
});

app.use((req, res) => { console.error(color('ERROR', `[${ts()}] 未定义路由: ${req.originalUrl}`)); res.status(404).send('404 页面未找到'); });
app.use((err, req, res, next) => { console.error(color('ERROR', `[${ts()}] 全局错误: ${err.stack}`)); res.status(500).send('500 服务器内部错误'); });

let WebSocketServer; try { WebSocketServer = require('ws').WebSocketServer; } catch (e) { WebSocketServer = null; }
const sessions = new Map();
const wss = WebSocketServer ? new WebSocketServer({ server, path: '/ws' }) : null;
let activeSessionId = null;
function setActiveSession(sid){ activeSessionId = sid; console.log(color('INFO', `[${ts()}] 当前会话已设置为: ${sid}，直接输入消息即可回复该会话。`)); }
function replyActive(message){ if (!activeSessionId){ console.error(color('ERROR', `[${ts()}] 未设置当前会话。使用 'use <sessionId>' 或 'reply <sessionId> <message>'。`)); return; } const ws = sessions.get(activeSessionId); if (ws && ws.readyState === 1){ try { ws.send(JSON.stringify({ type:'reply', sessionId: activeSessionId, message, timestamp: ts() })); console.log(color('REPLY', `[${ts()}] 已回复 会话:${activeSessionId} 消息:${message}`)); } catch(e){ console.error(color('ERROR', `[${ts()}] 回复失败: ${e.message}`)); } } else { console.error(color('ERROR', `[${ts()}] 会话不可用或未连接: ${activeSessionId}`)); } }
if (wss){ wss.on('connection', (ws, req) => { const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; const ua = req.headers['user-agent'] || 'unknown'; ws.on('message', (data) => { let msg; try { msg = JSON.parse(data); } catch(e){ msg = { type:'raw', data:String(data) }; } const sid = msg.sessionId || `${Date.now()}-${Math.random().toString(16).slice(2)}`; if (!sessions.has(sid)) sessions.set(sid, ws); const cat = classify(msg.message || ''); csStats[cat]++; if (msg.type === 'init'){ console.log(color('INFO', `[${ts()}] 会话建立 WS 会话:${sid} IP:${ip} UA:${ua}`)); try { ws.send(JSON.stringify({ type:'ack', sessionId:sid, timestamp: ts() })); } catch(_){ } return; } if (msg.type === 'question'){ console.log(color('QUESTION', `[${ts()}] 客服询问[WS] 会话:${sid} 分类:${cat}\nIP:${ip} UA:${ua}\n消息:${msg.message}`)); try { ws.send(JSON.stringify({ type:'ack', sessionId:sid, timestamp: ts() })); } catch(_){ } setActiveSession(sid); return; } console.log(color('INFO', `[${ts()}] WS消息 会话:${sid} 类型:${msg.type}`)); }); ws.on('close', () => { for (const [sid, s] of sessions.entries()){ if (s === ws) sessions.delete(sid); } console.log(color('INFO', `[${ts()}] WS连接关闭 IP:${ip}`)); }); ws.on('error', (err) => { console.error(color('ERROR', `[${ts()}] WS错误: ${err.message}`)); }); }); }

process.stdin.setEncoding('utf8');
process.stdin.on('data', (line) => { const input = line.trim(); if (!input) return; if (input === 'help'){ console.log(color('INFO', '命令: reply <sessionId> <message> | use <sessionId> | who | stats | list | help')); return; } if (input === 'stats'){ console.log(color('INFO', `问题分类统计: ${JSON.stringify(csStats)}`)); return; } if (input === 'list'){ console.log(color('INFO', `在线会话: ${JSON.stringify(Array.from(sessions.keys()))}`)); return; } if (input === 'who'){ console.log(color('INFO', `当前会话: ${activeSessionId || '未设置'}`)); return; } const u = input.match(/^use\s+(\S+)$/); if (u){ setActiveSession(u[1]); return; } const m = input.match(/^reply\s+(\S+)\s+([\s\S]+)$/); if (m){ const sid = m[1]; const msg = m[2]; const ws = sessions.get(sid); if (ws && ws.readyState === 1){ try { ws.send(JSON.stringify({ type:'reply', sessionId:sid, message: msg, timestamp: ts() })); console.log(color('REPLY', `[${ts()}] 已回复 会话:${sid} 消息:${msg}`)); } catch(e){ console.error(color('ERROR', `[${ts()}] 回复失败: ${e.message}`)); } } else { console.error(color('ERROR', `[${ts()}] 会话不可用或未连接: ${sid}`)); } return; } replyActive(input); });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const WIFI_IFACE = process.env.WIFI_IFACE || '';
function wifiAddrs(){ const nets = os.networkInterfaces(); const res=[]; const patterns=['wi-fi','wifi','wlan','wireless']; for (const name of Object.keys(nets)){ const lname=name.toLowerCase(); const match = WIFI_IFACE ? (name===WIFI_IFACE) : patterns.some(p=>lname.includes(p)); if(!match) continue; for (const ni of nets[name]||[]){ if (ni.family==='IPv4' && !ni.internal){ res.push(ni.address); } } } return res; }
server.listen(PORT, HOST, () => { const urls = wifiAddrs().map(ip => `http://${ip}:${PORT}`).join(', '); console.log(color('INFO', `服务器运行在 http://localhost:${PORT}`)); if (urls) console.log(color('INFO', `无线局域网访问: ${urls}`)); console.log(color('INFO', '后台数据分析系统已启动')); console.log(color('INFO', '- 数据面板: http://localhost:' + PORT + '/analytics/dashboard')); console.log(color('INFO', '- API文档: http://localhost:' + PORT + '/analytics/api/')); if (!wss){ console.log(color('ERROR', '未安装 ws 依赖，WebSocket 功能不可用。请安装后重启。')); } else { console.log(color('INFO', 'WebSocket 客服模块已启用，命令: help')); } });