// scripts/validateData.js
const db = require('../config/database');

class DataValidator {
  constructor() {
    this.db = db;
    this.validationResults = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  // 添加验证结果
  addResult(type, test, result, details = '') {
    const resultObj = {
      test,
      result,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.validationResults[type].push(resultObj);
  }

  // 验证数据逻辑合理性
  async validateDataLogic() {
    console.log('🔍 验证数据逻辑合理性...');
    
    // 1. 验证购买行为必须有对应的浏览行为
    const orphanPurchases = await this.db.all(`
      SELECT COUNT(*) as count
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
    
    if (orphanPurchases && orphanPurchases.length > 0 && orphanPurchases[0].count === 0) {
      this.addResult('passed', '购买行为逻辑验证', true, '所有购买行为都有对应的浏览记录');
    } else {
      const count = orphanPurchases && orphanPurchases.length > 0 ? orphanPurchases[0].count : 0;
      this.addResult('failed', '购买行为逻辑验证', false, `发现 ${count} 个没有浏览记录的购买行为`);
    }
    
    // 2. 验证加购行为必须有对应的浏览行为
    const orphanCartAdds = await this.db.all(`
      SELECT COUNT(*) as count
      FROM user_behaviors c
      WHERE c.action_type = 'add_to_cart' 
        AND c.target_type = 'product'
        AND NOT EXISTS (
          SELECT 1 FROM user_behaviors v 
          WHERE v.user_id = c.user_id 
            AND v.target_id = c.target_id 
            AND v.action_type IN ('view', 'product_view')
            AND v.created_at <= c.created_at
        )
    `);
    
    if (orphanCartAdds && orphanCartAdds.length > 0 && orphanCartAdds[0].count === 0) {
      this.addResult('passed', '加购行为逻辑验证', true, '所有加购行为都有对应的浏览记录');
    } else {
      const count = orphanCartAdds && orphanCartAdds.length > 0 ? orphanCartAdds[0].count : 0;
      this.addResult('warnings', '加购行为逻辑验证', false, `发现 ${count} 个没有浏览记录的加购行为`);
    }
    
    // 3. 验证转化率合理性（1%-10%为合理范围）
    const conversionStats = await this.db.all(`
      SELECT 
        SUM(CASE WHEN action_type IN ('view', 'product_view') THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN action_type = 'purchase' THEN 1 ELSE 0 END) as purchases
      FROM user_behaviors 
      WHERE target_type = 'product'
    `);
    
    const views = conversionStats && conversionStats.length > 0 ? conversionStats[0].views : 0;
    const purchases = conversionStats && conversionStats.length > 0 ? conversionStats[0].purchases : 0;
    const conversionRate = views > 0 ? (purchases / views) * 100 : 0;
    
    if (conversionRate >= 1 && conversionRate <= 10) {
      this.addResult('passed', '转化率合理性验证', true, `转化率为 ${conversionRate.toFixed(2)}%，在合理范围内`);
    } else {
      this.addResult('warnings', '转化率合理性验证', false, `转化率为 ${conversionRate.toFixed(2)}%，可能不够真实`);
    }
  }

  // 验证数据完整性
  async validateDataCompleteness() {
    console.log('📊 验证数据完整性...');
    
    // 1. 验证90天数据覆盖
    const dateRange = await this.db.get(`
      SELECT 
        MIN(DATE(created_at)) as earliest_date,
        MAX(DATE(created_at)) as latest_date,
        COUNT(DISTINCT DATE(created_at)) as unique_days
      FROM user_behaviors
    `);
    
    if (dateRange && dateRange.earliest_date && dateRange.latest_date) {
      const daysDiff = Math.floor((new Date(dateRange.latest_date) - new Date(dateRange.earliest_date)) / (1000 * 60 * 60 * 24)) + 1;
      
      if (daysDiff >= 90) {
        this.addResult('passed', '数据时间覆盖验证', true, `数据覆盖 ${daysDiff} 天，包含 ${dateRange.unique_days} 个不同日期`);
      } else {
        this.addResult('failed', '数据时间覆盖验证', false, `数据只覆盖 ${daysDiff} 天，少于90天`);
      }
    } else {
      this.addResult('failed', '数据时间覆盖验证', false, '无法获取数据时间范围');
    }
    
    // 2. 验证用户活跃度分布
    const userActivity = await this.db.all(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_behaviors
      FROM user_behaviors
    `);
    
    const totalBehaviors = userActivity && userActivity.length > 0 ? userActivity[0].total_behaviors : 0;
    const activeUsers = userActivity && userActivity.length > 0 ? userActivity[0].active_users : 0;
    const avgBehaviorsPerUser = activeUsers > 0 ? totalBehaviors / activeUsers : 0;
    
    if (avgBehaviorsPerUser >= 10 && avgBehaviorsPerUser <= 500) {
      this.addResult('passed', '用户活跃度验证', true, `平均每用户 ${avgBehaviorsPerUser.toFixed(1)} 个行为，分布合理`);
    } else {
      this.addResult('warnings', '用户活跃度验证', false, `平均每用户 ${avgBehaviorsPerUser.toFixed(1)} 个行为，可能不够真实`);
    }
    
    // 3. 验证产品覆盖度
    const productCoverage = await this.db.all(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT ub.target_id) as products_with_behaviors
      FROM products p
      LEFT JOIN user_behaviors ub ON p.id = ub.target_id AND ub.target_type = 'product'
    `);
    
    const totalProducts = productCoverage && productCoverage.length > 0 ? productCoverage[0].total_products : 0;
    const productsWithBehaviors = productCoverage && productCoverage.length > 0 ? productCoverage[0].products_with_behaviors : 0;
    const coverageRate = totalProducts > 0 ? (productsWithBehaviors / totalProducts) * 100 : 0;
    
    if (coverageRate >= 80) {
      this.addResult('passed', '产品覆盖度验证', true, `${coverageRate.toFixed(1)}% 的产品有用户行为数据`);
    } else {
      this.addResult('warnings', '产品覆盖度验证', false, `只有 ${coverageRate.toFixed(1)}% 的产品有用户行为数据`);
    }
  }

  // 验证数据分布合理性
  async validateDataDistribution() {
    console.log('📈 验证数据分布合理性...');
    
    // 1. 验证行为类型分布
    const actionDistribution = await this.db.all(`
      SELECT 
        action_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_behaviors), 2) as percentage
      FROM user_behaviors
      GROUP BY action_type
      ORDER BY count DESC
    `);
    
    // 验证浏览行为占比最高
    const actionArray = Array.isArray(actionDistribution) ? actionDistribution : [];
    const viewActions = actionArray.filter(a => a.action_type === 'view' || a.action_type === 'product_view');
    const totalViewPercentage = viewActions.reduce((sum, a) => sum + a.percentage, 0);
    
    if (totalViewPercentage >= 30) {
      this.addResult('passed', '行为类型分布验证', true, `浏览行为占比 ${totalViewPercentage}%，符合预期`);
    } else {
      this.addResult('warnings', '行为类型分布验证', false, `浏览行为占比只有 ${totalViewPercentage}%，可能偏低`);
    }
    
    // 2. 验证时间分布（工作日vs周末）
    const timeDistribution = await this.db.all(`
      SELECT 
        CASE 
          WHEN strftime('%w', created_at) IN ('0', '6') THEN 'weekend'
          ELSE 'weekday'
        END as day_type,
        COUNT(*) as count
      FROM user_behaviors
      GROUP BY day_type
    `);
    
    const timeArray = Array.isArray(timeDistribution) ? timeDistribution : [];
    const weekdayCount = timeArray.find(t => t.day_type === 'weekday')?.count || 0;
    const weekendCount = timeArray.find(t => t.day_type === 'weekend')?.count || 0;
    const weekdayRatio = weekdayCount / (weekdayCount + weekendCount);
    
    if (weekdayRatio >= 0.6 && weekdayRatio <= 0.8) {
      this.addResult('passed', '时间分布验证', true, `工作日行为占比 ${(weekdayRatio * 100).toFixed(1)}%，分布合理`);
    } else {
      this.addResult('warnings', '时间分布验证', false, `工作日行为占比 ${(weekdayRatio * 100).toFixed(1)}%，可能不够真实`);
    }
    
    // 3. 验证订单数据一致性
    const orderStats = await this.db.get(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(DISTINCT user_id || '-' || DATE(created_at)) FROM user_behaviors WHERE action_type = 'purchase') as purchase_sessions
    `);
    
