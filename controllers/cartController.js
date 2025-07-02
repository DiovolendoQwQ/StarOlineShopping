const db = require('../config/database');

// 辅助函数：更新购物车总价
async function updateCartTotal(userId) {
  return db.runAsync(
    `UPDATE carts 
         SET total_price = (SELECT COALESCE(SUM(ci.quantity * p.price), 0) 
                           FROM cart_items ci 
                           JOIN products p ON ci.product_id = p.id 
                           WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = ?)) 
         WHERE user_id = ?`,
    [userId, userId]
  );
}

// 获取购物车页面
exports.getCartPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect('/auth/login');
    }

    const cartItems = await db.allAsync(
      `SELECT p.id as product_id, p.name, p.price, p.image, ci.quantity 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = ?)`,
      [userId]
    );

    const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

    res.render('cart', {
      items: cartItems || [],
      totalPrice: totalPrice || 0,
    });
  } catch (error) {
    console.error('获取购物车页面失败:', error);
    res.status(500).send('服务器错误');
  }
};

// 添加商品到购物车
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).send('未登录用户无法添加商品');
    }

    const product = await db.getAsync(`SELECT * FROM products WHERE id = ?`, [productId]);

    if (!product) {
      return res.status(404).send('商品不存在');
    }

    let cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);

    if (!cart) {
      await db.runAsync(`INSERT INTO carts (user_id, total_price) VALUES (?, ?)`, [userId, 0]);
      cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    }

    const cartItem = await db.getAsync(
      `SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?`,
      [cart.id, productId]
    );

    if (cartItem) {
      await db.runAsync(
        `UPDATE cart_items SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?`,
        [quantity, cart.id, productId]
      );
    } else {
      await db.runAsync(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`,
        [cart.id, productId, quantity]
      );
    }

    await updateCartTotal(userId);
    res.redirect('/cart');
  } catch (error) {
    console.error('添加商品到购物车失败:', error);
    res.status(500).send('服务器错误');
  }
};

// 更新购物车商品数量
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.id;
    const userId = req.session.userId;

    if (quantity === 0) {
      return exports.removeFromCart(req, res);
    }

    const cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);

    if (!cart) {
      return res.status(404).send('购物车不存在');
    }

    await db.runAsync(
      `UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?`,
      [quantity, cart.id, productId]
    );

    await updateCartTotal(userId);
    res.redirect('/cart');
  } catch (error) {
    console.error('更新购物车商品数量失败:', error);
    res.status(500).send('服务器错误');
  }
};

// 删除购物车商品
exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.userId;

    if (!userId || !productId) {
      return res.status(400).json({ error: '无效的请求' });
    }

    const cart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);

    if (!cart) {
      return res.status(404).json({ error: '购物车不存在' });
    }

    const result = await db.runAsync(
      `DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`,
      [cart.id, productId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '商品未找到' });
    }

    await updateCartTotal(userId);
    return res.status(200).json({ message: '商品已删除' });
  } catch (error) {
    console.error('删除购物车商品失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
};
