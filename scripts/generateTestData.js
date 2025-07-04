const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// 随机数据生成器
class DataGenerator {
  constructor() {
    this.users = [];
    this.products = [];
    this.orders = [];
    this.behaviors = [];
    this.preferences = [];
  }

  // 生成随机用户数据
  generateUsers(count = 50) {
    const domains = ['gmail.com', 'qq.com', '163.com', 'hotmail.com', 'yahoo.com'];
    const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
    const lastNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞'];
    
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = firstName + lastName + Math.floor(Math.random() * 1000);
      const email = `${username.toLowerCase()}@${domains[Math.floor(Math.random() * domains.length)]}`;
      
      this.users.push({
        id: uuidv4(),
        username,
        email,
        password: bcrypt.hashSync('123456', 10),
        role: Math.random() < 0.05 ? 'admin' : null
      });
    }
  }

  // 生成随机产品数据
  generateProducts(count = 100) {
    const categories = ['手机', '电脑', '平板', '耳机', '音响', '充电器', '数据线', '保护壳', '智能手表', '相机'];
    const brands = ['小米', '华为', '苹果', 'OPPO', 'vivo', '三星', '联想', '戴尔', '索尼', 'JBL'];
    
    for (let i = 1; i <= count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const price = Math.floor(Math.random() * 5000) + 100;
      
      this.products.push({
        id: i,
        name: `${brand} ${category} ${Math.floor(Math.random() * 20) + 1}`,
        description: `高品质${category}，${brand}品牌，性能卓越，值得信赖。`,
        price,
        image: `Product${i}.jpg`,
        stock: Math.floor(Math.random() * 100) + 10
      });
    }
  }

  // 生成随机用户行为数据
  generateUserBehaviors(days = 90) {
    const actionTypes = ['view', 'product_view', 'search', 'add_to_cart', 'cart_remove', 'cart_update', 'purchase', 'login'];
    const pages = ['home', 'products', 'cart', 'profile', 'analytics_dashboard'];
    const searchTerms = ['手机', '电脑', '耳机', '充电器', '小米', '华为', '苹果', '平板', '音响', '数据线'];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 确保每个产品都有基础数据
    this.products.forEach(product => {
      const baseViews = Math.floor(Math.random() * 100) + 20; // 每个产品至少20次浏览
      const baseCartAdds = Math.floor(baseViews * (Math.random() * 0.3 + 0.05)); // 5-35%的浏览转化为购物车
      
      for (let i = 0; i < baseViews; i++) {
        const user = this.users[Math.floor(Math.random() * this.users.length)];
        const viewDate = new Date(startDate.getTime() + Math.random() * days * 24 * 60 * 60 * 1000);
        
        this.behaviors.push({
          user_id: user.id,
          action_type: 'view',
          target_type: 'product',
          target_id: product.id,
          metadata: JSON.stringify({}),
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: viewDate.toISOString()
        });
      }
      
      for (let i = 0; i < baseCartAdds; i++) {
        const user = this.users[Math.floor(Math.random() * this.users.length)];
        const cartDate = new Date(startDate.getTime() + Math.random() * days * 24 * 60 * 60 * 1000);
        
        this.behaviors.push({
          user_id: user.id,
          action_type: 'add_to_cart',
          target_type: 'product',
          target_id: product.id,
          metadata: JSON.stringify({ quantity: Math.floor(Math.random() * 3) + 1 }),
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: cartDate.toISOString()
        });
      }
    });
    
    // 生成其他类型的行为数据
    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // 每天生成100-300个额外行为记录
      const behaviorCount = Math.floor(Math.random() * 200) + 100;
      
      for (let i = 0; i < behaviorCount; i++) {
        const user = this.users[Math.floor(Math.random() * this.users.length)];
        const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        
        let targetType, targetId, metadata = {};
        
        switch (actionType) {
          case 'view':
            if (Math.random() < 0.7) {
              targetType = 'product';
              targetId = Math.floor(Math.random() * this.products.length) + 1;
            } else {
              targetType = 'page';
              targetId = null;
              metadata.page = pages[Math.floor(Math.random() * pages.length)];
            }
            break;
          case 'product_view':
            targetType = 'product';
            targetId = Math.floor(Math.random() * this.products.length) + 1;
            break;
          case 'search':
            targetType = 'search';
            targetId = null;
            metadata.query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
            metadata.results_count = Math.floor(Math.random() * 20) + 1;
            break;
          case 'add_to_cart':
          case 'cart_remove':
          case 'cart_update':
            targetType = 'product';
            targetId = Math.floor(Math.random() * this.products.length) + 1;
            metadata.quantity = Math.floor(Math.random() * 5) + 1;
            break;
          case 'purchase':
            targetType = 'order';
            targetId = Math.floor(Math.random() * 1000) + 1;
            metadata.amount = Math.floor(Math.random() * 5000) + 100;
            break;
          case 'login':
            targetType = 'user';
            targetId = null;
            break;
        }
        
        // 随机时间（当天内）
        const behaviorTime = new Date(currentDate);
        behaviorTime.setHours(Math.floor(Math.random() * 24));
        behaviorTime.setMinutes(Math.floor(Math.random() * 60));
        behaviorTime.setSeconds(Math.floor(Math.random() * 60));
        
        this.behaviors.push({
          user_id: user.id,
          action_type: actionType,
          target_type: targetType,
          target_id: targetId,
          metadata: JSON.stringify(metadata),
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: behaviorTime.toISOString()
        });
      }
    }
  }

  // 生成用户偏好数据
  generateUserPreferences() {
    const categories = ['手机', '电脑', '耳机', '充电器', '音响', '平板', '数据线', '键盘', '鼠标', '显示器'];
    const brands = ['小米', '华为', '苹果', '三星', '联想', '戴尔', '索尼', '罗技', '雷蛇', '海盗船'];
    const priceRanges = ['budget', 'mid-range', 'premium', 'luxury'];
    
    this.users.forEach(user => {
      // 基于用户的购买历史生成偏好
      const userOrders = this.orders.filter(order => order.user_id === user.id);
      const purchasedProducts = new Set();
      const categoryCount = {};
      const brandCount = {};
      let totalSpent = 0;
      
      // 分析用户购买历史
      userOrders.forEach(order => {
        totalSpent += order.total_amount;
        const orderItems = this.orderItems.filter(item => item.order_id === order.id);
        orderItems.forEach(item => {
          const product = this.products.find(p => p.id === item.product_id);
          if (product) {
            purchasedProducts.add(product.id);
            // 从产品名称中提取类别和品牌信息
            const productName = product.name;
            categories.forEach(cat => {
              if (productName.includes(cat)) {
                categoryCount[cat] = (categoryCount[cat] || 0) + item.quantity;
              }
            });
            brands.forEach(brand => {
              if (productName.includes(brand)) {
                brandCount[brand] = (brandCount[brand] || 0) + item.quantity;
              }
            });
          }
        });
      });
      
      // 生成类别偏好（基于购买历史 + 随机）
      const preferredCategories = Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a]);
      const additionalCategories = categories.filter(cat => !preferredCategories.includes(cat))
        .sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);
      
      [...preferredCategories, ...additionalCategories].forEach((category, index) => {
        const weight = preferredCategories.includes(category) 
          ? Math.min(0.9, (categoryCount[category] || 0) * 0.1 + 0.4) 
          : Math.random() * 0.4 + 0.1;
        
        this.preferences.push({
          user_id: user.id,
          preference_type: 'category',
          preference_value: category,
          weight: weight,
          created_at: new Date().toISOString()
        });
      });
      
      // 生成品牌偏好（基于购买历史 + 随机）
      const preferredBrands = Object.keys(brandCount).sort((a, b) => brandCount[b] - brandCount[a]);
      const additionalBrands = brands.filter(brand => !preferredBrands.includes(brand))
        .sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 1);
      
      [...preferredBrands, ...additionalBrands].forEach(brand => {
        const weight = preferredBrands.includes(brand)
          ? Math.min(0.95, (brandCount[brand] || 0) * 0.15 + 0.5)
          : Math.random() * 0.3 + 0.2;
        
        this.preferences.push({
          user_id: user.id,
          preference_type: 'brand',
          preference_value: brand,
          weight: weight,
          created_at: new Date().toISOString()
        });
      });
      
      // 生成价格偏好（基于消费水平）
      let pricePreference;
      const avgOrderValue = userOrders.length > 0 ? totalSpent / userOrders.length : 0;
      
      if (avgOrderValue < 500) {
        pricePreference = 'budget';
      } else if (avgOrderValue < 1500) {
        pricePreference = 'mid-range';
      } else if (avgOrderValue < 3000) {
        pricePreference = 'premium';
      } else {
        pricePreference = 'luxury';
      }
      
      this.preferences.push({
        user_id: user.id,
        preference_type: 'price_range',
        preference_value: pricePreference,
        weight: 0.8 + Math.random() * 0.2,
        created_at: new Date().toISOString()
      });
      
      // 如果用户没有购买历史，生成随机偏好
      if (userOrders.length === 0) {
        const randomCategories = categories.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 2);
        const randomBrands = brands.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);
        
        randomCategories.forEach(category => {
          this.preferences.push({
            user_id: user.id,
            preference_type: 'category',
            preference_value: category,
            weight: Math.random() * 0.6 + 0.2,
            created_at: new Date().toISOString()
          });
        });
        
        randomBrands.forEach(brand => {
          this.preferences.push({
            user_id: user.id,
            preference_type: 'brand',
            preference_value: brand,
            weight: Math.random() * 0.5 + 0.3,
            created_at: new Date().toISOString()
          });
        });
        
        // 随机价格偏好
        this.preferences.push({
          user_id: user.id,
          preference_type: 'price_range',
          preference_value: priceRanges[Math.floor(Math.random() * priceRanges.length)],
          weight: Math.random() * 0.4 + 0.4,
          created_at: new Date().toISOString()
        });
      }
    });
  }

  // 生成订单数据和订单项数据
  generateOrders(count = 300) {
    this.orderItems = []; // 初始化订单项数组
    
    const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const statusWeights = [0.08, 0.15, 0.25, 0.47, 0.05]; // 权重分布，更多已完成订单
    
    // 生成过去90天的订单，确保每天都有订单
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    for (let day = 0; day < 90; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // 每天生成2-8个订单，周末稍多
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const dailyOrderCount = Math.floor(Math.random() * (isWeekend ? 6 : 4)) + (isWeekend ? 3 : 2);
      
      for (let i = 0; i < dailyOrderCount; i++) {
        const user = this.users[Math.floor(Math.random() * this.users.length)];
        
        // 随机选择状态（基于权重）
        let status = 'pending';
        const rand = Math.random();
        let cumWeight = 0;
        for (let j = 0; j < statuses.length; j++) {
          cumWeight += statusWeights[j];
          if (rand <= cumWeight) {
            status = statuses[j];
            break;
          }
        }
        
        // 订单时间（当天内随机时间）
        const orderDate = new Date(currentDate);
        orderDate.setHours(Math.floor(Math.random() * 24));
        orderDate.setMinutes(Math.floor(Math.random() * 60));
        orderDate.setSeconds(Math.floor(Math.random() * 60));
        
        const orderId = `ORD-${orderDate.getTime()}-${Math.floor(Math.random() * 10000)}-${this.orders.length}`;
        
        // 每个订单包含1-4个商品
        const itemCount = Math.floor(Math.random() * 4) + 1;
        let totalAmount = 0;
        const selectedProducts = new Set();
        
        // 生成订单项
        for (let j = 0; j < itemCount; j++) {
          let product;
          let attempts = 0;
          do {
            product = this.products[Math.floor(Math.random() * this.products.length)];
            attempts++;
          } while (selectedProducts.has(product.id) && attempts < 10);
          
          selectedProducts.add(product.id);
          const quantity = Math.floor(Math.random() * 3) + 1;
          const itemPrice = product.price;
          const itemTotal = quantity * itemPrice;
          totalAmount += itemTotal;
          
          this.orderItems.push({
            order_id: orderId,
            product_id: product.id,
            quantity: quantity,
            price: itemPrice,
            created_at: orderDate.toISOString()
          });
        }
        
        const order = {
          id: orderId,
          user_id: user.id,
          total_amount: totalAmount,
          shipping_address: `北京市朝阳区${Math.floor(Math.random() * 100)}号`,
          status: status,
          created_at: orderDate.toISOString()
        };
        
        this.orders.push(order);
      }
    }
    
    // 如果订单数量不足，补充一些订单
    while (this.orders.length < count) {
      const user = this.users[Math.floor(Math.random() * this.users.length)];
      
      let status = 'delivered'; // 补充的订单主要是已完成状态
      if (Math.random() < 0.2) {
        const rand = Math.random();
        let cumWeight = 0;
        for (let j = 0; j < statuses.length; j++) {
          cumWeight += statusWeights[j];
          if (rand <= cumWeight) {
            status = statuses[j];
            break;
          }
        }
      }
      
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90));
      orderDate.setHours(Math.floor(Math.random() * 24));
      orderDate.setMinutes(Math.floor(Math.random() * 60));
      
      const orderId = `ORD-${orderDate.getTime()}-${Math.floor(Math.random() * 10000)}-${this.orders.length}`;
      
      const itemCount = Math.floor(Math.random() * 3) + 1;
      let totalAmount = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const product = this.products[Math.floor(Math.random() * this.products.length)];
        const quantity = Math.floor(Math.random() * 2) + 1;
        const itemPrice = product.price;
        const itemTotal = quantity * itemPrice;
        totalAmount += itemTotal;
        
        this.orderItems.push({
          order_id: orderId,
          product_id: product.id,
          quantity: quantity,
          price: itemPrice,
          created_at: orderDate.toISOString()
        });
      }
      
      const order = {
        id: orderId,
        user_id: user.id,
        total_amount: totalAmount,
        shipping_address: `北京市朝阳区${Math.floor(Math.random() * 100)}号`,
        status: status,
        created_at: orderDate.toISOString()
      };
      
      this.orders.push(order);
    }
  }

  // 插入数据到数据库
  async insertData() {
    try {
      console.log('🚀 开始插入测试数据...');
      
      // 插入用户数据
      console.log('📝 插入用户数据...');
      for (const user of this.users) {
        await db.runAsync(
          'INSERT OR IGNORE INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
          [user.id, user.username, user.email, user.password, user.role]
        );
      }
      
      // 插入产品数据
      console.log('📦 插入产品数据...');
      for (const product of this.products) {
        await db.runAsync(
          'INSERT OR IGNORE INTO products (id, name, description, price, image, stock) VALUES (?, ?, ?, ?, ?, ?)',
          [product.id, product.name, product.description, product.price, product.image, product.stock]
        );
      }
      
      // 插入订单数据
      console.log('🛒 插入订单数据...');
      for (const order of this.orders) {
        await db.runAsync(
          'INSERT OR IGNORE INTO orders (id, user_id, total_amount, shipping_address, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [order.id, order.user_id, order.total_amount, order.shipping_address, order.status, order.created_at]
        );
      }
      
      // 插入订单项数据
      console.log('📦 插入订单项数据...');
      for (const orderItem of this.orderItems) {
        await db.runAsync(
          'INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, price, created_at) VALUES (?, ?, ?, ?, ?)',
          [orderItem.order_id, orderItem.product_id, orderItem.quantity, orderItem.price, orderItem.created_at]
        );
      }
      
      // 插入用户行为数据
      console.log('📊 插入用户行为数据...');
      for (const behavior of this.behaviors) {
        await db.runAsync(
          'INSERT INTO user_behaviors (user_id, action_type, target_type, target_id, metadata, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [behavior.user_id, behavior.action_type, behavior.target_type, behavior.target_id, behavior.metadata, behavior.ip_address, behavior.user_agent, behavior.created_at]
        );
      }
      
      // 插入用户偏好数据
      console.log('❤️ 插入用户偏好数据...');
      for (const preference of this.preferences) {
        await db.runAsync(
          'INSERT OR REPLACE INTO user_preferences (user_id, preference_type, preference_value, weight, created_at) VALUES (?, ?, ?, ?, ?)',
          [preference.user_id, preference.preference_type, preference.preference_value, preference.weight, preference.created_at]
        );
      }
      
      console.log('✅ 测试数据插入完成！');
      console.log(`📈 数据统计:`);
      console.log(`   - 用户: ${this.users.length} 个`);
      console.log(`   - 产品: ${this.products.length} 个`);
      console.log(`   - 订单: ${this.orders.length} 个`);
      console.log(`   - 订单项: ${this.orderItems.length} 个`);
      console.log(`   - 用户行为: ${this.behaviors.length} 条`);
      console.log(`   - 用户偏好: ${this.preferences.length} 条`);
      
    } catch (error) {
      console.error('❌ 插入数据时发生错误:', error);
    }
  }

  // 生成所有数据
  async generateAllData(days = 90) {
    console.log(`🎲 开始生成 ${days} 天的测试数据...`);
    
    this.generateUsers(50);
    this.generateProducts(100);
    this.generateOrders(200);
    this.generateUserBehaviors(days);
    this.generateUserPreferences();
    
    await this.insertData();
  }
}

// 主函数
async function main() {
  const generator = new DataGenerator();
  await generator.generateAllData(90);
  process.exit(0);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DataGenerator;