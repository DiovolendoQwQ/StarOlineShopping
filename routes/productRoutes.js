//productRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 获取商品列表（支持分页与搜索）
router.get('/all', async (req, res) => {
  const { page = 1, keyword = '' } = req.query;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    // 获取商品总数
    const total = await db.getAsync(
      "SELECT COUNT(*) AS count FROM products WHERE name LIKE ?",
      [`%${keyword}%`]
    );
    const totalPages = Math.ceil(total.count / limit);

    // 获取当前页商品
    const products = await db.allAsync(
      "SELECT * FROM products WHERE name LIKE ? LIMIT ? OFFSET ?",
      [`%${keyword}%`, limit, offset]
    );

    res.render('productList', {
      products,
      page: parseInt(page),
      keyword,
      totalPages,
    });
  } catch (err) {
    console.error("获取商品失败:", err);
    res.status(500).send("获取商品失败");
  }
});

// 获取商品详情
router.get('/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await db.getAsync("SELECT * FROM products WHERE id = ?", [productId]);
    if (!product) {
      return res.status(404).send('商品未找到');
    }
    res.render('detail', { product }); // 渲染详情页模板
  } catch (err) {
    console.error("获取商品详情失败:", err);
    res.status(500).send("服务器错误");
  }
});

module.exports = router;
