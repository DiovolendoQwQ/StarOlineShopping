const db = require('./config/database');
const fs = require('fs');
const path = require('path');

class DataValidator {
  constructor() {
    this.db = db;
  }

  // 数据逻辑合理性验证
  async validateDataLogic() {
    console.log('\n🔍 验证数据逻辑合理性...');
    const results = {};

    try {
      // 检查孤立的购买行为（没有浏览记录的购买）
      const orphanPurchases = await this.db.allAsync(`
        SELECT COUNT(*) as count FROM user_behaviors ub1
        WHERE ub1.action_type = 'purchase'
        AND NOT EXISTS (
          SELECT 1 FROM user_behaviors ub2
          WHERE ub2.user_id = ub1.user_id
          AND ub2.target_id = ub1.target_id
          AND ub2.action_type = 'view'
          AND ub2.created_at <= ub1.created_at
        )
      `);

      // 检查孤立的加购物车行为
      const orphanCartAdds = await this.db.allAsync(`
        SELECT COUNT(*) as count FROM user_behaviors ub1
        WHERE ub1.action_type = 'add_to_cart'
        AND NOT EXISTS (
          SELECT 1 FROM user_behaviors ub2
          WHERE ub2.user_id = ub1.user_id
          AND ub2.target_id = ub1.target_id
          AND ub2.action_type = 'view'
          AND ub2.created_at <= ub1.created_at
        )
      `);

      // 计算转化率
      const conversionStats = await this.db.allAsync(`
        SELECT 
          (SELECT COUNT(DISTINCT user_id) FROM user_behaviors WHERE action_type = 'purchase') as purchasers,
          (SELECT COUNT(DISTINCT user_id) FROM user_behaviors WHERE action_type = 'view') as viewers
      `);

      const orphanPurchaseCount = orphanPurchases && orphanPurchases[0] ? orphanPurchases[0].count || 0 : 0;
      const orphanCartCount = orphanCartAdds && orphanCartAdds[0] ? orphanCartAdds[0].count || 0 : 0;
      const purchasers = conversionStats && conversionStats[0] ? conversionStats[0].purchasers || 0 : 0;
      const viewers = conversionStats && conversionStats[0] ? conversionStats[0].viewers || 0 : 0;
      const conversionRate = viewers > 0 ? (purchasers / viewers * 100) : 0;

      results.orphanPurchases = {
        count: orphanPurchaseCount,
        status: orphanPurchaseCount < 100 ? '✅ 通过' : '⚠️ 警告',
        message: `孤立购买行为: ${orphanPurchaseCount} 条`
      };

      results.orphanCartAdds = {
        count: orphanCartCount,
        status: orphanCartCount < 200 ? '✅ 通过' : '⚠️ 警告',
        message: `孤立加购行为: ${orphanCartCount} 条`
      };

      results.conversionRate = {
        rate: conversionRate,
        status: conversionRate >= 5 && conversionRate <= 50 ? '✅ 通过' : '⚠️ 警告',
        message: `转化率: ${conversionRate.toFixed(2)}% (${purchasers}/${viewers})`
      };

    } catch (error) {
      console.error('❌ 数据逻辑验证失败:', error.message);
      results.error = error.message;
    }

    return results;
  }

