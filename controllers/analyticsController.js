// controllers/analyticsController.js
const AnalyticsService = require('../services/analyticsService');
const UserBehavior = require('../models/UserBehavior');
const UserPreference = require('../models/UserPreference');
const db = require('../config/database');

// 数据分析控制器
const analyticsController = {
  // 获取数据面板首页
  getDashboard: async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      
      // 生成智能报告
      const report = await AnalyticsService.generateIntelligentReport(days);
      
      res.render('analytics/dashboard', {
        report,
        days,
        title: '数据分析面板'
      });
    } catch (error) {
      console.error('获取数据面板失败:', error);
      res.status(500).render('error', { 
        message: '获取数据面板失败',
        error: error.message 
      });
    }
  },
  
  // 获取实时数据概览
  getRealTimeOverview: async (req, res) => {
    try {
      // 禁用缓存
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const days = parseInt(req.query.days) || 7;
      const data = await AnalyticsService.getRealTimeOverview(days);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取实时数据概览失败:', error);
      res.status(500).json({
        success: false,
        message: '获取实时数据概览失败',
        error: error.message
      });
    }
  },
  
  // 获取高级用户行为分析
  getAdvancedUserBehavior: async (req, res) => {
    try {
      // 禁用缓存
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const days = parseInt(req.query.days) || 7;
      const data = await AnalyticsService.getAdvancedUserBehavior(days);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取高级用户行为分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取高级用户行为分析失败',
        error: error.message
      });
    }
  },

  // 获取实时数据概览 API
  getOverview: async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      
      // 获取基础统计数据
      const [userStats, productStats, orderStats, revenueStats] = await Promise.all([
        // 用户统计
        db.getAsync(
          `SELECT 
             COUNT(DISTINCT user_id) as active_users,
             COUNT(*) as total_actions
           FROM user_behaviors 
           WHERE created_at >= datetime('now', '-' || ? || ' days')`,
          [days]
        ),
        // 产品统计
        db.getAsync(
          `SELECT 
             COUNT(DISTINCT target_id) as viewed_products,
             COUNT(*) as total_views
           FROM user_behaviors 
           WHERE action_type = 'view' AND target_type = 'product'
             AND created_at >= datetime('now', '-' || ? || ' days')`,
          [days]
        ),
        // 订单统计
        db.getAsync(
          `SELECT 
             COUNT(DISTINCT o.id) as total_orders,
             COALESCE(SUM(oi.quantity), 0) as total_items
           FROM orders o
           LEFT JOIN order_items oi ON o.id = oi.order_id
           WHERE o.created_at >= datetime('now', '-' || ? || ' days')`,
          [days]
        ),
        // 收入统计
        db.getAsync(
          `SELECT 
             COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
           FROM orders o
           JOIN order_items oi ON o.id = oi.order_id
           WHERE o.created_at >= datetime('now', '-' || ? || ' days')`,
          [days]
        )
      ]);
      
      // 禁用缓存
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json({
        success: true,
        data: {
          users: {
            active: userStats?.active_users || 0,
            total_actions: userStats?.total_actions || 0
          },
          products: {
            viewed: productStats?.viewed_products || 0,
            total_views: productStats?.total_views || 0
          },
          orders: {
            count: orderStats?.total_orders || 0,
            items: orderStats?.total_items || 0
          },
          revenue: {
            total: revenueStats?.total_revenue || 0
          }
        },
        period: `最近${days}天`
      });
    } catch (error) {
      console.error('获取概览数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取概览数据失败',
        error: error.message
      });
    }
  },

  // 获取用户行为分析 API
  getUserBehaviorAnalysis: async (req, res) => {
    try {
      // 禁用缓存
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const days = parseInt(req.query.days) || 30;
      const insights = await AnalyticsService.getUserBehaviorInsights(days);
      
      res.json({
        success: true,
        data: insights,
        period: `最近${days}天`
      });
    } catch (error) {
      console.error('获取用户行为分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户行为分析失败',
        error: error.message
      });
    }
  },

  // 获取产品性能分析 API
  getProductPerformance: async (req, res) => {
    try {
      // 禁用缓存
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const days = parseInt(req.query.days) || 30;
      const limit = parseInt(req.query.limit) || 20;
      
      const performance = await AnalyticsService.getProductPerformance(days);
      
      res.json({
        success: true,
        data: performance.slice(0, limit),
        period: `最近${days}天`
      });
    } catch (error) {
      console.error('获取产品性能分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取产品性能分析失败',
        error: error.message
      });
    }
  },

  // 获取用户细分分析 API
  getUserSegmentation: async (req, res) => {
    try {
      const segmentation = await AnalyticsService.getUserSegmentation();
      
      res.json({
        success: true,
        data: segmentation
      });
    } catch (error) {
      console.error('获取用户细分分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户细分分析失败',
        error: error.message
      });
    }
  },

  // 获取趋势分析 API
  getTrendAnalysis: async (req, res) => {
    try {
      // 禁用缓存
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const days = parseInt(req.query.days) || 30;
      const trends = await AnalyticsService.getTrendAnalysis(days);
      
      res.json({
        success: true,
        data: trends,
        period: `最近${days}天`
      });
    } catch (error) {
      console.error('获取趋势分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取趋势分析失败',
        error: error.message
      });
    }
  },

  // 获取智能报告 API
  getIntelligentReport: async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      const report = await AnalyticsService.generateIntelligentReport(days);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('获取智能报告失败:', error);
      res.status(500).json({
        success: false,
        message: '获取智能报告失败',
        error: error.message
      });
    }
  },

  // 获取用户推荐 API
  getUserRecommendations: async (req, res) => {
    try {
      const userId = req.params.userId || req.session.userId;
      const limit = parseInt(req.query.limit) || 10;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未登录'
        });
      }
      
      const [recommendations, similarRecommendations] = await Promise.all([
        UserPreference.getRecommendations(userId, limit),
        UserPreference.getSimilarUserRecommendations(userId, Math.floor(limit / 2))
      ]);
      
      res.json({
        success: true,
        data: {
          personal_recommendations: recommendations,
          similar_user_recommendations: similarRecommendations
        }
      });
    } catch (error) {
      console.error('获取用户推荐失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户推荐失败',
        error: error.message
      });
    }
  },

  // 获取热门偏好产品 API
  getPopularPreferences: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const days = parseInt(req.query.days) || 30;
      
      const popular = await UserPreference.getPopularPreferences(limit, days);
      
      res.json({
        success: true,
        data: popular,
        period: `最近${days}天`
      });
    } catch (error) {
      console.error('获取热门偏好产品失败:', error);
      res.status(500).json({
        success: false,
        message: '获取热门偏好产品失败',
        error: error.message
      });
    }
  },

  // 生成每日汇总 API
  generateDailySummary: async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const summary = await AnalyticsService.generateDailySummary(date);
      
      res.json({
        success: true,
        data: summary,
        message: `${date} 的数据汇总已生成`
      });
    } catch (error) {
      console.error('生成每日汇总失败:', error);
      res.status(500).json({
        success: false,
        message: '生成每日汇总失败',
        error: error.message
      });
    }
  },

  // 获取用户行为历史 API
  getUserBehaviorHistory: async (req, res) => {
    try {
      const userId = req.params.userId || req.session.userId;
      const limit = parseInt(req.query.limit) || 50;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未登录'
        });
      }
      
      const history = await UserBehavior.getUserHistory(userId, limit);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('获取用户行为历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户行为历史失败',
        error: error.message
      });
    }
  }
};

module.exports = analyticsController;