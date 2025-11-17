//productRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const searchService = require('../services/searchService');
const behaviorTracker = require('../middleware/behaviorTracker');

const DEFAULT_IMAGE_MAP = {
  201: 'Product83.png',
  202: 'Product84.png',
  203: 'Product85.png',
  204: 'Product86.png',
  205: 'Product87.png',
  206: 'Product88.png'
};

function toRootImagePath(image) {
  if (!image) return '/image/default.png';
  const str = String(image).trim();
  if (/^https?:\/\/|^data:/i.test(str)) return str;
  const cleaned = str.replace(/^\.?\/?image\/?/i, '').replace(/^\/+/, '');
  return `/image/${cleaned || 'default.png'}`;
}

// 获取商品列表（支持分页与模糊搜索）- 返回HTML页面
router.get('/all', async (req, res) => {
  const { page = 1, keyword = '' } = req.query;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    let products, totalCount;
    
    if (keyword.trim()) {
      // 使用模糊搜索服务
      const allResults = await searchService.fuzzySearch(keyword, { limit: 1000 });
      totalCount = allResults.length;
      products = allResults.slice(offset, offset + limit);
    } else {
      // 获取所有商品
      const total = await db.getAsync("SELECT COUNT(*) AS count FROM products");
      totalCount = total.count;
      products = await db.allAsync(
        "SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset]
      );
    }
    
    const totalPages = Math.ceil(totalCount / limit);

    // 检查是否是API请求（通过Accept头或查询参数）
    if (req.headers.accept && req.headers.accept.includes('application/json') || req.query.format === 'json') {
      const jsonProducts = products.map(p => ({
        ...p,
        image: toRootImagePath(p.image || DEFAULT_IMAGE_MAP[p.id] || 'default.png')
      }));
      return res.json(jsonProducts);
    }

    // 统一图片路径，页面渲染使用 imageUrl 字段
    res.render('productList', {
      products,
      page: parseInt(page),
      keyword,
      totalPages,
      totalCount
    });
  } catch (err) {
    console.error("获取商品失败:", err);
    res.status(500).send("获取商品失败");
  }
});

// API路由：获取所有商品（JSON格式）
router.get('/api/all', async (req, res) => {
  try {
    const products = await db.allAsync("SELECT * FROM products ORDER BY created_at DESC");
    res.json(products);
  } catch (err) {
    console.error("获取商品失败:", err);
    res.status(500).json({ error: "获取商品失败" });
  }
});

// API路由：获取搜索建议
router.get('/api/suggestions', async (req, res) => {
  const { q: keyword, limit = 5 } = req.query;
  
  try {
    if (!keyword || keyword.trim().length < 2) {
      return res.json([]);
    }
    
    const suggestions = await searchService.getSearchSuggestions(keyword, parseInt(limit));
    res.json(suggestions);
  } catch (err) {
    console.error("获取搜索建议失败:", err);
    res.status(500).json({ error: "获取搜索建议失败" });
  }
});

// API路由：获取热门搜索词
router.get('/api/hot-searches', async (req, res) => {
  const { limit = 10 } = req.query;
  
  try {
    const hotSearches = await searchService.getHotSearchTerms(parseInt(limit));
    res.json(hotSearches);
  } catch (err) {
    console.error("获取热门搜索词失败:", err);
    res.status(500).json({ error: "获取热门搜索词失败" });
  }
});

// API路由：模糊搜索
router.get('/api/search', behaviorTracker.trackSearch(), async (req, res) => {
  const { q: keyword, limit = 20, offset = 0 } = req.query;
  
  try {
    const products = await searchService.fuzzySearch(keyword, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      products,
      total: products.length,
      keyword
    });
  } catch (err) {
    console.error("模糊搜索失败:", err);
    res.status(500).json({ error: "搜索失败" });
  }
});

// 获取商品详情
router.get('/:id', behaviorTracker.trackProductView(), async (req, res) => {
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
