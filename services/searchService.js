const db = require('../config/database');
const Fuse = require('fuse.js'); // npm install fuse.js

class SearchService {
  constructor() {
    // 拼音映射表（简化版）
    this.pinyinMap = {
      '手机': ['shouji', 'sj'],
      '电脑': ['diannao', 'dn'],
      '耳机': ['erji', 'ej'],
      '音响': ['yinxiang', 'yx'],
      '键盘': ['jianpan', 'jp'],
      '鼠标': ['shubiao', 'sb'],
      '显示器': ['xianshiqi', 'xsq'],
      '充电器': ['chongdianqi', 'cdq'],
      '数据线': ['shujuxian', 'sjx'],
      '保护壳': ['baohuqiao', 'bhq'],
      '小米': ['xiaomi', 'xm'],
      '华为': ['huawei', 'hw'],
      '苹果': ['pingguo', 'pg'],
      '三星': ['sanxing', 'sx'],
      '联想': ['lianxiang', 'lx']
    };

    // 同义词映射
    this.synonymMap = {
      '手机': ['电话', '移动电话', '智能机'],
      '电脑': ['计算机', '笔记本', 'PC'],
      '耳机': ['耳麦', '头戴式耳机', '入耳式耳机'],
      '音响': ['扬声器', '喇叭', '音箱'],
      '充电器': ['充电头', '电源适配器', '充电线'],
      '保护壳': ['手机壳', '保护套', '外壳']
    };

    // Fuse.js 配置
    this.fuseOptions = {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'description', weight: 0.3 }
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
      shouldSort: true,
      findAllMatches: true
    };
  }

  /**
   * 执行模糊搜索
   */
  async fuzzySearch(keyword, options = {}) {
    const { limit = 50, offset = 0, minScore = 0.1 } = options;

    if (!keyword || keyword.trim().length === 0) {
      return await this.getAllProducts(limit, offset);
    }

    const products = await this.getAllProducts(); // 可优化为缓存或限制数量
    const expandedTerms = this.expandKeyword(keyword);
    const fuse = new Fuse(products, this.fuseOptions);
    const resultsMap = new Map();

    for (const term of expandedTerms) {
      const fuseResults = fuse.search(term);
      for (const { item, score } of fuseResults) {
        const relevance = 1 - score;
        if (relevance >= minScore) {
          const id = item.id !== undefined ? item.id : item.name;
          if (!resultsMap.has(id) || resultsMap.get(id).relevanceScore < relevance) {
            resultsMap.set(id, { ...item, relevanceScore: relevance });
          }
        }
      }
    }

    const sorted = Array.from(resultsMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(offset, offset + limit);

    return sorted;
  }

  /**
   * 扩展关键词：原始词 + 拼音反查 + 同义词
   */
  expandKeyword(keyword) {
    const terms = new Set();
    const cleanKeyword = keyword.trim().toLowerCase();
    const words = cleanKeyword.split(/\s+/).filter(w => w.length > 0);

    words.forEach(word => {
      terms.add(word);

      // 拼音反查中文
      for (const [chinese, pinyins] of Object.entries(this.pinyinMap)) {
        if (pinyins.some(p => p.includes(word) || word.includes(p))) {
          terms.add(chinese);
        }
      }

      // 同义词扩展
      for (const [main, synonyms] of Object.entries(this.synonymMap)) {
        if (
          main.includes(word) ||
          word.includes(main) ||
          synonyms.some(s => s.includes(word) || word.includes(s))
        ) {
          terms.add(main);
          synonyms.forEach(s => terms.add(s));
        }
      }
    });

    return Array.from(terms);
  }

  /**
   * 获取搜索建议（支持描述中的匹配词）
   */
  async getSearchSuggestions(keyword, limit = 5) {
    if (!keyword || keyword.trim().length < 2) {
      return [];
    }

    const kw = keyword.trim().toLowerCase();
    const suggestions = new Set();
    const products = await this.getAllProducts(200); // 限制扫描范围

    for (const product of products) {
      const rawName = product.name || '';
      const rawDesc = product.description || '';
      const nameLower = rawName.toLowerCase();
      const descLower = rawDesc.toLowerCase();

      // 1. 完整商品名建议
      if (nameLower.startsWith(kw) && nameLower !== kw) {
        suggestions.add(rawName);
      }

      // 2. 从名称+描述中提取 token
      const tokens = this.tokenizeText(nameLower + ' ' + descLower);
      for (const token of tokens) {
        if (
          token.startsWith(kw) &&
          token.length > kw.length &&
          token.length <= 20 &&
          !/^\d+$/.test(token)
        ) {
          // 尝试还原原始大小写
          let originalToken = token;
          const nameWords = rawName.split(/\s+/);
          const foundInName = nameWords.find(w => w.toLowerCase() === token);
          if (foundInName) {
            originalToken = foundInName;
          } else {
            const descWords = rawDesc.split(/\s+/);
            const foundInDesc = descWords.find(w => w.toLowerCase() === token);
            if (foundInDesc) {
              originalToken = foundInDesc;
            }
          }
          suggestions.add(originalToken);
        }
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * 简易分词：切分为中文连续字串、英文单词、数字
   */
  tokenizeText(text) {
    return text.match(/[\u4e00-\u9fa5]+|\w+/g) || [];
  }

  /**
   * 获取所有商品
   */
  async getAllProducts(limit = null, offset = 0) {
    let query = "SELECT * FROM products ORDER BY created_at DESC";
    const params = [];
    if (limit !== null) {
      query += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
    }
    return await db.allAsync(query, params);
  }

  /**
   * 获取热门搜索词
   */
  async getHotSearchTerms(limit = 10) {
    const hotTerms = [
      '小米手机', '华为手机', '苹果手机', '耳机', '充电器',
      '数据线', '保护壳', '蓝牙音响', '智能手表', '平板电脑'
    ];
    return hotTerms.slice(0, limit);
  }
}

module.exports = new SearchService();