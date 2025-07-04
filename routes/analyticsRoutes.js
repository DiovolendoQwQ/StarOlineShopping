// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const behaviorTracker = require('../middleware/behaviorTracker');

// 中间件：检查管理员权限（简单实现）
const requireAdmin = (req, res, next) => {
  // 这里可以添加更复杂的权限检查逻辑
  // 目前简单检查是否登录
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '需要登录才能访问数据分析功能'
    });
  }
  next();
};

// 数据面板页面路由
router.get('/dashboard', requireAdmin, behaviorTracker.trackPageView('analytics_dashboard'), analyticsController.getDashboard);

// API 路由

// 获取数据概览
router.get('/api/overview', requireAdmin, analyticsController.getOverview);

// 获取实时数据概览
router.get('/api/realtime-overview', requireAdmin, analyticsController.getRealTimeOverview);

// 获取高级用户行为分析
router.get('/api/advanced-user-behavior', requireAdmin, analyticsController.getAdvancedUserBehavior);

// 获取用户行为分析
router.get('/api/user-behavior', requireAdmin, analyticsController.getUserBehaviorAnalysis);

// 获取产品性能分析
router.get('/api/product-performance', requireAdmin, analyticsController.getProductPerformance);

// 获取用户细分分析
router.get('/api/user-segmentation', requireAdmin, analyticsController.getUserSegmentation);

// 获取趋势分析
router.get('/api/trends', requireAdmin, analyticsController.getTrendAnalysis);

// 获取智能报告
router.get('/api/report', requireAdmin, analyticsController.getIntelligentReport);

// 获取用户推荐
router.get('/api/recommendations/:userId?', analyticsController.getUserRecommendations);

// 获取热门偏好产品
router.get('/api/popular-preferences', analyticsController.getPopularPreferences);

// 生成每日汇总
router.post('/api/daily-summary', requireAdmin, analyticsController.generateDailySummary);

// 获取用户行为历史
router.get('/api/user-history/:userId?', analyticsController.getUserBehaviorHistory);

// 实时数据推送端点（可选，用于WebSocket或Server-Sent Events）
router.get('/api/realtime', requireAdmin, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 发送初始数据
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  
  // 定期发送数据更新
  const interval = setInterval(async () => {
    try {
      const overview = await analyticsController.getOverview({ query: { days: 1 } }, {
        json: (data) => data
      });
      
      res.write(`data: ${JSON.stringify({ 
        type: 'update', 
        data: overview.data, 
        timestamp: new Date().toISOString() 
      })}\n\n`);
    } catch (error) {
      console.error('实时数据推送错误:', error);
    }
  }, 30000); // 每30秒更新一次
  
  // 客户端断开连接时清理
  req.on('close', () => {
    clearInterval(interval);
  });
});

module.exports = router;