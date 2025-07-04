// models/UserPreference.js
const db = require('../config/database');

// 用户偏好数据模型
const UserPreference = {
  // 更新用户对产品的偏好
  updatePreference: async (userId, productId, actionType) => {
    // 权重配置
    const weights = {
      view: 1,
      add_to_cart: 3,
      purchase: 5
    };
    
    const weight = weights[actionType] || 1;
    
    // 检查是否已存在偏好记录
    const existing = await db.getAsync(
      `SELECT * FROM user_preferences WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    
    if (existing) {
      // 更新现有记录
      const updateFields = [];
      const updateValues = [];
      
      if (actionType === 'view') {
        updateFields.push('view_count = view_count + 1');
      } else if (actionType === 'add_to_cart') {
        updateFields.push('cart_add_count = cart_add_count + 1');
      } else if (actionType === 'purchase') {
        updateFields.push('purchase_count = purchase_count + 1');
      }
      
      updateFields.push('preference_score = preference_score + ?');
      updateFields.push('last_interaction = CURRENT_TIMESTAMP');
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      updateValues.push(weight, userId, productId);
      
      await db.runAsync(
        `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = ? AND product_id = ?`,
        updateValues
      );
    } else {
      // 创建新记录
      const viewCount = actionType === 'view' ? 1 : 0;
      const cartCount = actionType === 'add_to_cart' ? 1 : 0;
      const purchaseCount = actionType === 'purchase' ? 1 : 0;
      
      await db.runAsync(
        `INSERT INTO user_preferences 
         (user_id, product_id, preference_score, view_count, cart_add_count, purchase_count) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, productId, weight, viewCount, cartCount, purchaseCount]
      );
    }
    
    return await UserPreference.getUserPreference(userId, productId);
  },

  // 获取用户对特定产品的偏好
  getUserPreference: async (userId, productId) => {
    return await db.getAsync(
      `SELECT * FROM user_preferences WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
  },

  // 获取用户的推荐产品
  getRecommendations: async (userId, limit = 10) => {
    // 基于用户偏好和相似用户的推荐算法
    const recommendations = await db.allAsync(
      `SELECT 
         p.*,
         up.preference_score,
         up.view_count,
         up.cart_add_count,
         up.purchase_count,
         (
           SELECT AVG(up2.preference_score) 
           FROM user_preferences up2 
           WHERE up2.product_id = p.id
         ) as avg_preference_score
       FROM products p
       LEFT JOIN user_preferences up ON p.id = up.product_id AND up.user_id = ?
       WHERE p.id NOT IN (
         SELECT DISTINCT product_id 
         FROM orders 
         WHERE user_email = (SELECT email FROM users WHERE id = ?)
       )
       ORDER BY 
         CASE WHEN up.preference_score IS NOT NULL THEN up.preference_score ELSE 0 END DESC,
         avg_preference_score DESC,
         p.created_at DESC
       LIMIT ?`,
      [userId, userId, limit]
    );
    
    return recommendations;
  },

  // 获取相似用户推荐
  getSimilarUserRecommendations: async (userId, limit = 10) => {
    const recommendations = await db.allAsync(
      `SELECT 
         p.*,
         COUNT(DISTINCT up.user_id) as similar_users_count,
         AVG(up.preference_score) as avg_preference
       FROM user_preferences up1
       JOIN user_preferences up ON up1.product_id = up.product_id AND up.user_id != ?
       JOIN products p ON up.product_id = p.id
       WHERE up1.user_id = ? 
         AND up1.preference_score > 5
         AND p.id NOT IN (
           SELECT DISTINCT up2.product_id 
           FROM user_preferences up2 
           WHERE up2.user_id = ?
         )
       GROUP BY p.id, p.name, p.description, p.price, p.image, p.stock
       HAVING similar_users_count >= 2
       ORDER BY avg_preference DESC, similar_users_count DESC
       LIMIT ?`,
      [userId, userId, userId, limit]
    );
    
    return recommendations;
  },

  // 获取用户偏好统计
  getUserPreferenceStats: async (userId) => {
    const stats = await db.getAsync(
      `SELECT 
         COUNT(*) as total_preferences,
         AVG(preference_score) as avg_preference_score,
         SUM(view_count) as total_views,
         SUM(cart_add_count) as total_cart_adds,
         SUM(purchase_count) as total_purchases
       FROM user_preferences 
       WHERE user_id = ?`,
      [userId]
    );
    
    return stats;
  },

  // 获取热门偏好产品
  getPopularPreferences: async (limit = 20, days = 30) => {
    const popular = await db.allAsync(
      `SELECT 
         p.*,
         COUNT(DISTINCT up.user_id) as users_count,
         AVG(up.preference_score) as avg_score,
         SUM(up.view_count) as total_views,
         SUM(up.cart_add_count) as total_cart_adds,
         SUM(up.purchase_count) as total_purchases
       FROM user_preferences up
       JOIN products p ON up.product_id = p.id
       WHERE up.updated_at >= datetime('now', '-' || ? || ' days')
       GROUP BY p.id, p.name, p.description, p.price, p.image, p.stock
       ORDER BY users_count DESC, avg_score DESC
       LIMIT ?`,
      [days, limit]
    );
    
    return popular;
  },

  // 清理低分偏好数据
  cleanLowPreferences: async (threshold = 1) => {
    const result = await db.runAsync(
      `DELETE FROM user_preferences WHERE preference_score < ?`,
      [threshold]
    );
    
    return result.changes;
  },

  // 获取产品的偏好用户
  getProductPreferenceUsers: async (productId, limit = 50) => {
    const users = await db.allAsync(
      `SELECT 
         u.id,
         u.username,
         u.email,
         up.preference_score,
         up.view_count,
         up.cart_add_count,
         up.purchase_count,
         up.last_interaction
       FROM user_preferences up
       JOIN users u ON up.user_id = u.id
       WHERE up.product_id = ?
       ORDER BY up.preference_score DESC
       LIMIT ?`,
      [productId, limit]
    );
    
    return users;
  }
};

module.exports = UserPreference;