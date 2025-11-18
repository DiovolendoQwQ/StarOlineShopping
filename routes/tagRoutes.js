const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');

function toRootImagePath(image) {
  if (!image) return '/image/default.png';
  const str = String(image).trim();
  if (/^https?:\/\/|^data:/i.test(str)) return str;
  const cleaned = str.replace(/^\.?\/?image\/?/i, '').replace(/^\/+/, '');
  return `/image/${cleaned || 'default.png'}`;
}

const TAG_KEYWORDS = {
  accessory: [
    '手机壳','保护套','保护壳','指环支架','支架','充电器','充电头','数据线','耳机','蓝牙耳机',
    '充电宝','移动电源','硬盘','手机膜','钢化膜','随身风扇','自拍杆'
  ]
};

router.get('/:tag', async (req, res) => {
  const { tag } = req.params;
  const page = parseInt(req.query.page || '1', 10);
  const limit = 12;
  const offset = (page - 1) * limit;

  const keywords = TAG_KEYWORDS[tag];
  if (!keywords) return res.status(404).send('标签不存在');

  try {
    const searches = await Promise.all(
      keywords.map(k => searchService.fuzzySearch(k, { limit: 200 }))
    );
    const map = new Map();
    searches.flat().forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
    const products = Array.from(map.values());
    const totalCount = products.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paged = products.slice(offset, offset + limit).map(p => ({
      ...p,
      image: toRootImagePath(p.image)
    }));

    res.render('tag', {
      tag,
      tagName: tag === 'accessory' ? '配件' : tag,
      products: paged,
      page,
      totalPages,
      totalCount
    });
  } catch (err) {
    res.status(500).send('获取标签商品失败');
  }
});

module.exports = router;