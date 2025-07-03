// 搜索服务 - 提供模糊搜索功能
const db = require('../config/database');

class SearchService {
  constructor() {
    // 常用拼音映射表（简化版）
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
  }

  /**
   * 执行模糊搜索
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   * @returns {Array} 搜索结果
   */
  async fuzzySearch(keyword, options = {}) {
    const { limit = 50, offset = 0, minScore = 0.1 } = options;
    
    if (!keyword || keyword.trim().length === 0) {
      return await this.getAllProducts(limit, offset);
    }

    const searchTerms = this.preprocessKeyword(keyword);
    const products = await this.getAllProducts();
    
    // 计算每个商品的相关性得分
    const scoredProducts = products.map(product => {
      const score = this.calculateRelevanceScore(product, searchTerms);
      return { ...product, relevanceScore: score };
    });

    // 过滤和排序
    const filteredProducts = scoredProducts
      .filter(product => product.relevanceScore >= minScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(offset, offset + limit);

    return filteredProducts;
  }

  /**
   * 预处理搜索关键词
   * @param {string} keyword - 原始关键词
   * @returns {Array} 处理后的搜索词数组
   */
  preprocessKeyword(keyword) {
    const terms = [];
    const cleanKeyword = keyword.trim().toLowerCase();
    
    // 分割关键词
    const words = cleanKeyword.split(/\s+/);
    
    words.forEach(word => {
      terms.push(word);
      
      // 添加拼音搜索支持
      Object.entries(this.pinyinMap).forEach(([chinese, pinyins]) => {
        pinyins.forEach(pinyin => {
          if (pinyin.includes(word) || word.includes(pinyin)) {
            terms.push(chinese);
          }
        });
      });
      
      // 添加同义词支持
      Object.entries(this.synonymMap).forEach(([main, synonyms]) => {
        if (synonyms.some(syn => syn.includes(word) || word.includes(syn))) {
          terms.push(main);
          terms.push(...synonyms);
        }
      });
    });
    
    return [...new Set(terms)]; // 去重
  }

  /**
   * 计算商品与搜索词的相关性得分
   * @param {Object} product - 商品对象
   * @param {Array} searchTerms - 搜索词数组
   * @returns {number} 相关性得分 (0-1)
   */
  calculateRelevanceScore(product, searchTerms) {
    let score = 0;
    const name = (product.name || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    
    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      
      // 商品名称匹配（权重更高）
      if (name.includes(termLower)) {
        if (name === termLower) {
          score += 1.0; // 完全匹配
        } else if (name.startsWith(termLower)) {
          score += 0.8; // 前缀匹配
        } else {
          score += 0.6; // 包含匹配
        }
      }
      
      // 描述匹配（权重较低）
      if (description.includes(termLower)) {
        score += 0.3;
      }
      
      // 模糊匹配（编辑距离）
      const nameDistance = this.calculateEditDistance(name, termLower);
      const descDistance = this.calculateEditDistance(description, termLower);
      
      if (nameDistance <= 2 && termLower.length > 2) {
        score += 0.4;
      }
      if (descDistance <= 2 && termLower.length > 2) {
        score += 0.2;
      }
    });
    
    return Math.min(score, 1.0); // 限制最大得分为1
  }

  /**
   * 计算编辑距离（Levenshtein距离）
   * @param {string} str1 - 字符串1
   * @param {string} str2 - 字符串2
   * @returns {number} 编辑距离
   */
  calculateEditDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    
    // 初始化矩阵
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // 计算编辑距离
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // 删除
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j - 1] + cost // 替换
        );
      }
    }
    
    return matrix[len1][len2];
  }

  /**
   * 获取搜索建议
   * @param {string} keyword - 搜索关键词
   * @param {number} limit - 建议数量限制
   * @returns {Array} 搜索建议列表
   */
  async getSearchSuggestions(keyword, limit = 5) {
    if (!keyword || keyword.trim().length < 2) {
      return [];
    }
    
    const products = await this.getAllProducts();
    const suggestions = new Set();
    const keywordLower = keyword.toLowerCase();
    
    products.forEach(product => {
      const name = (product.name || '').toLowerCase();
      const words = name.split(/\s+/);
      
      words.forEach(word => {
        if (word.startsWith(keywordLower) && word.length > keywordLower.length) {
          suggestions.add(word);
        }
      });
      
      // 添加完整商品名称作为建议
      if (name.includes(keywordLower) && name !== keywordLower) {
        suggestions.add(product.name);
      }
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * 获取所有商品
   * @param {number} limit - 限制数量
   * @param {number} offset - 偏移量
   * @returns {Array} 商品列表
   */
  async getAllProducts(limit = null, offset = 0) {
    let query = "SELECT * FROM products ORDER BY created_at DESC";
    const params = [];
    
    if (limit) {
      query += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
    }
    
    return await db.allAsync(query, params);
  }

  /**
   * 获取热门搜索词
   * @param {number} limit - 限制数量
   * @returns {Array} 热门搜索词列表
   */
  async getHotSearchTerms(limit = 10) {
    // 这里可以从搜索日志表获取，暂时返回预设的热门词
    const hotTerms = [
      '小米手机', '华为手机', '苹果手机', '耳机', '充电器',
      '数据线', '保护壳', '蓝牙音响', '智能手表', '平板电脑'
    ];
    
    return hotTerms.slice(0, limit);
  }
}

module.exports = new SearchService();