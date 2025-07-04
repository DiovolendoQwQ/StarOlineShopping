# 数据库技术栈统一迁移指南

## 概述

本次更新将项目的数据库技术栈统一为 **SQLite**，移除了之前混用的 MongoDB/Mongoose 依赖，实现了更加一致和简洁的架构。

## 主要变更

### 1. 技术栈统一
- ❌ **移除**: MongoDB + Mongoose
- ✅ **统一**: SQLite3 + 原生SQL
- 🎯 **优势**: 更轻量、部署简单、无需额外数据库服务

### 2. 文件变更清单

#### 核心文件修改
- `models/Product.js` - 完全重写，从Mongoose模型改为SQLite操作
- `config/database.js` - 更新数据库路径配置和表结构
- `package.json` - 移除mongoose依赖，添加npm脚本
- `.env` - 移除MONGO_URI，添加DB_PATH配置
- `README.md` - 更新技术栈说明和安装指南

#### 新增文件
- `scripts/migrate-database.js` - 数据库迁移脚本
- `MIGRATION_GUIDE.md` - 本迁移指南

### 3. 数据库结构优化

#### Products表增强
```sql
-- 旧结构
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  image TEXT
);

-- 新结构
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,              -- 新增：商品描述
  price REAL NOT NULL,
  image TEXT,
  stock INTEGER DEFAULT 0,       -- 优化：默认值
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 新增：创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 新增：更新时间
);
```

## 迁移步骤

### 自动迁移（推荐）

1. **运行迁移脚本**
   ```bash
   npm run migrate
   ```

2. **验证迁移结果**
   - 检查新数据库文件：`./database/star_shopping.db`
   - 确认旧数据库备份：`./database/db.sqlite.backup`

### 手动迁移

如果自动迁移失败，可以手动操作：

1. **备份现有数据**
   ```bash
   cp ./database/db.sqlite ./database/db.sqlite.backup
   ```

2. **更新依赖**
   ```bash
   npm install
   ```

3. **启动应用**
   ```bash
   npm start
   ```
   应用会自动创建新的数据库结构。

## 新的Product模型API

### 基本操作
```javascript
const Product = require('./models/Product');

// 获取所有商品
const products = await Product.findAll({
  limit: 10,
  offset: 0,
  keyword: '搜索关键词'
});

// 根据ID获取商品
const product = await Product.findById(1);

// 创建新商品
const newProduct = await Product.create({
  name: '商品名称',
  description: '商品描述',
  price: 99.99,
  image: '/images/product.jpg',
  stock: 100
});

// 更新商品
const updatedProduct = await Product.updateById(1, {
  name: '新名称',
  price: 89.99
});

// 删除商品
const deleted = await Product.deleteById(1);

// 获取商品总数
const count = await Product.count('搜索关键词');

// 更新库存
const product = await Product.updateStock(1, -5); // 减少5个库存
```

## 环境配置

### 新的.env配置
```env
# 数据库配置 - 使用SQLite
DB_PATH=./database/star_shopping.db

# 会话密钥，用于加密和验证会话
SESSION_SECRET=your_secret_key

# 服务器运行端口
PORT=3000
```

## 优势总结

### 🚀 性能提升
- 移除了MongoDB连接开销
- SQLite读写性能优异
- 减少了网络延迟

### 📦 部署简化
- 无需安装MongoDB服务
- 数据库文件随项目一起部署
- 零配置启动

### 🔧 维护便利
- 统一的SQL语法
- 更好的事务支持
- 简化的备份和恢复

### 💾 资源节约
- 更小的内存占用
- 减少了依赖包大小
- 降低了系统复杂度

## 注意事项

1. **数据备份**: 迁移前请确保备份重要数据
2. **依赖清理**: 可以运行 `npm prune` 清理未使用的依赖
3. **测试验证**: 迁移后请测试所有功能是否正常
4. **生产环境**: 在生产环境部署前，请在测试环境充分验证

## 故障排除

### 常见问题

**Q: 迁移脚本报错怎么办？**
A: 检查文件权限，确保有读写数据库目录的权限。

**Q: 旧数据丢失了怎么办？**
A: 检查备份文件 `db.sqlite.backup`，可以手动恢复数据。

**Q: 应用启动报错？**
A: 检查 `.env` 文件配置，确保 `DB_PATH` 路径正确。

### 获取帮助

如果遇到问题，请：
1. 检查控制台错误信息
2. 查看数据库文件是否正确创建
3. 验证环境变量配置
4. 重新运行迁移脚本

---

**迁移完成后，你的STAR在线购物平台将拥有更加统一、高效的数据库架构！** 🎉