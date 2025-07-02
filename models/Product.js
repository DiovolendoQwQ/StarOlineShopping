//Product.js

const db = require('../config/database');

// 商品模型
const Product = {
  // 创建商品表
  createTable: async () => {
    await db.runAsync(`
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
  },

  // 获取所有商品
  findAll: async (options = {}) => {
    const { limit, offset, keyword } = options;
    let query = "SELECT * FROM products";
    let params = [];

    if (keyword) {
      query += " WHERE name LIKE ? OR description LIKE ?";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += " ORDER BY created_at DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(limit);
      if (offset) {
        query += " OFFSET ?";
        params.push(offset);
      }
    }

    return await db.allAsync(query, params);
  },

  // 根据ID获取商品
  findById: async (id) => {
    return await db.getAsync("SELECT * FROM products WHERE id = ?", [id]);
  },

  // 创建新商品
  create: async (productData) => {
    const { name, description, price, image, stock = 0 } = productData;
    const result = await db.runAsync(
      "INSERT INTO products (name, description, price, image, stock) VALUES (?, ?, ?, ?, ?)",
      [name, description, price, image, stock]
    );
    return { id: result.lastID, ...productData };
  },

  // 更新商品
  updateById: async (id, updateData) => {
    const { name, description, price, image, stock } = updateData;
    await db.runAsync(
      "UPDATE products SET name = ?, description = ?, price = ?, image = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, description, price, image, stock, id]
    );
    return await Product.findById(id);
  },

  // 删除商品
  deleteById: async (id) => {
    const result = await db.runAsync("DELETE FROM products WHERE id = ?", [id]);
    return result.changes > 0;
  },

  // 获取商品总数
  count: async (keyword = '') => {
    let query = "SELECT COUNT(*) AS count FROM products";
    let params = [];

    if (keyword) {
      query += " WHERE name LIKE ? OR description LIKE ?";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const result = await db.getAsync(query, params);
    return result.count;
  },

  // 更新库存
  updateStock: async (id, quantity) => {
    await db.runAsync(
      "UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [quantity, id]
    );
    return await Product.findById(id);
  }
};

module.exports = Product;
