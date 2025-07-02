const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const isAuthenticated = require('../middleware/authMiddleware');

// 获取购物车页面
router.get('/', isAuthenticated, cartController.getCartPage);

// 添加商品到购物车
router.post('/add', isAuthenticated, cartController.addToCart);

// 更新购物车商品数量
router.put('/update/:id', isAuthenticated, cartController.updateCartItem);

// 删除购物车商品
router.delete('/remove/:id', isAuthenticated, cartController.removeFromCart);

module.exports = router;