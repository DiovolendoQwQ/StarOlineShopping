const db = require('../config/database');

// 修复orders表结构
async function fixOrdersTable() {
  try {
    console.log('🔧 开始修复orders表结构...');
    
    // 删除现有的orders表
    await db.runAsync('DROP TABLE IF EXISTS orders');
    console.log('🗑️ 删除旧的orders表');
    
    // 删除现有的order_items表
    await db.runAsync('DROP TABLE IF EXISTS order_items');
    console.log('🗑️ 删除旧的order_items表');
    
    // 创建新的orders表
    await db.runAsync(`
      CREATE TABLE orders (
        id TEXT PRIMARY KEY, 
        user_id TEXT NOT NULL, 
        total_amount REAL NOT NULL,
        shipping_address TEXT,
        status TEXT NOT NULL DEFAULT 'pending', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ 创建新的orders表');
    
    // 创建新的order_items表
    await db.runAsync(`
      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    console.log('✅ 创建新的order_items表');
    
    console.log('🎉 orders表结构修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  await fixOrdersTable();
  process.exit(0);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = fixOrdersTable;