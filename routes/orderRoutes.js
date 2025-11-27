// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const isAuthenticated = require('../middleware/authMiddleware');
const behaviorTracker = require('../middleware/behaviorTracker');

// 结账页面
router.get('/checkout', isAuthenticated, behaviorTracker.trackPageView('checkout'), orderController.getCheckoutPage);
router.get('/simple-checkout', isAuthenticated, behaviorTracker.trackPageView('simple_checkout'), orderController.getSimpleCheckoutPage);
router.get('/simple-success', isAuthenticated, behaviorTracker.trackPageView('simple_success'), orderController.getSimpleCheckoutSuccess);

// 创建订单
router.post('/create', isAuthenticated, behaviorTracker.trackPurchase(), orderController.createOrder);

// 获取用户所有订单
router.get('/', isAuthenticated, behaviorTracker.trackPageView('orders'), orderController.getUserOrders);

// 获取订单详情
router.get('/:id', isAuthenticated, behaviorTracker.track('view', 'order'), orderController.getOrderDetails);
router.get('/:id/view', isAuthenticated, behaviorTracker.track('view', 'order'), orderController.getOrderDetailPage);

// 更新订单状态
router.put('/:id/status', isAuthenticated, behaviorTracker.track('update', 'order'), orderController.updateOrderStatus);

// 取消订单
router.delete('/:id', isAuthenticated, behaviorTracker.track('cancel', 'order'), orderController.cancelOrder);

module.exports = router;
