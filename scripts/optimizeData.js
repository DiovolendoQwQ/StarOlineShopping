// scripts/optimizeData.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class DataOptimizer {
  constructor() {
    this.users = [];
    this.products = [];
  }

  // 加载现有数据
  async loadData() {
    console.log('📊 加载现有数据...');
    this.users = await db.allAsync('SELECT id FROM users');
    this.products = await db.allAsync('SELECT id, name, price FROM products');
    console.log(`✅ 加载了 ${this.users.length} 个用户和 ${this.products.length} 个产品`);
  }

  // 生成合理的订单数据
  async generateOrders() {
    console.log('🛒 生成订单数据...');
    
    // 获取所有购买行为
    const purchases = await db.allAsync(`
      SELECT ub.user_id, ub.target_id as product_id, ub.created_at, ub.metadata
      FROM user_behaviors ub
      WHERE ub.action_type = 'purchase' AND ub.target_type = 'product'
      ORDER BY ub.created_at
    `);
    
    console.log(`📦 找到 ${purchases.length} 个购买行为，开始生成订单...`);
    
    const orders = [];
    const orderItems = [];
    
    // 按用户和时间分组购买行为，模拟真实的订单场景
    const userPurchases = new Map();
    
    purchases.forEach(purchase => {
      const key = `${purchase.user_id}_${purchase.created_at.split(' ')[0]}`; // 按用户和日期分组
      if (!userPurchases.has(key)) {
        userPurchases.set(key, []);
      }
      userPurchases.get(key).push(purchase);
    });
    
    let orderCount = 0;
    
    for (const [key, userPurchaseGroup] of userPurchases) {
      // 有30%的概率将同一天的购买合并为一个订单
      if (userPurchaseGroup.length > 1 && Math.random() < 0.3) {
        // 合并订单
        const orderId = uuidv4();
        const firstPurchase = userPurchaseGroup[0];
        let totalAmount = 0;
        
        for (const purchase of userPurchaseGroup) {
          const product = this.products.find(p => p.id === purchase.product_id);
          if (product) {
            const metadata = purchase.metadata ? JSON.parse(purchase.metadata) : {};
            const quantity = metadata.quantity || 1;
            const itemTotal = product.price * quantity;
            totalAmount += itemTotal;
            
            orderItems.push({
              order_id: orderId,
              product_id: purchase.product_id,
              quantity: quantity,
              price: product.price,
              created_at: purchase.created_at
            });
          }
        }
        
        orders.push({
          id: orderId,
          user_id: firstPurchase.user_id,
          total_amount: totalAmount,
          shipping_address: this.generateShippingAddress(),
          status: this.generateOrderStatus(),
          created_at: firstPurchase.created_at,
          updated_at: firstPurchase.created_at
        });
        
        orderCount++;
      } else {
        // 单独订单
        for (const purchase of userPurchaseGroup) {
          const product = this.products.find(p => p.id === purchase.product_id);
          if (product) {
            const orderId = uuidv4();
            const metadata = purchase.metadata ? JSON.parse(purchase.metadata) : {};
            const quantity = metadata.quantity || 1;
            const totalAmount = product.price * quantity;
            
            orders.push({
              id: orderId,
              user_id: purchase.user_id,
              total_amount: totalAmount,
              shipping_address: this.generateShippingAddress(),
              status: this.generateOrderStatus(),
              created_at: purchase.created_at,
              updated_at: purchase.created_at
            });
            
            orderItems.push({
              order_id: orderId,
              product_id: purchase.product_id,
              quantity: quantity,
              price: product.price,
              created_at: purchase.created_at
            });
            
            orderCount++;
          }
        }
      }
    }
    
    console.log(`✅ 生成了 ${orders.length} 个订单，${orderItems.length} 个订单项`);
    
    // 插入订单数据
    if (orders.length > 0) {
      const orderPlaceholders = orders.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      const orderValues = orders.flatMap(o => [
        o.id, o.user_id, o.total_amount, o.shipping_address, o.status, o.created_at, o.updated_at
      ]);
      
      await db.runAsync(
        `INSERT OR IGNORE INTO orders 
         (id, user_id, total_amount, shipping_address, status, created_at, updated_at) 
         VALUES ${orderPlaceholders}`,
        orderValues
      );
    }
    
    // 插入订单项数据
    if (orderItems.length > 0) {
      const itemPlaceholders = orderItems.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const itemValues = orderItems.flatMap(i => [
        i.order_id, i.product_id, i.quantity, i.price, i.created_at
      ]);
      
      await db.runAsync(
        `INSERT OR IGNORE INTO order_items 
         (order_id, product_id, quantity, price, created_at) 
         VALUES ${itemPlaceholders}`,
        itemValues
      );
    }
    
    console.log('✅ 订单数据插入完成!');
  }

  // 生成配送地址
  generateShippingAddress() {
    const addresses = [
      '北京市朝阳区建国门外大街1号',
      '上海市浦东新区陆家嘴环路1000号',
      '广州市天河区珠江新城花城大道85号',
      '深圳市南山区科技园南区深南大道9988号',
      '杭州市西湖区文三路90号',
      '成都市高新区天府大道中段1号',
      '武汉市江汉区解放大道688号',
      '西安市雁塔区科技路10号',
      '南京市鼓楼区中山路1号',
      '重庆市渝中区解放碑步行街88号'
    ];
    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  // 生成订单状态
  generateOrderStatus() {
    const statuses = {
      'completed': 0.7,    // 70% 已完成
      'shipped': 0.15,     // 15% 已发货
      'processing': 0.1,   // 10% 处理中
      'cancelled': 0.05    // 5% 已取消
    };
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const [status, probability] of Object.entries(statuses)) {
      cumulative += probability;
      if (random <= cumulative) {
        return status;
      }
    }
    
    return 'completed';
  }

  // 优化用户行为数据的逻辑性
  async optimizeBehaviorLogic() {
    console.log('🔧 优化用户行为数据逻辑...');
    
    // 为没有浏览记录但有购买记录的产品添加浏览记录
    const orphanPurchases = await db.allAsync(`
      SELECT DISTINCT p.user_id, p.target_id, p.created_at
      FROM user_behaviors p
      WHERE p.action_type = 'purchase' 
        AND p.target_type = 'product'
        AND NOT EXISTS (
          SELECT 1 FROM user_behaviors v 
          WHERE v.user_id = p.user_id 
            AND v.target_id = p.target_id 
            AND v.action_type IN ('view', 'product_view')
            AND v.created_at <= p.created_at
        )
    `);
    
    console.log(`🔍 找到 ${orphanPurchases.length} 个需要补充浏览记录的购买行为`);
    
    const viewBehaviors = [];
    
    for (const purchase of orphanPurchases) {
      // 在购买前1-30分钟添加浏览记录
      const purchaseTime = new Date(purchase.created_at);
      const viewTime = new Date(purchaseTime.getTime() - Math.floor(Math.random() * 30 + 1) * 60 * 1000);
      
      const product = this.products.find(p => p.id === purchase.target_id);
      if (product) {
        viewBehaviors.push({
          user_id: purchase.user_id,
          action_type: 'view',
          target_type: 'product',
          target_id: purchase.target_id,
          metadata: JSON.stringify({
            product_name: product.name,
            product_price: product.price,
            session_id: uuidv4(),
            page_url: `/product/${product.id}`,
            referrer: 'direct',
            auto_generated: true
          }),
          ip_address: this.generateRandomIP(),
          user_agent: this.generateRandomUserAgent(),
          created_at: viewTime.toISOString().replace('T', ' ').slice(0, 19)
        });
      }
    }
    
    // 插入补充的浏览记录
    if (viewBehaviors.length > 0) {
      const placeholders = viewBehaviors.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = viewBehaviors.flatMap(b => [
        b.user_id, b.action_type, b.target_type, b.target_id,
        b.metadata, b.ip_address, b.user_agent, b.created_at
      ]);
      
      await db.runAsync(
        `INSERT INTO user_behaviors 
         (user_id, action_type, target_type, target_id, metadata, ip_address, user_agent, created_at) 
         VALUES ${placeholders}`,
        values
      );
      
      console.log(`✅ 添加了 ${viewBehaviors.length} 条补充浏览记录`);
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
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // 生成数据质量报告
  async generateDataQualityReport() {
    console.log('📋 生成数据质量报告...');
    
    const report = {
      totalBehaviors: 0,
      behaviorsByType: {},
      totalUsers: 0,
      activeUsers: 0,
      totalProducts: 0,
      productsWithViews: 0,
      productsWithPurchases: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      dataTimeRange: {}
    };
    
    // 基础统计
    const totalBehaviors = await db.getAsync('SELECT COUNT(*) as count FROM user_behaviors');
    report.totalBehaviors = totalBehaviors.count;
    
    const behaviorTypes = await db.allAsync(`
      SELECT action_type, COUNT(*) as count 
      FROM user_behaviors 
      GROUP BY action_type 
      ORDER BY count DESC
    `);
    report.behaviorsByType = behaviorTypes.reduce((acc, item) => {
      acc[item.action_type] = item.count;
      return acc;
    }, {});
    
    const userStats = await db.getAsync('SELECT COUNT(*) as total FROM users');
    report.totalUsers = userStats.total;
    
    const activeUserStats = await db.getAsync(`
      SELECT COUNT(DISTINCT user_id) as active 
      FROM user_behaviors 
      WHERE created_at >= datetime('now', '-30 days')
    `);
    report.activeUsers = activeUserStats.active;
    
    const productStats = await db.getAsync('SELECT COUNT(*) as total FROM products');
    report.totalProducts = productStats.total;
    
    const productsWithViews = await db.getAsync(`
      SELECT COUNT(DISTINCT target_id) as count 
      FROM user_behaviors 
      WHERE action_type IN ('view', 'product_view') AND target_type = 'product'
    `);
    report.productsWithViews = productsWithViews.count;
    
    const productsWithPurchases = await db.getAsync(`
      SELECT COUNT(DISTINCT target_id) as count 
      FROM user_behaviors 
      WHERE action_type = 'purchase' AND target_type = 'product'
    `);
    report.productsWithPurchases = productsWithPurchases.count;
    
    const orderStats = await db.getAsync('SELECT COUNT(*) as total, AVG(total_amount) as avg_value FROM orders');
    report.totalOrders = orderStats.total || 0;
    report.averageOrderValue = parseFloat((orderStats.avg_value || 0).toFixed(2));
    
    // 转化率计算
    const views = report.behaviorsByType.view || 0;
    const purchases = report.behaviorsByType.purchase || 0;
    report.conversionRate = views > 0 ? parseFloat((purchases / views * 100).toFixed(2)) : 0;
    
    // 时间范围
    const timeRange = await db.getAsync(`
      SELECT 
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM user_behaviors
    `);
    report.dataTimeRange = {
      earliest: timeRange.earliest,
      latest: timeRange.latest
    };
    
    console.log('\n📊 数据质量报告:');
    console.log('=====================================');
    console.log(`📈 总行为记录: ${report.totalBehaviors.toLocaleString()}`);
    console.log(`👥 总用户数: ${report.totalUsers}`);
    console.log(`🔥 活跃用户数 (30天): ${report.activeUsers}`);
    console.log(`📦 总产品数: ${report.totalProducts}`);
    console.log(`👀 有浏览的产品数: ${report.productsWithViews}`);
    console.log(`💰 有购买的产品数: ${report.productsWithPurchases}`);
    console.log(`🛒 总订单数: ${report.totalOrders}`);
    console.log(`💵 平均订单价值: ¥${report.averageOrderValue}`);
    console.log(`📊 转化率: ${report.conversionRate}%`);
    console.log(`⏰ 数据时间范围: ${report.dataTimeRange.earliest} 至 ${report.dataTimeRange.latest}`);
    console.log('\n🎯 行为类型分布:');
    Object.entries(report.behaviorsByType).forEach(([type, count]) => {
      const percentage = (count / report.totalBehaviors * 100).toFixed(1);
      console.log(`   ${type}: ${count.toLocaleString()} (${percentage}%)`);
    });
    console.log('=====================================\n');
    
    return report;
  }

  // 主执行函数
  async execute() {
    try {
      console.log('🚀 开始数据优化...');
      
      await this.loadData();
      await this.optimizeBehaviorLogic();
      await this.generateOrders();
      
      const report = await this.generateDataQualityReport();
      
      console.log('🎉 数据优化完成!');
      
    } catch (error) {
      console.error('❌ 数据优化时出错:', error);
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const optimizer = new DataOptimizer();
  optimizer.execute()
    .then(() => {
      console.log('✅ 数据优化脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 数据优化脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = DataOptimizer;