    const totalOrders = orderStats ? orderStats.total_orders : 0;
    const purchaseSessions = orderStats ? orderStats.purchase_sessions : 0;
    const orderRatio = purchaseSessions > 0 ? totalOrders / purchaseSessions : 0;
    
    if (orderRatio >= 0.8 && orderRatio <= 1.2) {
      this.addResult('passed', '订单数据一致性验证', true, `订单与购买行为比例 ${orderRatio.toFixed(2)}，数据一致`);
    } else {
      this.addResult('warnings', '订单数据一致性验证', false, `订单与购买行为比例 ${orderRatio.toFixed(2)}，可能存在不一致`);
    }
  }

  // 验证数据质量指标
  async validateDataQuality() {
    console.log('⭐ 验证数据质量指标...');
    
    // 1. 验证数据量级
    const totalBehaviors = await this.db.get('SELECT COUNT(*) as count FROM user_behaviors');
    
    const behaviorCount = totalBehaviors && typeof totalBehaviors.count === 'number' ? totalBehaviors.count : 0;
    const formattedCount = behaviorCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (behaviorCount >= 50000) {
      this.addResult('passed', '数据量级验证', true, `总行为记录 ${formattedCount} 条，数据量充足`);
    } else {
      this.addResult('warnings', '数据量级验证', false, `总行为记录只有 ${formattedCount} 条，可能偏少`);
    }
    
    // 2. 验证元数据完整性
    const metadataCompleteness = await this.db.all(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN metadata IS NOT NULL AND metadata != '' THEN 1 END) as with_metadata
      FROM user_behaviors
    `);
    
    const withMetadata = metadataCompleteness && metadataCompleteness.length > 0 ? metadataCompleteness[0].with_metadata : 0;
    const totalRecords = metadataCompleteness && metadataCompleteness.length > 0 ? metadataCompleteness[0].total : 0;
    const metadataRate = totalRecords > 0 ? (withMetadata / totalRecords) * 100 : 0;
    
    if (metadataRate >= 90) {
      this.addResult('passed', '元数据完整性验证', true, `${metadataRate.toFixed(1)}% 的记录包含元数据`);
    } else {
      this.addResult('warnings', '元数据完整性验证', false, `只有 ${metadataRate.toFixed(1)}% 的记录包含元数据`);
    }
    
    // 3. 验证用户分布
    const userDistribution = await this.db.all(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        (SELECT COUNT(*) FROM users) as total_users
      FROM user_behaviors
    `);
    
    const activeUsersCount = userDistribution && userDistribution.length > 0 ? userDistribution[0].active_users : 0;
    const totalUsersCount = userDistribution && userDistribution.length > 0 ? userDistribution[0].total_users : 0;
    const userActiveRate = totalUsersCount > 0 ? (activeUsersCount / totalUsersCount) * 100 : 0;
    
    if (userActiveRate >= 80) {
      this.addResult('passed', '用户活跃率验证', true, `${userActiveRate.toFixed(1)}% 的用户有行为数据`);
    } else {
      this.addResult('warnings', '用户活跃率验证', false, `只有 ${userActiveRate.toFixed(1)}% 的用户有行为数据`);
    }
  }

  // 生成详细的验证报告
  async generateDetailedReport() {
    console.log('📋 生成详细验证报告...');
    
    // 获取详细统计数据
    const stats = {
      behaviors: await this.db.all(`
        SELECT 
          action_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT target_id) as unique_targets
        FROM user_behaviors
        GROUP BY action_type
        ORDER BY count DESC
      `),
      
      dailyStats: await this.db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as behaviors,
          COUNT(DISTINCT user_id) as active_users
        FROM user_behaviors
        WHERE created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 10
      `),
      
      topProducts: await this.db.all(`
        SELECT 
          ub.target_id,
          p.name,
          COUNT(*) as total_interactions,
          SUM(CASE WHEN ub.action_type IN ('view', 'product_view') THEN 1 ELSE 0 END) as views,
          SUM(CASE WHEN ub.action_type = 'purchase' THEN 1 ELSE 0 END) as purchases
        FROM user_behaviors ub
        JOIN products p ON ub.target_id = p.id
        WHERE ub.target_type = 'product'
        GROUP BY ub.target_id, p.name
        ORDER BY total_interactions DESC
        LIMIT 10
      `),
      
      orderStats: await this.db.get(`
        SELECT 
          COUNT(*) as total_orders,
          AVG(total_amount) as avg_order_value,
          MIN(total_amount) as min_order_value,
          MAX(total_amount) as max_order_value
        FROM orders
      `)
    };
    
    return stats;
  }

  // 打印验证结果
  printResults() {
    console.log('\n🎯 数据验证结果汇总:');
    console.log('=====================================');
    
    console.log(`✅ 通过测试: ${this.validationResults.passed.length}`);
    this.validationResults.passed.forEach(result => {
      console.log(`   ✓ ${result.test}: ${result.details}`);
    });
    
    if (this.validationResults.warnings.length > 0) {
      console.log(`\n⚠️  警告项目: ${this.validationResults.warnings.length}`);
      this.validationResults.warnings.forEach(result => {
        console.log(`   ⚠ ${result.test}: ${result.details}`);
      });
    }
    
    if (this.validationResults.failed.length > 0) {
      console.log(`\n❌ 失败测试: ${this.validationResults.failed.length}`);
      this.validationResults.failed.forEach(result => {
        console.log(`   ✗ ${result.test}: ${result.details}`);
      });
    }
    
    console.log('=====================================');
    
    // 计算总体评分
    const totalTests = this.validationResults.passed.length + this.validationResults.warnings.length + this.validationResults.failed.length;
    const score = ((this.validationResults.passed.length + this.validationResults.warnings.length * 0.5) / totalTests * 100).toFixed(1);
    
    console.log(`\n📊 数据质量评分: ${score}/100`);
    
    if (score >= 90) {
      console.log('🎉 数据质量优秀！');
    } else if (score >= 75) {
      console.log('👍 数据质量良好！');
    } else if (score >= 60) {
      console.log('⚠️  数据质量一般，建议优化。');
    } else {
      console.log('❌ 数据质量较差，需要重新生成。');
    }
  }

  // 主执行函数
  async execute() {
    try {
      console.log('🔍 开始数据验证...');
      
      await this.validateDataLogic();
      await this.validateDataCompleteness();
      await this.validateDataDistribution();
      await this.validateDataQuality();
      
      const detailedStats = await this.generateDetailedReport();
      
      this.printResults();
      
      console.log('\n📈 详细统计信息:');
      console.log('=====================================');
      console.log('🎯 行为类型统计:');
      if (Array.isArray(detailedStats.behaviors)) {
        detailedStats.behaviors.forEach(b => {
          const formattedCount = b.count ? b.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
          console.log(`   ${b.action_type}: ${formattedCount} 次 (${b.unique_users || 0} 用户, ${b.unique_targets || 0} 目标)`);
        });
      }
      
      console.log('\n📅 最近10天活跃度:');
      if (Array.isArray(detailedStats.dailyStats)) {
        detailedStats.dailyStats.forEach(d => {
          console.log(`   ${d.date}: ${d.behaviors || 0} 行为, ${d.active_users || 0} 活跃用户`);
        });
      }
      
      console.log('\n🔥 热门产品TOP10:');
      if (Array.isArray(detailedStats.topProducts)) {
        detailedStats.topProducts.forEach((p, index) => {
          const conversionRate = p.views > 0 ? (p.purchases / p.views * 100).toFixed(1) : '0.0';
          console.log(`   ${index + 1}. ${p.name || '未知产品'}: ${p.total_interactions || 0} 交互 (${p.views || 0} 浏览, ${p.purchases || 0} 购买, ${conversionRate}% 转化)`);
        });
      }
      
      if (detailedStats.orderStats) {
        console.log('\n💰 订单统计:');
        console.log(`   总订单数: ${detailedStats.orderStats.total_orders}`);
        console.log(`   平均订单价值: ¥${detailedStats.orderStats.avg_order_value?.toFixed(2) || 0}`);
        console.log(`   订单价值范围: ¥${detailedStats.orderStats.min_order_value?.toFixed(2) || 0} - ¥${detailedStats.orderStats.max_order_value?.toFixed(2) || 0}`);
      }
      
      console.log('=====================================');
      
      console.log('\n✅ 数据验证完成!');
      
    } catch (error) {
      console.error('❌ 数据验证时出错:', error);
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const validator = new DataValidator();
  validator.execute()
    .then(() => {
      console.log('✅ 数据验证脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 数据验证脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = DataValidator;