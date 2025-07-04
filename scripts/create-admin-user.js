// scripts/create-admin-user.js
const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createAdminUser() {
  try {
    console.log('🔧 开始创建管理员用户...');
    
    // 管理员用户信息
    const adminUser = {
      id: 'admin_001',
      username: 'admin_star',
      email: 'admin@star.com',
      password: 'admin123456',
      role: 'admin'
    };
    
    // 检查管理员用户是否已存在
    const existingUser = await db.getAsync('SELECT * FROM users WHERE email = ? OR id = ?', [adminUser.email, adminUser.id]);
    
    if (existingUser) {
      console.log('⚠️ 管理员用户已存在，更新角色信息...');
      await db.runAsync('UPDATE users SET role = ? WHERE email = ? OR id = ?', [adminUser.role, adminUser.email, adminUser.id]);
      console.log('✅ 管理员角色已更新');
      return;
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    
    // 插入管理员用户
    await db.runAsync(
      'INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [adminUser.id, adminUser.username, adminUser.email, hashedPassword, adminUser.role]
    );
    
    console.log('✅ 管理员用户创建成功！');
    console.log('📋 管理员登录信息：');
    console.log(`   邮箱: ${adminUser.email}`);
    console.log(`   密码: ${adminUser.password}`);
    console.log(`   角色: ${adminUser.role}`);
    console.log('🔗 登录后将自动跳转到数据分析后台');
    
  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error);
  } finally {
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('❌ 关闭数据库连接失败:', err.message);
      } else {
        console.log('✅ 数据库连接已关闭');
      }
    });
  }
}

// 执行创建管理员用户
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;