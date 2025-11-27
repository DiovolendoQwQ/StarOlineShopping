// controllers/orderController.js
const db = require('../config/database');

// 订单控制器
const orderController = {
  // 创建订单
  createOrder: async (req, res) => {
    try {
      const userId = req.session.userId;
      const { items, totalAmount, shippingAddress } = req.body;
      
      if (!userId || !items || !items.length) {
        return res.status(400).json({
          success: false,
          message: '创建订单失败：缺少必要信息'
        });
      }
      
      // 生成订单ID
      const orderId = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      
      // 创建订单记录
      await db.runAsync(
        `INSERT INTO orders (id, user_id, total_amount, shipping_address, status, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [orderId, userId, totalAmount, JSON.stringify(shippingAddress), 'pending']
      );
      
      // 添加订单项
      for (const item of items) {
        await db.runAsync(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES (?, ?, ?, ?)`,
          [orderId, item.productId, item.quantity, item.price]
        );
      }
      
      // 设置订单信息到请求对象，供后续中间件使用
      req.orderData = {
        orderId,
        items,
        totalAmount
      };
      
      res.json({
        success: true,
        message: '订单创建成功',
        data: {
          orderId,
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('创建订单失败:', error);
      res.status(500).json({
        success: false,
        message: '创建订单失败',
        error: error.message
      });
    }
  },
  
  // 获取订单详情
  getOrderDetails: async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.session.userId;
      
      // 获取订单基本信息
      const order = await db.getAsync(
        `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在或无权访问'
        });
      }
      
      // 获取订单项
      const orderItems = await db.allAsync(
        `SELECT oi.*, p.name, p.image 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      
      res.json({
        success: true,
        data: {
          ...order,
          items: orderItems,
          shipping_address: JSON.parse(order.shipping_address || '{}')
        }
      });
    } catch (error) {
      console.error('获取订单详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取订单详情失败',
        error: error.message
      });
    }
  },
  getOrderDetailPage: async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.session.userId;
      const order = await db.getAsync(`SELECT * FROM orders WHERE id = ? AND user_id = ?`, [orderId, userId]);
      if (!order) {
        return res.status(404).send('订单不存在或无权访问');
      }
      const orderItems = await db.allAsync(
        `SELECT oi.*, p.name, p.image 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      res.render('orderDetail', {
        order: {
          id: order.id,
          status: order.status,
          total_amount: order.total_amount,
          created_at: order.created_at
        },
        items: orderItems
      });
    } catch (error) {
      res.status(500).send('获取订单页面失败');
    }
  },
  
  // 获取用户所有订单
  getUserOrders: async (req, res) => {
    try {
      const userId = req.session.userId;
      
      const orders = await db.allAsync(
        `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      );
      
      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('获取用户订单列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户订单列表失败',
        error: error.message
      });
    }
  },
  
  // 更新订单状态
  updateOrderStatus: async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      const userId = req.session.userId;
      
      // 验证订单所有权
      const order = await db.getAsync(
        `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在或无权访问'
        });
      }
      
      // 更新订单状态
      await db.runAsync(
        `UPDATE orders SET status = ? WHERE id = ?`,
        [status, orderId]
      );
      
      res.json({
        success: true,
        message: '订单状态已更新',
        data: {
          orderId,
          status
        }
      });
    } catch (error) {
      console.error('更新订单状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新订单状态失败',
        error: error.message
      });
    }
  },
  
  // 取消订单
  cancelOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.session.userId;
      
      // 验证订单所有权
      const order = await db.getAsync(
        `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在或无权访问'
        });
      }
      
      // 检查订单状态是否可取消
      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '只有待处理的订单可以取消'
        });
      }
      
      // 更新订单状态为已取消
      await db.runAsync(
        `UPDATE orders SET status = 'cancelled' WHERE id = ?`,
        [orderId]
      );
      
      res.json({
        success: true,
        message: '订单已取消',
        data: {
          orderId,
          status: 'cancelled'
        }
      });
    } catch (error) {
      console.error('取消订单失败:', error);
      res.status(500).json({
        success: false,
        message: '取消订单失败',
        error: error.message
      });
    }
  },
  
  // 结账页面
  getCheckoutPage: async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // 获取用户购物车信息
      const cart = await db.getAsync(
        `SELECT * FROM carts WHERE user_id = ?`,
        [userId]
      );
      
      if (!cart) {
        return res.status(404).send('购物车为空，无法结账');
      }
      
      // 获取购物车商品
      const cartItems = await db.allAsync(
        `SELECT ci.*, p.name, p.price, p.image 
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = ?`,
        [cart.id]
      );
      
      if (!cartItems.length) {
        return res.status(404).send('购物车为空，无法结账');
      }
      
      // 渲染结账页面
      res.render('checkout', {
        cart,
        cartItems,
        totalAmount: cart.total_price
      });
    } catch (error) {
      console.error('获取结账页面失败:', error);
      res.status(500).send('获取结账页面失败');
    }
  }
  ,
  getSimpleCheckoutPage: async (req, res) => {
    try {
      const userId = req.session.userId;
      const cart = await db.getAsync(`SELECT * FROM carts WHERE user_id = ?`, [userId]);
      if (!cart) return res.status(404).send('购物车为空');
      const cartItems = await db.allAsync(
        `SELECT ci.*, p.name, p.price, p.image 
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = ?
         ORDER BY ci.id DESC`,
        [cart.id]
      );
      const items = (cartItems || []).slice(0, 2);
      const totalAmount = items.reduce((t, it) => t + it.price * it.quantity, 0);
      res.render('simpleCheckout', { items, totalAmount });
    } catch (e) {
      res.status(500).send('获取简单结算页面失败');
    }
  },
  getSimpleCheckoutSuccess: async (req, res) => {
    try {
      res.render('simpleSuccess');
    } catch (e) {
      res.status(500).send('获取支付成功页面失败');
    }
  }
  
};

module.exports = orderController;
