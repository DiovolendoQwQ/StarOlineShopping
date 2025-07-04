const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
require('dotenv').config();

// 使用环境变量中的数据库路径，如果没有则使用默认路径
const dbPath = process.env.DB_PATH || './database/star_shopping.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ 成功连接到 SQLite 数据库:', dbPath);
  }
});

// 启用外键约束
db.run('PRAGMA foreign_keys = ON;', (err) => {
  if (err) {
    console.error('❌ 无法启用外键约束:', err.message);
  } else {
    console.log('✅ 外键约束已启用');
  }
});

// 包装异步方法
db.getAsync = promisify(db.get).bind(db);
db.allAsync = promisify(db.all).bind(db);
db.runAsync = function (...args) {
  return new Promise((resolve, reject) => {
    db.run(...args, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this); // 返回上下文（`this` 包含受影响的行数）
      }
    });
  });
};

// 初始化数据库表
db.serialize(() => {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, 
      username TEXT NOT NULL, 
      email TEXT UNIQUE NOT NULL, 
      password TEXT NOT NULL,
      role TEXT DEFAULT NULL
    );
  `, (err) => {
    if (err) console.error('❌ 创建 users 表失败:', err.message);
    else {
      console.log('✅ users 表已创建或已存在');
      
      // 检查并添加 role 字段（如果不存在）
       db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT NULL`, (alterErr) => {
         if (alterErr && !alterErr.message.includes('duplicate column name')) {
           console.error('❌ 添加 role 字段失败:', alterErr.message);
         } else if (!alterErr) {
           console.log('✅ users 表已添加 role 字段');
         }
       });
     }
   });

  // 商品表
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      name TEXT NOT NULL, 
      description TEXT, 
      price REAL NOT NULL, 
      image TEXT, 
      stock INTEGER DEFAULT 0, 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) console.error('❌ 创建 products 表失败:', err.message);
    else console.log('✅ products 表已创建或已存在');
  });

  // 订单表（新版本）
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, 
      user_id TEXT NOT NULL, 
      total_amount REAL NOT NULL,
      shipping_address TEXT,
      status TEXT NOT NULL DEFAULT 'pending', 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) console.error('❌ 创建 orders 表失败:', err.message);
    else console.log('✅ orders 表已创建或已存在');
  });

  // 订单项表
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `, (err) => {
    if (err) console.error('❌ 创建 order_items 表失败:', err.message);
    else console.log('✅ order_items 表已创建或已存在');
  });

  // 购物车表
  db.run(`
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      user_id TEXT NOT NULL, 
      total_price REAL DEFAULT 0, 
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) console.error('❌ 创建 carts 表失败:', err.message);
    else console.log('✅ carts 表已创建或已存在');
  });

  // 购物车项表
  db.run(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      cart_id INTEGER NOT NULL, 
      product_id INTEGER NOT NULL, 
      quantity INTEGER NOT NULL, 
      FOREIGN KEY (cart_id) REFERENCES carts(id), 
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `, (err) => {
    if (err) console.error('❌ 创建 cart_items 表失败:', err.message);
    else console.log('✅ cart_items 表已创建或已存在');
  });

  // 用户行为数据表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_behaviors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      metadata TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) console.error('❌ 创建 user_behaviors 表失败:', err.message);
    else console.log('✅ user_behaviors 表已创建或已存在');
  });

  // 用户偏好数据表（新版本）
  db.run(`DROP TABLE IF EXISTS user_preferences;`, (dropErr) => {
    if (dropErr) console.error('❌ 删除旧 user_preferences 表失败:', dropErr.message);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        preference_type TEXT NOT NULL,
        preference_value TEXT NOT NULL,
        weight REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, preference_type, preference_value)
      );
    `, (err) => {
      if (err) console.error('❌ 创建 user_preferences 表失败:', err.message);
      else console.log('✅ user_preferences 表已创建或已存在');
    });
  });

  // 数据统计汇总表
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, metric_type)
    );
  `, (err) => {
    if (err) console.error('❌ 创建 analytics_summary 表失败:', err.message);
    else console.log('✅ analytics_summary 表已创建或已存在');
  });
});

// 导出数据库对象
module.exports = db;
