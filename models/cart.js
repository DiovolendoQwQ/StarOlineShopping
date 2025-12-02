const db = require('../config/database');

// 辅助函数：更新购物车总价
const updateCartTotal = async (cartId) => {
  try {
    // 计算总价
    const result = await db.getAsync(
      `SELECT COALESCE(SUM(ci.quantity * p.price), 0) as total 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    const totalPrice = result ? result.total : 0;

    // 更新 carts 表
    await db.runAsync(
      `UPDATE carts SET total_price = ? WHERE id = ?`,
      [totalPrice, cartId]
    );

    return totalPrice;
  } catch (error) {
    console.error('更新购物车总价失败:', error);
    throw error;
  }
};

// 购物车模型
const Cart = {
  // 获取用户的购物车（包含商品详情）
  getCart: async (userId) => {
    // 1. 获取购物车基本信息
    let cart = await db.getAsync(`SELECT id, total_price FROM carts WHERE user_id = ?`, [userId]);

    if (!cart) {
      return { items: [], totalPrice: 0 };
    }

    // 2. 获取购物车内的商品详情
    const items = await db.allAsync(
      `SELECT ci.id as item_id, ci.product_id, ci.quantity, 
              p.name, p.price, p.image, p.stock 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.cart_id = ?`,
      [cart.id]
    );

    return { items, totalPrice: cart.total_price };
  },

  // 添加商品到购物车
  addToCart: async (userId, productId, quantity = 1) => {
    // 1. 检查商品是否存在
    const product = await db.getAsync(`SELECT id, price FROM products WHERE id = ?`, [productId]);
    if (!product) {
      throw new Error('商品不存在');
    }

    // 2. 获取或创建购物车
    let cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    if (!cart) {
      await db.runAsync(`INSERT INTO carts (user_id, total_price) VALUES (?, 0)`, [userId]);
      cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    }

    // 3. 检查购物车中是否已有该商品
    const existingItem = await db.getAsync(
      `SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?`,
      [cart.id, productId]
    );

    if (existingItem) {
      // 更新数量
      await db.runAsync(
        `UPDATE cart_items SET quantity = quantity + ? WHERE id = ?`,
        [quantity, existingItem.id]
      );
    } else {
      // 插入新条目
      await db.runAsync(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`,
        [cart.id, productId, quantity]
      );
    }

    // 4. 更新总价
    await updateCartTotal(cart.id);
  },

  // 更新购物车商品数量（直接设置数量）
  updateItemQuantity: async (userId, productId, quantity) => {
    const cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    if (!cart) {
      throw new Error('购物车不存在');
    }

    if (quantity <= 0) {
      // 如果数量小于等于0，则删除
      await Cart.removeFromCart(userId, productId);
      return;
    }

    // 更新数量
    await db.runAsync(
      `UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?`,
      [quantity, cart.id, productId]
    );

    // 更新总价
    await updateCartTotal(cart.id);
  },

  // 从购物车移除商品
  removeFromCart: async (userId, productId) => {
    const cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    if (!cart) return;

    const result = await db.runAsync(
      `DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`,
      [cart.id, productId]
    );

    if (result.changes > 0) {
      await updateCartTotal(cart.id);
      return true;
    }
    return false;
  }
};

module.exports = Cart;