  // 数据完整性验证
  async validateDataCompleteness() {
    console.log('\n📊 验证数据完整性...');
    const results = {};

    try {
      // 检查数据时间范围
      const dateRange = await this.db.allAsync(`
        SELECT 
          MIN(DATE(created_at)) as start_date,
          MAX(DATE(created_at)) as end_date,
          COUNT(DISTINCT DATE(created_at)) as unique_days
        FROM user_behaviors
      `);

      // 检查用户活跃度
      const userActivity = await this.db.allAsync(`
        SELECT 
          COUNT(DISTINCT user_id) as active_users,
          AVG(behavior_count) as avg_behaviors_per_user
        FROM (
          SELECT user_id, COUNT(*) as behavior_count
          FROM user_behaviors
          GROUP BY user_id
        )
      `);

      // 检查产品覆盖度
      const productCoverage = await this.db.allAsync(`
        SELECT 
          COUNT(DISTINCT ub.target_id) as products_with_behaviors,
          (SELECT COUNT(*) FROM products) as total_products
        FROM user_behaviors ub
        WHERE ub.target_type = 'product'
      `);

      const dateInfo = dateRange && dateRange[0] ? dateRange[0] : {};
      const userInfo = userActivity && userActivity[0] ? userActivity[0] : {};
      const productInfo = productCoverage && productCoverage[0] ? productCoverage[0] : {};

      const uniqueDays = dateInfo.unique_days || 0;
      const activeUsers = userInfo.active_users || 0;
      const avgBehaviors = userInfo.avg_behaviors_per_user || 0;
      const productsWithBehaviors = productInfo.products_with_behaviors || 0;
      const totalProducts = productInfo.total_products || 0;
      const productCoverageRate = totalProducts > 0 ? (productsWithBehaviors / totalProducts * 100) : 0;

      results.dateRange = {
        days: uniqueDays,
        start: dateInfo.start_date || 'N/A',
        end: dateInfo.end_date || 'N/A',
        status: uniqueDays >= 80 ? '✅ 通过' : '⚠️ 警告',
        message: `数据覆盖 ${uniqueDays} 天 (${dateInfo.start_date} 至 ${dateInfo.end_date})`
      };

      results.userActivity = {
        activeUsers: activeUsers,
        avgBehaviors: avgBehaviors,
        status: activeUsers >= 200 && avgBehaviors >= 50 ? '✅ 通过' : '⚠️ 警告',
        message: `${activeUsers} 活跃用户，平均每用户 ${avgBehaviors.toFixed(1)} 行为`
      };

      results.productCoverage = {
        coverage: productCoverageRate,
        status: productCoverageRate >= 80 ? '✅ 通过' : '⚠️ 警告',
        message: `产品覆盖率: ${productCoverageRate.toFixed(1)}% (${productsWithBehaviors}/${totalProducts})`
      };

    } catch (error) {
      console.error('❌ 数据完整性验证失败:', error.message);
      results.error = error.message;
    }

    return results;
  }

  // 数据分布合理性验证
  async validateDataDistribution() {
    console.log('\n📈 验证数据分布合理性...');
    const results = {};

    try {
      // 行为类型分布
      const actionDistribution = await this.db.allAsync(`
        SELECT action_type, COUNT(*) as count
        FROM user_behaviors
        GROUP BY action_type
        ORDER BY count DESC
      `);

      // 时间分布（工作日 vs 周末）
      const timeDistribution = await this.db.allAsync(`
        SELECT 
          CASE 
            WHEN CAST(strftime('%w', created_at) AS INTEGER) IN (0, 6) THEN 'weekend'
            ELSE 'weekday'
          END as day_type,
          COUNT(*) as count
        FROM user_behaviors
        GROUP BY day_type
      `);

      // 订单数据一致性
      const orderStats = await this.db.getAsync(`
        SELECT 
          (SELECT COUNT(*) FROM orders) as total_orders,
          (SELECT COUNT(*) FROM user_behaviors WHERE action_type = 'purchase') as purchase_behaviors
      `);

      const actionDist = Array.isArray(actionDistribution) ? actionDistribution : [];
      const timeDist = Array.isArray(timeDistribution) ? timeDistribution : [];
      const orderInfo = orderStats || {};

      // 计算行为分布
      const totalBehaviors = actionDist.reduce((sum, item) => sum + (item.count || 0), 0);
      const viewRatio = actionDist.find(item => item.action_type === 'view')?.count || 0;
      const purchaseRatio = actionDist.find(item => item.action_type === 'purchase')?.count || 0;
      
      // 计算时间分布
      const weekdayCount = timeDist.find(item => item.day_type === 'weekday')?.count || 0;
      const weekendCount = timeDist.find(item => item.day_type === 'weekend')?.count || 0;
      const totalTimeCount = weekdayCount + weekendCount;
      const weekdayRatio = totalTimeCount > 0 ? (weekdayCount / totalTimeCount * 100) : 0;

      // 订单一致性
      const totalOrders = orderInfo.total_orders || 0;
      const purchaseBehaviors = orderInfo.purchase_behaviors || 0;
      const orderRatio = purchaseBehaviors > 0 ? (totalOrders / purchaseBehaviors) : 0;

      results.actionDistribution = {
        data: actionDist,
        viewRatio: totalBehaviors > 0 ? (viewRatio / totalBehaviors * 100) : 0,
        purchaseRatio: totalBehaviors > 0 ? (purchaseRatio / totalBehaviors * 100) : 0,
        status: viewRatio > purchaseRatio ? '✅ 通过' : '⚠️ 警告',
        message: `浏览:购买 = ${viewRatio}:${purchaseRatio}`
      };

      results.timeDistribution = {
        weekdayRatio: weekdayRatio,
        status: weekdayRatio >= 60 && weekdayRatio <= 80 ? '✅ 通过' : '⚠️ 警告',
        message: `工作日行为占比: ${weekdayRatio.toFixed(1)}%`
      };

      results.orderConsistency = {
        ratio: orderRatio,
        status: orderRatio >= 0.8 && orderRatio <= 1.2 ? '✅ 通过' : '❌ 失败',
        message: `订单与购买行为比例: ${orderRatio.toFixed(2)} (${totalOrders}/${purchaseBehaviors})`
      };

    } catch (error) {
      console.error('❌ 数据分布验证失败:', error.message);
      results.error = error.message;
    }

    return results;
  }

