/**
 * 管理员权限检查中间件
 * 确保只有管理员用户可以访问数据分析功能
 */

/**
 * 检查用户是否为管理员
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function requireAdmin(req, res, next) {
    // 检查用户是否已登录
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Please log in'
        });
    }

    const user = req.session.user;
    
    // 检查用户是否为管理员
    // 这里可以根据实际需求调整管理员判断逻辑
    // 例如：检查用户角色、特定用户ID、邮箱域名等
    if (!isAdmin(user)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions. Admin access required'
        });
    }

    // 用户是管理员，继续执行
    next();
}

/**
 * 判断用户是否为管理员
 * @param {Object} user - 用户对象
 * @returns {boolean} 是否为管理员
 */
function isAdmin(user) {
    // 方法1：基于用户角色
    if (user.role === 'admin') {
        return true;
    }
    
    // 方法2：基于特定用户ID（可以在环境变量中配置）
    const adminUserIds = process.env.ADMIN_USER_IDS ? 
        process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : 
        ['admin'];
    
    if (adminUserIds.includes(user.user_id)) {
        return true;
    }
    
    // 方法3：基于邮箱域名（如果有邮箱字段）
    if (user.email && user.email.endsWith('@admin.star.com')) {
        return true;
    }
    
    // 方法4：基于用户名前缀
    if (user.username && user.username.startsWith('admin_')) {
        return true;
    }
    
    return false;
}

/**
 * 检查用户是否已登录（不要求管理员权限）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Please log in'
        });
    }
    
    next();
}

/**
 * 可选的管理员检查（用于页面渲染）
 * 如果不是管理员，重定向到登录页面而不是返回JSON错误
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function requireAdminPage(req, res, next) {
    // 检查用户是否已登录
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    const user = req.session.user;
    
    // 检查用户是否为管理员
    if (!isAdmin(user)) {
        return res.status(403).render('error', {
            title: 'Insufficient permissions',
            message: 'You do not have access to this page. Admin privileges required.',
            error: {
                status: 403,
                stack: ''
            }
        });
    }

    // 用户是管理员，继续执行
    next();
}

/**
 * 获取当前用户信息（如果已登录）
 * @param {Object} req - Express请求对象
 * @returns {Object|null} 用户信息或null
 */
function getCurrentUser(req) {
    return req.session && req.session.user ? req.session.user : null;
}

/**
 * 检查当前用户是否为管理员
 * @param {Object} req - Express请求对象
 * @returns {boolean} 是否为管理员
 */
function isCurrentUserAdmin(req) {
    const user = getCurrentUser(req);
    return user ? isAdmin(user) : false;
}

module.exports = {
    requireAdmin,
    requireAuth,
    requireAdminPage,
    isAdmin,
    getCurrentUser,
    isCurrentUserAdmin
};
