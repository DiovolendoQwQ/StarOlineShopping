const db = require('../config/database');
const Cart = require('../models/cart');

// 获取购物车页面
exports.getCartPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect('/login.html');
    }

    // 使用 Model 获取数据
    const { items, totalPrice } = await Cart.getCart(userId);

    res.render('cart', { items: items || [], totalPrice: totalPrice || 0, });
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
      return res.status(401).send('Unauthenticated users cannot add items');
    }

    await Cart.addToCart(userId, productId, quantity);


    res.json({ success: true, message: '商品已添加到购物车' });

  } catch (error) {
    console.error('添加商品到购物车失败:', error);
    if (error.message === '商品不存在') {
      return res.status(404).send('商品不存在');
    }
    res.status(500).send('服务器错误');
  }
};
// 更新购物车商品数量
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.id;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'unauthenticated' });
    }


    await Cart.updateItemQuantity(userId, productId, quantity);


    const product = await db.getAsync(`SELECT price FROM products WHERE id = ?`, [productId]);

    res.json({
      success: true,
      price: product ? product.price : 0,
      quantity: quantity,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新购物车商品数量失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
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

    const success = await Cart.removeFromCart(userId, productId);

    if (!success) {
      return res.status(404).json({ error: '商品未找到或删除失败' });
    }

    return res.status(200).json({ message: '商品已删除' });
  } catch (error) {
    console.error('删除购物车商品失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
};
