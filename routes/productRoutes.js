//productRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const searchService = require('../services/searchService');
const behaviorTracker = require('../middleware/behaviorTracker');

const DEFAULT_IMAGE_MAP = {
  201: 'tp107.png',
  202: 'Product84.png',
  203: 'Product85.png',
  204: 'tp117.png',
  205: 'tp112.png',
  206: 'Product88.png'
};

function toRootImagePath(image) {
  if (!image) return '/image/default.png';
  const str = String(image).trim();
  if (/^https?:\/\/|^data:/i.test(str)) return str;
  const cleaned = str.replace(/^\.?\/?image\/?/i, '').replace(/^\/+/, '');
  return `/image/${cleaned || 'default.png'}`;
}

function toPngLocal(image) {
  const url = toRootImagePath(image);
  if (/^https?:\/\//i.test(url)) return url;
  return url.replace(/\.(jpg|jpeg|webp|gif|bmp)$/i, '.png');
}

function dedupeProducts(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const key = `${String(p.name || '').trim().toLowerCase()}|${String(p.image || '').trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

// 获取商品列表（支持分页与模糊搜索）- 返回HTML页面
router.get('/all', async (req, res) => {
  const { page = 1, keyword = '' } = req.query;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    let products, totalCount;
    const tag = (req.query.tag || '').toLowerCase();
    
    if (keyword.trim()) {
      const allResults = await searchService.fuzzySearch(keyword, { limit: 1000 });
      let filteredResults = allResults;
      if (tag === 'accessory' || /手机壳|保护壳|保护套|外壳|手机膜|钢化膜/.test(keyword)) {
        const allowTokens = ['壳', '手机壳', '保护壳', '保护套', '外壳', '膜', '钢化膜'];
        filteredResults = allResults.filter(p => {
          const text = `${p.name || ''} ${p.description || ''}`;
          return allowTokens.some(t => text.includes(t));
        });
      }
      filteredResults = dedupeProducts(filteredResults);
      totalCount = filteredResults.length;
      products = filteredResults.slice(offset, offset + limit);
    } else {
      // 获取所有商品
      const total = await db.getAsync("SELECT COUNT(*) AS count FROM products");
      totalCount = total.count;
      products = await db.allAsync(
        "SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset]
      );
      products = dedupeProducts(products);
      totalCount = products.length;
    }
    
    const totalPages = Math.ceil(totalCount / limit);

    // 检查是否是API请求（通过Accept头或查询参数）
    if (req.headers.accept && req.headers.accept.includes('application/json') || req.query.format === 'json') {
      const jsonProducts = dedupeProducts(products).map(p => ({
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
    product.image = toPngLocal(product.image);
    const reviews = await db.allAsync(
      `SELECT user_name AS author, content AS content, avatar_url AS avatar, rating, sku_info, created_at
       FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 50`,
      [productId]
    );
    product.reviews = reviews || [];
    const detail = await db.getAsync(`SELECT detail_image1, detail_image2, detail_image3, detail_image4, detail_image5 FROM image_detail WHERE product_id = ?`, [productId]);
    if (detail) {
      const imgs = [detail.detail_image1, detail.detail_image2, detail.detail_image3, detail.detail_image4, detail.detail_image5]
        .filter(Boolean)
        .map(toRootImagePath);
      product.detail_images = imgs;
    } else {
      product.detail_images = [];
    }
    res.render('detail', { product });
  } catch (err) {
    console.error("获取商品详情失败:", err);
    res.status(500).send("服务器错误");
  }
});

module.exports = router;
