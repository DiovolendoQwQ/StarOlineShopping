// config/server.js

const express = require('express');  // 引入 Express 模块
const app = express();  // 创建 Express 应用
const path = require('path');  // 引入 path 模块
require('dotenv').config();  // 加载环境变量

// 使用 JSON 请求体解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码的数据

// 设置静态文件目录，公开 public 目录下的文件
app.use(express.static(path.join(__dirname, '../public')));

// 默认首页路由 - 打开 public 文件夹中的 login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));  // 返回登录页面
});

// 引入数据库配置
const db = require('./database');  // 引入 SQLite 数据库实例

// 路由文件引入
const authRoutes = require('../routes/authRoutes');  // 登录/注册相关路由
const userRoutes = require('../routes/userRoutes');  // 用户相关路由
const productRoutes = require('../routes/productRoutes');  // 商品相关路由

// 路由配置
app.use('/', authRoutes);  // 用户认证路由（登录/注册）
app.use('/user', userRoutes);  // 用户数据路由
app.use('/product', productRoutes);  // 商品路由

module.exports = app;