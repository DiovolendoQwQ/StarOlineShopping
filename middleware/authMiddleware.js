// middleware/authMiddleware.js

module.exports = function isAuthenticated(req, res, next) {
  // 检查用户是否已登录
  if (req.session && req.session.userId) {
    return next(); // 用户已登录，继续处理请求
  }

  console.log('未登录用户尝试访问受限页面');
  res.redirect('/login.html');
};
