// scripts/generateMockData.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// 行为类型权重配置（模拟真实用户行为比例）
const ACTION_WEIGHTS = {
  view: 100,           // 浏览：最高频率
  search: 25,          // 搜索：中等频率
  add_to_cart: 8,      // 加购：较低频率（降低）
  remove_from_cart: 3, // 移除购物车：很低频率
  favorite: 6,         // 收藏：较低频率
  share: 2,            // 分享：很低频率
  purchase: 2,         // 购买：很低频率（大幅降低）
  review: 1            // 评价：最低频率
};

// 时间分布权重（模拟用户活跃时段）
const HOUR_WEIGHTS = {
  0: 2, 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 5, 7: 8, 8: 12, 9: 15,
  10: 18, 11: 20, 12: 22, 13: 20, 14: 18, 15: 16, 16: 15, 17: 14,
  18: 16, 19: 20, 20: 25, 21: 22, 22: 15, 23: 8
};

// 用户行为模式（不同类型用户的行为特征）
const USER_PATTERNS = {
  browser: { view: 0.8, search: 0.15, add_to_cart: 0.03, purchase: 0.01, favorite: 0.01 },
  buyer: { view: 0.6, search: 0.2, add_to_cart: 0.12, purchase: 0.05, favorite: 0.03 },
  researcher: { view: 0.65, search: 0.25, add_to_cart: 0.06, purchase: 0.02, favorite: 0.02 },
  social: { view: 0.5, search: 0.1, add_to_cart: 0.05, purchase: 0.02, share: 0.3, favorite: 0.03 }
};

class MockDataGenerator {
  constructor() {
    this.users = [];
    this.products = [];
    this.userBehaviors = new Map(); // 跟踪每个用户的行为历史
  }

  // 获取现有用户和产品数据
  async loadExistingData() {
    console.log('📊 加载现有数据...');
    
    this.users = await db.allAsync('SELECT id FROM users');
    this.products = await db.allAsync('SELECT id, name, price FROM products');
    
    console.log(`✅ 加载了 ${this.users.length} 个用户和 ${this.products.length} 个产品`);
  }

  // 生成随机权重选择
  weightedRandom(weights) {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [key, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return key;
    }
    
    return Object.keys(weights)[0];
  }

  // 生成随机时间（在指定日期范围内）
  generateRandomTime(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    // 根据时间权重选择小时
    const hour = parseInt(this.weightedRandom(HOUR_WEIGHTS));
    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);
    
    date.setHours(hour, minute, second, 0);
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  // 为用户分配行为模式
  getUserPattern(userId) {
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const patterns = Object.keys(USER_PATTERNS);
    return patterns[Math.abs(hash) % patterns.length];
  }

  // 检查行为逻辑合理性
  isActionValid(userId, action, productId) {
    const userHistory = this.userBehaviors.get(userId) || {};
    const productHistory = userHistory[productId] || {};
    
    switch (action) {
      case 'add_to_cart':
        // 加购前必须有浏览记录
        return (productHistory.view || 0) > 0;
      
      case 'purchase':
        // 购买前必须有加购记录，且购买次数不能超过加购次数
        return (productHistory.add_to_cart || 0) > (productHistory.purchase || 0);
      
      case 'remove_from_cart':
        // 移除购物车前必须有加购记录
        return (productHistory.add_to_cart || 0) > (productHistory.remove_from_cart || 0);
      
      case 'review':
        // 评价前必须有购买记录
        return (productHistory.purchase || 0) > 0;
      
      case 'favorite':
        // 收藏前必须有浏览记录
        return (productHistory.view || 0) > 0;
      
      case 'share':
        // 分享前必须有浏览记录
        return (productHistory.view || 0) > 0;
      
      default:
        return true;
    }
  }

  // 记录用户行为（用于逻辑验证）
  recordUserAction(userId, action, productId) {
    if (!this.userBehaviors.has(userId)) {
      this.userBehaviors.set(userId, {});
    }
    
    const userHistory = this.userBehaviors.get(userId);
    if (!userHistory[productId]) {
      userHistory[productId] = {};
    }
    
    userHistory[productId][action] = (userHistory[productId][action] || 0) + 1;
  }

  // 生成单个用户行为记录
  generateUserBehavior(userId, daysAgo) {
    const userPattern = this.getUserPattern(userId);
    const patternWeights = USER_PATTERNS[userPattern];
    
    // 根据用户模式选择行为类型
    let action = this.weightedRandom(patternWeights);
    
    // 随机选择产品
    const product = this.products[Math.floor(Math.random() * this.products.length)];
    const productId = product.id;
    
    // 检查行为逻辑合理性
    if (!this.isActionValid(userId, action, productId)) {
      // 如果行为不合理，强制为浏览行为，以确保行为链的起点是合理的
      action = 'view';
    }
    
    // 记录行为
    this.recordUserAction(userId, action, productId);
    
    // 生成元数据
    const metadata = this.generateMetadata(action, product);
    
    return {
      user_id: userId,
      action_type: action,
      target_type: 'product',
      target_id: productId,
      metadata: JSON.stringify(metadata),
      ip_address: this.generateRandomIP(),
      user_agent: this.generateRandomUserAgent(),
      created_at: this.generateRandomTime(daysAgo)
    };
  }

