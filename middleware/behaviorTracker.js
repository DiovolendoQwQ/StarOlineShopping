// middleware/behaviorTracker.js
const UserBehavior = require('../models/UserBehavior');
const UserPreference = require('../models/UserPreference');

// 行为追踪中间件
const behaviorTracker = {
  // 通用行为记录中间件
  track: (actionType, targetType = 'page') => {
    return async (req, res, next) => {
      try {
        const userId = req.session?.userId;
        if (userId) {
          const behaviorData = {
            user_id: userId,
            action_type: actionType,
            target_type: targetType,
            target_id: req.params.id || null,
            metadata: {
              url: req.originalUrl,
              method: req.method,
              query: req.query,
              body: req.method === 'POST' ? req.body : null
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
          };
          
          // 异步记录行为，不阻塞请求
          setImmediate(async () => {
            try {
              await UserBehavior.record(behaviorData);
              
              // 如果是产品相关行为，更新用户偏好
              if (targetType === 'product' && req.params.id) {
                await UserPreference.updatePreference(userId, req.params.id, actionType);
              }
            } catch (error) {
              console.error('记录用户行为失败:', error);
            }
          });
        }
      } catch (error) {
        console.error('行为追踪中间件错误:', error);
      }
      
      next();
    };
  },

  // 产品浏览追踪
  trackProductView: () => {
    return behaviorTracker.track('view', 'product');
  },

  // 搜索行为追踪
  trackSearch: () => {
    return async (req, res, next) => {
      try {
        const userId = req.session?.userId;
        const keyword = req.query.keyword || req.query.q;
        
        if (userId && keyword) {
          const behaviorData = {
            user_id: userId,
            action_type: 'search',
            target_type: 'keyword',
            target_id: null,
            metadata: {
              keyword: keyword,
              url: req.originalUrl,
              results_count: 0 // 将在响应中更新
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
          };
          
          // 异步记录搜索行为
          setImmediate(async () => {
            try {
              await UserBehavior.record(behaviorData);
            } catch (error) {
              console.error('记录搜索行为失败:', error);
            }
          });
        }
      } catch (error) {
        console.error('搜索追踪中间件错误:', error);
      }
      
      next();
    };
  },

  // 购物车操作追踪
  trackCartAction: (actionType = 'add_to_cart') => {
    return async (req, res, next) => {
      try {
        const userId = req.session?.userId;
        const productId = req.body.productId || req.params.id;
        
        if (userId && productId) {
          const behaviorData = {
            user_id: userId,
            action_type: actionType,
            target_type: 'product',
            target_id: productId,
            metadata: {
              quantity: req.body.quantity || 1,
              url: req.originalUrl
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
          };
          
          // 异步记录购物车行为
          setImmediate(async () => {
            try {
              await UserBehavior.record(behaviorData);
              await UserPreference.updatePreference(userId, productId, actionType);
            } catch (error) {
              console.error('记录购物车行为失败:', error);
            }
          });
        }
      } catch (error) {
        console.error('购物车追踪中间件错误:', error);
      }
      
      next();
    };
  },

  // 订单完成追踪
  trackPurchase: () => {
    return async (req, res, next) => {
      try {
        const userId = req.session?.userId;
        
        if (userId) {
          // 获取订单信息（假设在req.orderData中）
          const orderData = req.orderData || req.body;
          
          if (orderData.productId || orderData.items) {
            const items = orderData.items || [{ productId: orderData.productId, quantity: orderData.quantity || 1 }];
            
            // 为每个购买的产品记录行为
            setImmediate(async () => {
              try {
                for (const item of items) {
                  const behaviorData = {
                    user_id: userId,
                    action_type: 'purchase',
                    target_type: 'product',
                    target_id: item.productId,
                    metadata: {
                      quantity: item.quantity,
                      order_id: orderData.orderId,
                      total_amount: orderData.totalAmount
                    },
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.get('User-Agent')
                  };
                  
                  await UserBehavior.record(behaviorData);
                  await UserPreference.updatePreference(userId, item.productId, 'purchase');
                }
              } catch (error) {
                console.error('记录购买行为失败:', error);
              }
            });
          }
        }
      } catch (error) {
        console.error('购买追踪中间件错误:', error);
      }
      
      next();
    };
  },

  // 页面访问追踪
  trackPageView: (pageName) => {
    return async (req, res, next) => {
      try {
        const userId = req.session?.userId;
        
        if (userId) {
          const behaviorData = {
            user_id: userId,
            action_type: 'page_view',
            target_type: 'page',
            target_id: null,
            metadata: {
              page_name: pageName,
              url: req.originalUrl,
              referrer: req.get('Referrer')
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
          };
          
          // 异步记录页面访问
          setImmediate(async () => {
            try {
              await UserBehavior.record(behaviorData);
            } catch (error) {
              console.error('记录页面访问失败:', error);
            }
          });
        }
      } catch (error) {
        console.error('页面访问追踪中间件错误:', error);
      }
      
      next();
    };
  },

  // 用户登录追踪
  trackLogin: () => {
    return async (req, res, next) => {
      try {
        const userId = req.session?.userId;
        
        if (userId) {
          const behaviorData = {
            user_id: userId,
            action_type: 'login',
            target_type: 'system',
            target_id: null,
            metadata: {
              login_method: 'email',
              url: req.originalUrl
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
          };
          
          // 异步记录登录行为
          setImmediate(async () => {
            try {
              await UserBehavior.record(behaviorData);
            } catch (error) {
              console.error('记录登录行为失败:', error);
            }
          });
        }
      } catch (error) {
        console.error('登录追踪中间件错误:', error);
      }
      
      next();
    };
  }
};

module.exports = behaviorTracker;