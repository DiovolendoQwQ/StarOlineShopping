const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const isAuthenticated = require('../middleware/authMiddleware');
const behaviorTracker = require('../middleware/behaviorTracker');

// 获取购物车页面
router.get('/', isAuthenticated, behaviorTracker.trackPageView('cart'), cartController.getCartPage);

// 添加商品到购物车
router.post('/add', isAuthenticated, behaviorTracker.trackCartAction('add_to_cart'), cartController.addToCart);

// 更新购物车商品数量
router.put('/update/:id', isAuthenticated, behaviorTracker.trackCartAction('update_cart'), cartController.updateCartItem);

// 删除购物车商品
router.delete('/remove/:id', isAuthenticated, behaviorTracker.trackCartAction('remove_from_cart'), cartController.removeFromCart);

// 跳转到结账页面（兼容从购物车发起的结算）
router.get('/checkout', isAuthenticated, (req, res) => {
  res.redirect('/order/checkout');
});

module.exports = router;