  // 生成行为元数据
  generateMetadata(action, product) {
    // 生成合理的会话时长（1-20分钟）
    const sessionDuration = Math.floor(Math.random() * 19) + 1;
    
    const baseMetadata = {
      product_name: product.name,
      product_price: product.price,
      session_id: uuidv4(),
      page_url: `/product/${product.id}`,
      referrer: this.generateRandomReferrer(),
      session_duration_minutes: sessionDuration
    };

    switch (action) {
      case 'search':
        return {
          ...baseMetadata,
          search_query: this.generateSearchQuery(product.name),
          search_results_count: Math.floor(Math.random() * 50) + 1
        };
      
      case 'add_to_cart':
        return {
          ...baseMetadata,
          quantity: Math.floor(Math.random() * 3) + 1,
          cart_total_items: Math.floor(Math.random() * 10) + 1
        };
      
      case 'purchase':
        return {
          ...baseMetadata,
          quantity: Math.floor(Math.random() * 2) + 1,
          payment_method: ['credit_card', 'paypal', 'alipay', 'wechat_pay'][Math.floor(Math.random() * 4)],
          order_total: (product.price * (Math.floor(Math.random() * 2) + 1)).toFixed(2)
        };
      
      case 'review':
        return {
          ...baseMetadata,
          rating: Math.floor(Math.random() * 5) + 1,
          review_length: Math.floor(Math.random() * 200) + 10
        };
      
      default:
        return baseMetadata;
    }
  }

  // 生成随机IP地址
  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  // 生成随机User Agent
  generateRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // 生成随机引荐来源
  generateRandomReferrer() {
    const referrers = [
      'https://www.google.com/',
      'https://www.baidu.com/',
      'https://www.bing.com/',
      'https://www.facebook.com/',
      'https://www.twitter.com/',
      'direct',
      'email',
      'social_media'
    ];
    return referrers[Math.floor(Math.random() * referrers.length)];
  }

  // 生成搜索查询
  generateSearchQuery(productName) {
    const keywords = productName.split(' ');
    const queryLength = Math.floor(Math.random() * 3) + 1;
    const selectedKeywords = keywords.slice(0, queryLength);
    return selectedKeywords.join(' ').toLowerCase();
  }

  // 生成90天的模拟数据
  async generateMockData() {
    console.log('🚀 开始生成90天模拟数据...');
    
    await this.loadExistingData();
    
    const behaviors = [];
    const totalDays = 90;
    
    for (let day = 0; day < totalDays; day++) {
      const dayProgress = ((totalDays - day) / totalDays * 100).toFixed(1);
      console.log(`📅 生成第 ${day + 1} 天数据... (${dayProgress}%)`);
      
      // 创建更明显的收入趋势变化
      const trendMultiplier = 1 + (day / totalDays) * 0.8; // 随时间增长
      const weeklyPattern = Math.sin((day / 7) * Math.PI * 2) * 0.3 + 1; // 周期性波动
      const randomVariation = 0.7 + Math.random() * 0.6; // 随机变化
      
      // 每天的行为数量（周末较少，工作日较多）
      const isWeekend = new Date(Date.now() - day * 24 * 60 * 60 * 1000).getDay() % 6 === 0;
      const baseBehaviorsPerDay = isWeekend ? 600 : 1000;
      const dailyBehaviors = Math.floor(baseBehaviorsPerDay * trendMultiplier * weeklyPattern * randomVariation);
      
      // 为每个活跃用户生成行为
      const activeUsersToday = Math.floor(this.users.length * (0.1 + Math.random() * 0.2));
      const shuffledUsers = [...this.users].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(activeUsersToday, dailyBehaviors); i++) {
        const user = shuffledUsers[i % shuffledUsers.length];
        const behavior = this.generateUserBehavior(user.id, day);
        behaviors.push(behavior);
        
        // 某些用户可能有多个行为
        if (Math.random() < 0.3) {
          const extraBehavior = this.generateUserBehavior(user.id, day);
          behaviors.push(extraBehavior);
        }
      }
    }
    
    console.log(`✅ 生成了 ${behaviors.length} 条行为记录`);
    return behaviors;
  }

  // 批量插入数据到数据库
  async insertBehaviors(behaviors) {
    console.log('💾 开始插入数据到数据库...');
    
    const batchSize = 1000;
    let inserted = 0;
    
    for (let i = 0; i < behaviors.length; i += batchSize) {
      const batch = behaviors.slice(i, i + batchSize);
      
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = batch.flatMap(b => [
        b.user_id, b.action_type, b.target_type, b.target_id,
        b.metadata, b.ip_address, b.user_agent, b.created_at
      ]);
      
      await db.runAsync(
        `INSERT INTO user_behaviors 
         (user_id, action_type, target_type, target_id, metadata, ip_address, user_agent, created_at) 
         VALUES ${placeholders}`,
        values
      );
      
      inserted += batch.length;
      console.log(`📊 已插入 ${inserted}/${behaviors.length} 条记录 (${(inserted/behaviors.length*100).toFixed(1)}%)`);
    }
    
    console.log('✅ 数据插入完成!');
  }



  // 主执行函数
  async execute() {
    try {
      console.log('🎯 开始生成90天模拟数据...');
      
      // 清理现有的模拟数据
      await db.runAsync("DELETE FROM user_behaviors WHERE metadata LIKE '%generated%'");
      await db.runAsync("DELETE FROM analytics_summary WHERE metadata LIKE '%generated%'");
      
      // 生成用户行为数据
      const behaviors = await this.generateMockData();
      await this.insertBehaviors(behaviors);
      
      console.log('🎉 90天模拟数据生成完成!');
      console.log('📊 数据统计:');
      console.log(`   - 用户行为记录: ${behaviors.length} 条`);
      console.log(`   - 时间范围: ${new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`);
      
    } catch (error) {
      console.error('❌ 生成模拟数据时出错:', error);
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const generator = new MockDataGenerator();
  generator.execute()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = MockDataGenerator;