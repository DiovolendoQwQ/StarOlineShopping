const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const db = new sqlite3.Database('./database/db.sqlite', (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ 成功连接到 SQLite 数据库');
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
      password TEXT NOT NULL
    );
  `, (err) => {
    if (err) console.error('❌ 创建 users 表失败:', err.message);
    else console.log('✅ users 表已创建或已存在');
  });

  // 商品表
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      name TEXT NOT NULL, 
      price REAL NOT NULL, 
      stock INTEGER NOT NULL, 
      image TEXT
    );
  `, (err) => {
    if (err) console.error('❌ 创建 products 表失败:', err.message);
    else console.log('✅ products 表已创建或已存在');
  });

  // 订单表
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      user_email TEXT NOT NULL, 
      product_id INTEGER NOT NULL, 
      quantity INTEGER NOT NULL, 
      status TEXT NOT NULL, 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
      FOREIGN KEY (user_email) REFERENCES users(email), 
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `, (err) => {
    if (err) console.error('❌ 创建 orders 表失败:', err.message);
    else console.log('✅ orders 表已创建或已存在');
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
});

// 导出数据库对象
module.exports = db;