  // 数据质量指标验证
  async validateDataQuality() {
    console.log('\n🎯 验证数据质量指标...');
    const results = {};

    try {
      // 总体数据量
      const totalBehaviors = await this.db.getAsync(`
        SELECT COUNT(*) as count FROM user_behaviors
      `);

      // 元数据完整性
      const metadataCompleteness = await this.db.allAsync(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN metadata IS NOT NULL AND metadata != '' THEN 1 END) as with_metadata
        FROM user_behaviors
      `);

      // 用户分布
      const userDistribution = await this.db.allAsync(`
        SELECT 
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) as total_behaviors
        FROM user_behaviors
      `);

      const behaviorCount = totalBehaviors && totalBehaviors.count ? totalBehaviors.count : 0;
      const metaInfo = metadataCompleteness && metadataCompleteness[0] ? metadataCompleteness[0] : {};
      const userInfo = userDistribution && userDistribution[0] ? userDistribution[0] : {};

      const metaTotal = metaInfo.total || 0;
      const metaWithData = metaInfo.with_metadata || 0;
      const metaCompleteness = metaTotal > 0 ? (metaWithData / metaTotal * 100) : 0;

      const uniqueUsers = userInfo.unique_users || 0;
      const totalUserBehaviors = userInfo.total_behaviors || 0;
      const avgBehaviorsPerUser = uniqueUsers > 0 ? (totalUserBehaviors / uniqueUsers) : 0;

      // 格式化数字的辅助函数
      const formatNumber = (num) => {
        if (typeof num === 'number') {
          return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        return '0';
      };

      results.dataVolume = {
        count: behaviorCount,
        status: behaviorCount >= 50000 ? '✅ 通过' : '⚠️ 警告',
        message: `总行为记录: ${formatNumber(behaviorCount)} 条`
      };

      results.metadataCompleteness = {
        percentage: metaCompleteness,
        status: metaCompleteness >= 80 ? '✅ 通过' : '⚠️ 警告',
        message: `元数据完整性: ${metaCompleteness.toFixed(1)}%`
      };

      results.userEngagement = {
        avgBehaviors: avgBehaviorsPerUser,
        status: avgBehaviorsPerUser >= 50 ? '✅ 通过' : '⚠️ 警告',
        message: `用户活跃率: 平均每用户 ${avgBehaviorsPerUser.toFixed(1)} 行为`
      };

    } catch (error) {
      console.error('❌ 数据质量验证失败:', error.message);
      results.error = error.message;
    }

    return results;
  }

  // 计算总体评分
  calculateOverallScore(logicResults, completenessResults, distributionResults, qualityResults) {
    let score = 0;
    let maxScore = 0;

    // 逻辑合理性 (25分)
    maxScore += 25;
    if (logicResults.orphanPurchases?.status === '✅ 通过') score += 8;
    if (logicResults.orphanCartAdds?.status === '✅ 通过') score += 8;
    if (logicResults.conversionRate?.status === '✅ 通过') score += 9;

    // 数据完整性 (25分)
    maxScore += 25;
    if (completenessResults.dateRange?.status === '✅ 通过') score += 8;
    if (completenessResults.userActivity?.status === '✅ 通过') score += 8;
    if (completenessResults.productCoverage?.status === '✅ 通过') score += 9;

    // 分布合理性 (25分)
    maxScore += 25;
    if (distributionResults.actionDistribution?.status === '✅ 通过') score += 8;
    if (distributionResults.timeDistribution?.status === '✅ 通过') score += 8;
    if (distributionResults.orderConsistency?.status === '✅ 通过') score += 9;

    // 质量指标 (25分)
    maxScore += 25;
    if (qualityResults.dataVolume?.status === '✅ 通过') score += 8;
    if (qualityResults.metadataCompleteness?.status === '✅ 通过') score += 8;
    if (qualityResults.userEngagement?.status === '✅ 通过') score += 9;

    return Math.round((score / maxScore) * 100);
  }

  // 生成详细报告
  async generateDetailedReport() {
    console.log('\n📋 生成详细数据报告...');
    
    try {
      // 行为统计
      const behaviors = await this.db.allAsync(`
        SELECT action_type, COUNT(*) as count
        FROM user_behaviors
        GROUP BY action_type
        ORDER BY count DESC
      `);

      // 每日统计
      const dailyStats = await this.db.allAsync(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as behaviors,
          COUNT(DISTINCT user_id) as active_users
        FROM user_behaviors
        WHERE DATE(created_at) >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
      `);

