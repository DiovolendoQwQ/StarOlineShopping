// 数据库迁移脚本 - 统一到SQLite
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 数据库路径配置
const oldDbPath = './database/db.sqlite';
const newDbPath = process.env.DB_PATH || './database/star_shopping.db';
const databaseDir = path.dirname(newDbPath);

// 确保数据库目录存在
if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
  console.log(`✅ 创建数据库目录: ${databaseDir}`);
}

// 迁移函数
async function migrateDatabase() {
  console.log('🚀 开始数据库迁移...');
  
  try {
    // 检查旧数据库是否存在
    const oldDbExists = fs.existsSync(oldDbPath);
    
    if (oldDbExists) {
      console.log('📦 发现旧数据库，开始迁移数据...');
      
      // 连接旧数据库
      const oldDb = new sqlite3.Database(oldDbPath);
      
      // 连接新数据库
      const newDb = new sqlite3.Database(newDbPath);
      
      // 启用外键约束
      await runQuery(newDb, 'PRAGMA foreign_keys = ON;');
      
      // 创建新的表结构
      await createNewTables(newDb);
      
      // 迁移数据
      await migrateData(oldDb, newDb);
      
      // 关闭数据库连接
      oldDb.close();
      newDb.close();
      
      console.log('✅ 数据迁移完成！');
      console.log(`📍 新数据库位置: ${newDbPath}`);
      
      // 备份旧数据库
      const backupPath = oldDbPath + '.backup';
      fs.copyFileSync(oldDbPath, backupPath);
      console.log(`💾 旧数据库已备份到: ${backupPath}`);
      
    } else {
      console.log('🆕 未发现旧数据库，创建新数据库...');
      
      // 直接创建新数据库
      const newDb = new sqlite3.Database(newDbPath);
      await runQuery(newDb, 'PRAGMA foreign_keys = ON;');
      await createNewTables(newDb);
      newDb.close();
      
      console.log('✅ 新数据库创建完成！');
    }
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

// 创建新表结构
async function createNewTables(db) {
  console.log('📋 创建新表结构...');
  
  // 用户表
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
  
  // 商品表（新结构）
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 购物车表
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      total_price REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // 购物车项表
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (cart_id) REFERENCES carts(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  
  // 订单表（新版本）
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS orders (
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
  
  // 订单项表
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS order_items (
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
  
  console.log('✅ 表结构创建完成');
}

// 迁移数据
async function migrateData(oldDb, newDb) {
  console.log('📊 开始迁移数据...');
  
  try {
    // 迁移用户数据
    const users = await getAllRows(oldDb, 'SELECT * FROM users');
    for (const user of users) {
      await runQuery(newDb, 
        'INSERT OR IGNORE INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
        [user.id, user.username, user.email, user.password]
      );
    }
    console.log(`✅ 迁移了 ${users.length} 个用户`);
    
    // 迁移商品数据（添加新字段）
    const products = await getAllRows(oldDb, 'SELECT * FROM products');
    for (const product of products) {
      await runQuery(newDb,
        'INSERT OR IGNORE INTO products (id, name, description, price, image, stock, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [product.id, product.name, '', product.price, product.image, product.stock || 0]
      );
    }
    console.log(`✅ 迁移了 ${products.length} 个商品`);
    
    // 迁移购物车数据
    const carts = await getAllRows(oldDb, 'SELECT * FROM carts');
    for (const cart of carts) {
      await runQuery(newDb,
        'INSERT OR IGNORE INTO carts (id, user_id, total_price) VALUES (?, ?, ?)',
        [cart.id, cart.user_id, cart.total_price || 0]
      );
    }
    console.log(`✅ 迁移了 ${carts.length} 个购物车`);
    
    // 迁移购物车项数据
    const cartItems = await getAllRows(oldDb, 'SELECT * FROM cart_items');
    for (const item of cartItems) {
      await runQuery(newDb,
        'INSERT OR IGNORE INTO cart_items (id, cart_id, product_id, quantity) VALUES (?, ?, ?, ?)',
        [item.id, item.cart_id, item.product_id, item.quantity]
      );
    }
    console.log(`✅ 迁移了 ${cartItems.length} 个购物车项`);
    
    // 迁移订单数据
    const orders = await getAllRows(oldDb, 'SELECT * FROM orders');
    for (const order of orders) {
      await runQuery(newDb,
        'INSERT OR IGNORE INTO orders (id, user_email, product_id, quantity, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [order.id, order.user_email, order.product_id, order.quantity, order.status, order.created_at]
      );
    }
    console.log(`✅ 迁移了 ${orders.length} 个订单`);
    
  } catch (error) {
    console.error('❌ 数据迁移失败:', error.message);
    throw error;
  }
}

// 辅助函数：执行SQL查询
function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// 辅助函数：获取所有行
function getAllRows(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// 运行迁移
if (require.main === module) {
  migrateDatabase();
}

module.exports = { migrateDatabase };