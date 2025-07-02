// routes/userRoutes.js

const express = require('express');
const router = express.Router();

// 示例用户信息获取路由
router.get('/profile', (req, res) => {
  res.send("这是用户的个人信息");
});

module.exports = router;
