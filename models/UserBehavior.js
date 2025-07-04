// models/UserBehavior.js
const db = require('../config/database');

// 用户行为数据模型
const UserBehavior = {
  // 记录用户行为
  record: async (behaviorData) => {
    const { 
      user_id, 
      action_type, 
      target_type, 
      target_id, 
      metadata = null, 
      ip_address = null, 
      user_agent = null 
    } = behaviorData;
    
    const result = await db.runAsync(
      `INSERT INTO user_behaviors 
       (user_id, action_type, target_type, target_id, metadata, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, action_type, target_type, target_id, JSON.stringify(metadata), ip_address, user_agent]
    );
    
    return { id: result.lastID, ...behaviorData };
  },

  // 获取用户行为统计
  getUserStats: async (userId, days = 30) => {
    const stats = await db.allAsync(
      `SELECT 
         action_type,
         target_type,
         COUNT(*) as count,
         DATE(created_at) as date
       FROM user_behaviors 
       WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY action_type, target_type, DATE(created_at)
       ORDER BY created_at DESC`,
      [userId, days]
    );
    
    return stats;
  },

  // 获取热门产品（基于用户行为）
  getPopularProducts: async (limit = 10, days = 7) => {
    const products = await db.allAsync(
      `SELECT 
         ub.target_id as product_id,
         p.name,
         p.price,
         p.image,
         COUNT(CASE WHEN ub.action_type = 'view' THEN 1 END) as view_count,
         COUNT(CASE WHEN ub.action_type = 'add_to_cart' THEN 1 END) as cart_count,
         COUNT(CASE WHEN ub.action_type = 'purchase' THEN 1 END) as purchase_count,
         COUNT(*) as total_interactions
       FROM user_behaviors ub
       JOIN products p ON ub.target_id = p.id
       WHERE ub.target_type = 'product' 
         AND ub.created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY ub.target_id, p.name, p.price, p.image
       ORDER BY total_interactions DESC
       LIMIT ?`,
      [days, limit]
    );
    
    return products;
  },

  // 获取用户活跃度统计
  getUserActivity: async (days = 30) => {
    const activity = await db.allAsync(
      `SELECT 
         DATE(created_at) as date,
         COUNT(DISTINCT user_id) as active_users,
         COUNT(*) as total_actions
       FROM user_behaviors 
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );
    
    return activity;
  },

  // 获取行为类型统计
  getActionTypeStats: async (days = 30) => {
    const stats = await db.allAsync(
      `SELECT 
         action_type,
         COUNT(*) as count,
         COUNT(DISTINCT user_id) as unique_users
       FROM user_behaviors 
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY action_type
       ORDER BY count DESC`,
      [days]
    );
    
    return stats;
  },

  // 获取用户行为历史
  getUserHistory: async (userId, limit = 50) => {
    const history = await db.allAsync(
      `SELECT 
         ub.*,
         p.name as product_name,
         p.price as product_price
       FROM user_behaviors ub
       LEFT JOIN products p ON ub.target_id = p.id AND ub.target_type = 'product'
       WHERE ub.user_id = ?
       ORDER BY ub.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    
    return history.map(item => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null
    }));
  },

  // 清理旧数据
  cleanOldData: async (days = 365) => {
    const result = await db.runAsync(
      `DELETE FROM user_behaviors 
       WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [days]
    );
    
    return result.changes;
  }
};

module.exports = UserBehavior;