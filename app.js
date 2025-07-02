//app.js
const express = require('express');
const path = require('path');
const session = require('express-session'); // 用于用户认证的会话管理
require('dotenv').config(); // 加载环境变量
const morgan = require('morgan'); // 添加请求日志
const methodOverride = require('method-override'); // 支持 PUT 和 DELETE 方法
const db = require('./config/database'); // SQLite 数据库实例
const app = express();

// 中间件
app.use(morgan('dev')); // 记录 HTTP 请求详细信息
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // 启用 method-override 中间件
app.use(express.static(path.join(__dirname, 'public'))); // 设置静态资源路径

// 会话中间件
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true
  })
);

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 引入路由
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes'); // 引入购物车路由
const productRoutes = require('./routes/productRoutes'); // 引入商品路由

// 注册路由
app.use('/auth', authRoutes);
app.use('/cart', cartRoutes); // 注册购物车路由
app.use('/product', productRoutes); // 注册商品路由

// 支持直接 POST /login 和 POST /register
app.post('/register', (req, res) => res.redirect(307, '/auth/register'));
app.post('/login', (req, res) => res.redirect(307, '/auth/login'));

// 定义根路径路由
app.get('/', (req, res) => {
  console.log("访问根路径，跳转到登录页面");
  res.sendFile(path.join(__dirname, 'public', 'login.html')); // 直接返回登录页面
});

// 定义首页路由
app.get('/homepage', (req, res) => {
  console.log("访问主页");
  res.sendFile(path.join(__dirname, 'public', 'homepage.html')); // 返回主页
});

// 处理未定义的路由
app.use((req, res) => {
  console.error("访问了未定义的路由:", req.originalUrl);
  res.status(404).send("404 页面未找到");
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error("全局错误:", err.stack);
  res.status(500).send("500 服务器内部错误");
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`服务器正在运行：http://localhost:${PORT}`));