      // 热门产品
      const topProducts = await this.db.allAsync(`
        SELECT 
          ub.target_id as product_id,
          p.name as product_name,
          COUNT(*) as interaction_count
        FROM user_behaviors ub
        LEFT JOIN products p ON ub.target_id = p.id
        WHERE ub.target_type = 'product'
        GROUP BY ub.target_id, p.name
        ORDER BY interaction_count DESC
        LIMIT 10
      `);

      const detailedStats = {
        behaviors: Array.isArray(behaviors) ? behaviors : [],
        dailyStats: Array.isArray(dailyStats) ? dailyStats : [],
        topProducts: Array.isArray(topProducts) ? topProducts : []
      };

      console.log('\n📊 详细统计信息:');
      console.log('\n行为类型分布:');
      detailedStats.behaviors.forEach(b => {
        const count = b.count || 0;
        const formattedCount = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        console.log(`  ${b.action_type}: ${formattedCount} 次`);
      });

      console.log('\n最近7天每日统计:');
      detailedStats.dailyStats.forEach(d => {
        const behaviors = d.behaviors || 0;
        const users = d.active_users || 0;
        console.log(`  ${d.date}: ${behaviors} 行为, ${users} 活跃用户`);
      });

      console.log('\n热门产品 (Top 10):');
      detailedStats.topProducts.forEach((p, index) => {
        const interactions = p.interaction_count || 0;
        const productName = p.product_name || `产品 ${p.product_id}`;
        console.log(`  ${index + 1}. ${productName}: ${interactions} 次交互`);
      });

      return detailedStats;

    } catch (error) {
      console.error('❌ 生成详细报告失败:', error.message);
      return { error: error.message };
    }
  }

  // 主验证方法
  async validate() {
    console.log('🚀 开始数据验证...');
    console.log('=' .repeat(60));

    const logicResults = await this.validateDataLogic();
    const completenessResults = await this.validateDataCompleteness();
    const distributionResults = await this.validateDataDistribution();
    const qualityResults = await this.validateDataQuality();
    const detailedStats = await this.generateDetailedReport();

    // 计算总评分
    const overallScore = this.calculateOverallScore(
      logicResults, 
      completenessResults, 
      distributionResults, 
      qualityResults
    );

    // 输出结果
    console.log('\n' + '=' .repeat(60));
    console.log('📊 数据验证结果汇总');
    console.log('=' .repeat(60));

    console.log('\n🔍 数据逻辑合理性:');
    Object.values(logicResults).forEach(result => {
      if (result.message) console.log(`  ${result.status} ${result.message}`);
    });

    console.log('\n📊 数据完整性:');
    Object.values(completenessResults).forEach(result => {
      if (result.message) console.log(`  ${result.status} ${result.message}`);
    });

    console.log('\n📈 数据分布合理性:');
    Object.values(distributionResults).forEach(result => {
      if (result.message) console.log(`  ${result.status} ${result.message}`);
    });

    console.log('\n🎯 数据质量指标:');
    Object.values(qualityResults).forEach(result => {
      if (result.message) console.log(`  ${result.status} ${result.message}`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log(`🏆 总体数据质量评分: ${overallScore}/100`);
    
    if (overallScore >= 80) {
      console.log('✅ 数据质量优秀，可以用于分析');
    } else if (overallScore >= 60) {
      console.log('⚠️ 数据质量良好，建议优化部分指标');
    } else {
      console.log('❌ 数据质量较差，建议重新生成数据');
    }
    
    console.log('=' .repeat(60));

    return {
      score: overallScore,
      logic: logicResults,
      completeness: completenessResults,
      distribution: distributionResults,
      quality: qualityResults,
      detailed: detailedStats
    };
  }
}

// 运行验证
if (require.main === module) {
  const validator = new DataValidator();
  validator.validate()
    .then(results => {
      console.log('\n✅ 数据验证完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 验证过程出错:', error);
      process.exit(1);
    });
}

module.exports = DataValidator;