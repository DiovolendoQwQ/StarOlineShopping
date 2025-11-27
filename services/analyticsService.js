// services/analyticsService.js
const db = require('../config/database');
const UserBehavior = require('../models/UserBehavior');
const UserPreference = require('../models/UserPreference');

// 数据分析服务
const AnalyticsService = {
  // 生成每日数据汇总
  generateDailySummary: async (date = null) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      // 用户活跃度
      const userActivity = await db.getAsync(
        `SELECT 
           COUNT(DISTINCT user_id) as active_users,
           COUNT(*) as total_actions
         FROM user_behaviors 
         WHERE DATE(created_at) = ?`,
        [targetDate]
      );
      
      // 产品浏览统计
      const productViews = await db.getAsync(
        `SELECT COUNT(*) as total_views
         FROM user_behaviors 
         WHERE action_type = 'view' AND target_type = 'product' AND DATE(created_at) = ?`,
        [targetDate]
      );
      
      // 购物车添加统计
      const cartAdds = await db.getAsync(
        `SELECT COUNT(*) as total_cart_adds
         FROM user_behaviors 
         WHERE action_type = 'add_to_cart' AND DATE(created_at) = ?`,
        [targetDate]
      );
      
      // 订单统计
      const orders = await db.getAsync(
        `SELECT 
           COUNT(*) as total_orders,
           COALESCE(SUM(total_amount), 0) as total_revenue
         FROM orders 
         WHERE DATE(created_at) = ?`,
        [targetDate]
      );
      
      // 订单项统计（获取总数量）
      const orderItems = await db.getAsync(
        `SELECT 
           COALESCE(SUM(oi.quantity), 0) as total_quantity
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE DATE(o.created_at) = ?`,
        [targetDate]
      );
      
      const summary = {
        date: targetDate,
        active_users: userActivity?.active_users || 0,
        total_actions: userActivity?.total_actions || 0,
        product_views: productViews?.total_views || 0,
        cart_adds: cartAdds?.total_cart_adds || 0,
        total_orders: orders?.total_orders || 0,
        total_quantity: orderItems?.total_quantity || 0,
        total_revenue: orders?.total_revenue || 0
      };
      
      // 保存到汇总表
      await AnalyticsService.saveSummaryMetrics(targetDate, summary);
      
      return summary;
    } catch (error) {
      console.error('生成每日汇总失败:', error);
      throw error;
    }
  },

  // 保存汇总指标
  saveSummaryMetrics: async (date, metrics) => {
    const metricTypes = [
      'active_users', 'total_actions', 'product_views', 
      'cart_adds', 'total_orders', 'total_quantity', 'total_revenue'
    ];
    
    for (const metricType of metricTypes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO analytics_summary 
         (date, metric_type, metric_value) VALUES (?, ?, ?)`,
        [date, metricType, metrics[metricType] || 0]
      );
    }
  },

  // 获取趋势分析
  getTrendAnalysis: async (days = 30) => {
    try {
      const trends = await db.allAsync(
        `SELECT 
           date,
           metric_type,
           metric_value
         FROM analytics_summary 
         WHERE date >= date('now', '-' || ? || ' days')
         ORDER BY date ASC, metric_type`,
        [days]
      );
      
      // 按指标类型分组
      const groupedTrends = {};
      trends.forEach(trend => {
        if (!groupedTrends[trend.metric_type]) {
          groupedTrends[trend.metric_type] = [];
        }
        groupedTrends[trend.metric_type].push({
          date: trend.date,
          value: trend.metric_value
        });
      });
      
      // 返回前端期望的格式
      return {
        active_users: groupedTrends.active_users || [],
        orders: groupedTrends.total_orders || [],
        revenue: groupedTrends.total_revenue || [],
        views: groupedTrends.product_views || [],
        cart_adds: groupedTrends.cart_adds || []
      };
    } catch (error) {
      console.error('获取趋势分析失败:', error);
      // 如果数据库中没有数据，返回空的趋势数据
      return {
        active_users: [],
        orders: [],
        revenue: [],
        views: [],
        cart_adds: []
      };
    }
  },

  // 获取用户行为洞察
  getUserBehaviorInsights: async (days = 7) => {
    // 行为类型分布
    const actionStats = await UserBehavior.getActionTypeStats(days);
    
    // 热门产品
    const popularProducts = await UserBehavior.getPopularProducts(10, days);
    
    // 用户活跃度
    const userActivity = await UserBehavior.getUserActivity(days);
    
    // 转化率分析
    const conversionData = await db.getAsync(
      `SELECT 
         COUNT(CASE WHEN action_type = 'view' THEN 1 END) as views,
         COUNT(CASE WHEN action_type = 'add_to_cart' THEN 1 END) as cart_adds,
         COUNT(CASE WHEN action_type = 'purchase' THEN 1 END) as purchases
       FROM user_behaviors 
       WHERE target_type = 'product' 
         AND created_at >= datetime('now', '-' || ? || ' days')`,
      [days]
    );
    
    const viewToCartRate = conversionData.views > 0 ? 
      (conversionData.cart_adds / conversionData.views * 100).toFixed(2) : 0;
    const cartToPurchaseRate = conversionData.cart_adds > 0 ? 
      (conversionData.purchases / conversionData.cart_adds * 100).toFixed(2) : 0;
    const viewToPurchaseRate = conversionData.views > 0 ? 
      (conversionData.purchases / conversionData.views * 100).toFixed(2) : 0;
    
    return {
      actionStats,
      popularProducts,
      userActivity,
      conversionRates: {
        viewToCart: parseFloat(viewToCartRate),
        cartToPurchase: parseFloat(cartToPurchaseRate),
        viewToPurchase: parseFloat(viewToPurchaseRate)
      },
      rawConversionData: conversionData
    };
  },

  // 获取产品性能分析
  getProductPerformance: async (days = 30) => {
    const performance = await db.allAsync(
      `SELECT 
         p.id,
         p.name,
         p.price,
         p.stock,
         COALESCE(views.view_count, 0) as views,
         COALESCE(carts.cart_count, 0) as cart_adds,
         COALESCE(purchases.purchase_count, 0) as purchases,
         COALESCE(purchases.purchase_revenue, 0) as revenue,
         (
           SELECT AVG(up.weight) 
           FROM user_preferences up 
           WHERE up.preference_type = 'category' 
           AND (
             (p.name LIKE '%' || up.preference_value || '%') OR
             (up.preference_value = '手机' AND p.name LIKE '%手机%') OR
             (up.preference_value = '电脑' AND p.name LIKE '%电脑%') OR
             (up.preference_value = '耳机' AND p.name LIKE '%耳机%') OR
             (up.preference_value = '充电器' AND p.name LIKE '%充电器%') OR
             (up.preference_value = '音响' AND p.name LIKE '%音响%') OR
             (up.preference_value = '平板' AND p.name LIKE '%平板%') OR
             (up.preference_value = '数据线' AND p.name LIKE '%数据线%') OR
             (up.preference_value = '键盘' AND p.name LIKE '%键盘%') OR
             (up.preference_value = '鼠标' AND p.name LIKE '%鼠标%') OR
             (up.preference_value = '显示器' AND p.name LIKE '%显示器%')
           )
         ) as avg_preference_score
       FROM products p
       LEFT JOIN (
         SELECT target_id, COUNT(*) as view_count
         FROM user_behaviors 
         WHERE action_type = 'view' AND target_type = 'product'
           AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY target_id
       ) views ON p.id = views.target_id
       LEFT JOIN (
         SELECT target_id, COUNT(*) as cart_count
         FROM user_behaviors 
         WHERE action_type = 'add_to_cart' AND target_type = 'product'
           AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY target_id
       ) carts ON p.id = carts.target_id
       LEFT JOIN (
         SELECT oi.product_id, SUM(oi.quantity) as purchase_count, SUM(oi.quantity * oi.price) as purchase_revenue
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY oi.product_id
       ) purchases ON p.id = purchases.product_id`,
      [days, days, days]
    );
    
    // 计算综合评分并排序
    const enrichedPerformance = performance.map(item => {
      const conversionRate = item.views > 0 ? (item.purchases / item.views * 100) : 0;
      const cartConversionRate = item.cart_adds > 0 ? (item.purchases / item.cart_adds * 100) : 0;
      
      // 综合评分算法：收入权重40%，转化率权重30%，浏览量权重20%，偏好评分权重10%
      const revenueScore = Math.min(item.revenue / 1000, 100); // 标准化到0-100
      const conversionScore = Math.min(conversionRate * 2, 100); // 转化率*2，最高100
      const viewScore = Math.min(item.views / 10, 100); // 浏览量/10，最高100
      const preferenceScore = item.avg_preference_score || 0;
      
      const compositeScore = (
        revenueScore * 0.4 + 
        conversionScore * 0.3 + 
        viewScore * 0.2 + 
        preferenceScore * 0.1
      ).toFixed(2);
      
      return {
        ...item,
        conversion_rate: conversionRate.toFixed(2),
        cart_conversion_rate: cartConversionRate.toFixed(2),
        composite_score: parseFloat(compositeScore)
      };
    });
    
    // 按综合评分排序，然后按收入排序
    return enrichedPerformance.sort((a, b) => {
      if (b.composite_score !== a.composite_score) {
        return b.composite_score - a.composite_score;
      }
      return b.revenue - a.revenue;
    });
  },

  // 获取用户细分分析
  getUserSegmentation: async () => {
    const segments = await db.allAsync(
      `SELECT 
         CASE 
           WHEN total_purchases >= 10 THEN 'VIP客户'
           WHEN total_purchases >= 5 THEN '忠实客户'
           WHEN total_purchases >= 1 THEN '普通客户'
           ELSE '潜在客户'
         END as segment,
         COUNT(*) as user_count,
         AVG(total_purchases) as avg_purchases,
         AVG(total_spent) as avg_spent
       FROM (
         SELECT 
           u.id,
           u.username,
           COUNT(DISTINCT o.id) as total_purchases,
           COALESCE(SUM(oi.quantity * oi.price), 0) as total_spent
         FROM users u
         LEFT JOIN orders o ON u.id = o.user_id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         GROUP BY u.id, u.username
       ) user_stats
       GROUP BY segment
       ORDER BY avg_spent DESC`
    );
    
    return segments;
  },

  // 获取实时数据概览
  getRealTimeOverview: async (days = 7) => {
    try {
      const [userStats, orderStats, revenueStats, productStats] = await Promise.all([
        // 用户统计
        db.getAsync(`
          SELECT 
            COUNT(DISTINCT user_id) as total_users,
            COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-1 day') THEN user_id END) as daily_active_users,
            COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-7 days') THEN user_id END) as weekly_active_users
          FROM user_behaviors 
          WHERE created_at >= datetime('now', '-' || ? || ' days')
        `, [days]),
        
        // 订单统计
        db.getAsync(`
          SELECT 
            COUNT(*) as total_orders,
            COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as daily_orders,
            AVG(total_amount) as avg_order_value,
            SUM(total_amount) as total_revenue
          FROM orders 
          WHERE created_at >= datetime('now', '-' || ? || ' days')
        `, [days]),
        
        // 收入趋势
        db.allAsync(`
          SELECT 
            DATE(created_at) as date,
            SUM(total_amount) as daily_revenue,
            COUNT(*) as daily_orders
          FROM orders 
          WHERE created_at >= datetime('now', '-' || ? || ' days')
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `, [days]),
        
        // 产品统计
        db.getAsync(`
          SELECT 
            COUNT(DISTINCT target_id) as products_viewed,
            COUNT(CASE WHEN action_type = 'view' THEN 1 END) as total_views,
            COUNT(CASE WHEN action_type = 'add_to_cart' THEN 1 END) as total_cart_adds,
            COUNT(CASE WHEN action_type = 'purchase' THEN 1 END) as total_purchases
          FROM user_behaviors 
          WHERE target_type = 'product' AND created_at >= datetime('now', '-' || ? || ' days')
        `, [days])
      ]);
      
      // 计算增长率
      const previousPeriodUserStats = await db.getAsync(`
        SELECT COUNT(DISTINCT user_id) as prev_users
        FROM user_behaviors 
        WHERE created_at >= datetime('now', '-' || ? || ' days') 
        AND created_at < datetime('now', '-' || ? || ' days')
      `, [days * 2, days]);
      
      const userGrowthRate = previousPeriodUserStats?.prev_users > 0 ? 
        ((userStats.total_users - previousPeriodUserStats.prev_users) / previousPeriodUserStats.prev_users * 100).toFixed(2) : 0;
      
      return {
        users: {
          total: userStats?.total_users || 0,
          daily_active: userStats?.daily_active_users || 0,
          weekly_active: userStats?.weekly_active_users || 0,
          growth_rate: parseFloat(userGrowthRate)
        },
        orders: {
          total: orderStats?.total_orders || 0,
          daily: orderStats?.daily_orders || 0,
          avg_value: orderStats?.avg_order_value || 0,
          total_revenue: orderStats?.total_revenue || 0
        },
        products: {
          viewed: productStats?.products_viewed || 0,
          total_views: productStats?.total_views || 0,
          cart_adds: productStats?.total_cart_adds || 0,
          purchases: productStats?.total_purchases || 0,
          view_to_cart_rate: productStats?.total_views > 0 ? 
            (productStats.total_cart_adds / productStats.total_views * 100).toFixed(2) : 0,
          cart_to_purchase_rate: productStats?.total_cart_adds > 0 ? 
            (productStats.total_purchases / productStats.total_cart_adds * 100).toFixed(2) : 0
        },
        revenue_trend: revenueStats || []
      };
    } catch (error) {
      console.error('获取实时概览失败:', error);
      throw error;
    }
  },

  // 获取高级用户行为分析
  getAdvancedUserBehavior: async (days = 7) => {
    try {
      const [sessionStats, deviceStats, timeStats, pathAnalysis] = await Promise.all([
        // 会话统计 - 使用metadata中的真实会话时长
        db.allAsync(`
          SELECT 
            user_id,
            DATE(created_at) as date,
            COUNT(*) as actions_per_session,
            AVG(CAST(JSON_EXTRACT(metadata, '$.session_duration_minutes') AS REAL)) as avg_session_duration
          FROM user_behaviors 
          GROUP BY user_id, DATE(created_at)
        `),
        
        // 设备统计（基于user_agent）
        db.allAsync(`
          SELECT 
            CASE 
              WHEN user_agent LIKE '%Mobile%' THEN 'Mobile'
              WHEN user_agent LIKE '%Tablet%' THEN 'Tablet'
              ELSE 'Desktop'
            END as device_type,
            COUNT(DISTINCT user_id) as users,
            COUNT(*) as actions
          FROM user_behaviors 
          WHERE created_at >= datetime('now', '-' || ? || ' days')
          AND user_agent IS NOT NULL
          GROUP BY device_type
        `, [days]),
        
        // 时间分布统计
        db.allAsync(`
          SELECT 
            strftime('%H', created_at) as hour,
            COUNT(*) as actions,
            COUNT(DISTINCT user_id) as unique_users
          FROM user_behaviors 
          WHERE created_at >= datetime('now', '-' || ? || ' days')
          GROUP BY hour
          ORDER BY hour
        `, [days]),
        
        // 用户路径分析
        db.allAsync(`
          SELECT 
            user_id,
            action_type,
            target_type,
            target_id,
            created_at,
            LAG(action_type) OVER (PARTITION BY user_id ORDER BY created_at) as prev_action
          FROM user_behaviors 
          WHERE created_at >= datetime('now', '-' || ? || ' days')
          ORDER BY user_id, created_at
        `, [days])
      ]);
      
      // 计算平均会话时长和跳出率
      const avgSessionDuration = sessionStats.length > 0 ? 
        sessionStats.reduce((sum, session) => sum + (session.avg_session_duration || 0), 0) / sessionStats.length : 0;
      const bounceRate = sessionStats.length > 0 
        ? (sessionStats.filter(session => session.actions_per_session === 1).length / sessionStats.length * 100) 
        : 0;
      return {
        session_metrics: {
          avg_duration: Number(avgSessionDuration.toFixed(2)),
          bounce_rate: Number(bounceRate.toFixed(2)),
          avg_actions_per_session: sessionStats.length > 0 ? 
            sessionStats.reduce((sum, session) => sum + session.actions_per_session, 0) / sessionStats.length : 0
        },
        device_distribution: deviceStats,
        hourly_activity: timeStats,
        user_paths: pathAnalysis.slice(0, 100) // 限制返回数据量
      };
    } catch (error) {
      console.error('获取高级用户行为分析失败:', error);
      throw error;
    }
  },

  // 生成智能报告
  generateIntelligentReport: async (days = 7) => {
    try {
      const [behaviorInsights, productPerformance, userSegmentation, trends, realTimeOverview, advancedBehavior] = await Promise.all([
        AnalyticsService.getUserBehaviorInsights(days),
        AnalyticsService.getProductPerformance(days),
        AnalyticsService.getUserSegmentation(),
        AnalyticsService.getTrendAnalysis(days),
        AnalyticsService.getRealTimeOverview(days),
        AnalyticsService.getAdvancedUserBehavior(days)
      ]);
      
      // 生成智能建议
      const recommendations = AnalyticsService.generateRecommendations({
        behaviorInsights,
        productPerformance,
        userSegmentation,
        realTimeOverview,
        advancedBehavior
      });
      
      return {
        period: `最近${days}天`,
        generated_at: new Date().toISOString(),
        summary: {
          total_users: realTimeOverview.users.total,
          daily_active_users: realTimeOverview.users.daily_active,
          total_actions: behaviorInsights.userActivity.reduce((sum, day) => sum + day.total_actions, 0),
          total_orders: realTimeOverview.orders.total,
          total_revenue: realTimeOverview.orders.total_revenue,
          avg_order_value: realTimeOverview.orders.avg_value,
          top_products: productPerformance.slice(0, 5),
          conversion_rates: behaviorInsights.conversionRates,
          user_growth_rate: realTimeOverview.users.growth_rate
        },
        insights: {
          behavior: behaviorInsights,
          advanced_behavior: advancedBehavior,
          products: productPerformance,
          users: userSegmentation,
          trends: trends,
          real_time: realTimeOverview
        },
        recommendations
      };
    } catch (error) {
      console.error('生成智能报告失败:', error);
      throw error;
    }
  },

  // 生成智能建议
  generateRecommendations: (data) => {
    const recommendations = [];
    
    // 基于转化率的建议
    if (data.behaviorInsights.conversionRates.viewToCart < 10) {
      recommendations.push({
        type: 'conversion',
        priority: 'high',
        title: '提升浏览到购物车转化率',
        description: `当前浏览到购物车转化率仅为${data.behaviorInsights.conversionRates.viewToCart}%，建议优化产品页面设计和购买按钮位置。`
      });
    }
    
    // 基于产品性能的建议
    const lowPerformingProducts = data.productPerformance.filter(p => p.views > 50 && p.conversion_rate < 2);
    if (lowPerformingProducts.length > 0) {
      recommendations.push({
        type: 'product',
        priority: 'medium',
        title: '优化低转化产品',
        description: `发现${lowPerformingProducts.length}个产品浏览量高但转化率低，建议检查价格策略和产品描述。`,
        products: lowPerformingProducts.slice(0, 3).map(p => p.name)
      });
    }
    
    // 基于用户细分的建议
    const potentialCustomers = data.userSegmentation.find(s => s.segment === '潜在客户');
    if (potentialCustomers && potentialCustomers.user_count > 0) {
      recommendations.push({
        type: 'marketing',
        priority: 'medium',
        title: '激活潜在客户',
        description: `有${potentialCustomers.user_count}个潜在客户尚未购买，建议推送个性化优惠券或新手礼包。`
      });
    }
    
    return recommendations;
  }
};

module.exports = AnalyticsService;
