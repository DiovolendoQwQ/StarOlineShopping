# 更新日志 (CHANGELOG)

本文档记录了 STAR 在线购物平台的所有重要变更和版本更新。

## [v2.1.1] - 2025-7-2

### 🔒 安全修复
- **依赖安全更新**: 修复了5个安全漏洞
  - 修复mongoose注入漏洞 (严重)
  - 修复path-to-regexp ReDoS漏洞 (高危)
  - 修复tar-fs路径遍历漏洞 (高危)
  - 更新express依赖到安全版本
  - 移除20个过时的依赖包
- **依赖优化**: 清理了不必要的依赖，提升安全性

## [v2.1.0] - 2025-7-2

### 🚀 重大功能更新

#### 购物车系统全面优化
- **✅ 修复删除功能**: 解决了购物车删除按钮无响应的问题
- **🎨 新增删除动画**: 实现流畅的商品删除动画效果
- **🔧 改进事件处理**: 使用 `addEventListener` 替代 `onclick` 属性，提高事件绑定可靠性
- **🛡️ 增强错误处理**: 添加详细的错误提示和状态恢复机制
- **📊 实时总价更新**: 删除商品后自动重新计算购物车总价
- **🔄 智能页面刷新**: 购物车为空时自动刷新显示空购物车状态

#### 用户体验提升
- **💬 确认对话框**: 删除商品前显示确认提示，防止误操作
- **📱 响应式优化**: 改进移动端购物车界面显示效果
- **🎯 精确元素定位**: 优化JavaScript选择器，确保准确匹配DOM元素
- **🐛 调试功能**: 添加详细的控制台日志，便于问题排查

### 🔧 技术改进

#### 前端JavaScript优化
- 重构 `removeFromCart` 函数，提高代码可维护性
- 实现更可靠的DOM元素查找机制
- 添加页面加载时的初始化检查
- 优化事件监听器绑定逻辑

#### 后端API稳定性
- 确保购物车删除接口返回正确的JSON响应
- 优化数据库操作的错误处理
- 改进购物车总价计算逻辑

---

## [v2.0.0] - 2025-7-2

### 🎯 重大架构升级

#### 数据库技术栈统一
- **❌ 移除**: MongoDB + Mongoose 依赖
- **✅ 统一**: SQLite3 + 原生SQL
- **📦 优势**: 更轻量、部署简单、无需额外数据库服务

#### 数据库结构优化
```sql
-- 新增字段和优化
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

### 🛠️ 新增功能

#### 自动化迁移系统
- **📜 迁移脚本**: 新增 `scripts/migrate-database.js`
- **🔄 一键迁移**: 运行 `npm run migrate` 自动完成数据库迁移
- **💾 数据备份**: 自动备份旧数据库文件
- **📋 迁移指南**: 详细的 `MIGRATION_GUIDE.md` 文档

#### 增强的Product模型API
```javascript
// 新的API接口
const products = await Product.findAll({ limit: 10, offset: 0, keyword: '搜索' });
const product = await Product.findById(1);
const newProduct = await Product.create({ name: '商品', price: 99.99 });
const count = await Product.count('关键词');
```

### 📁 项目结构重组

#### 新增文件
- `scripts/migrate-database.js` - 数据库迁移脚本
- `MIGRATION_GUIDE.md` - 迁移指南文档
- `CHANGELOG.md` - 更新日志（本文件）

#### 核心文件重构
- `models/Product.js` - 完全重写，从Mongoose改为SQLite
- `config/database.js` - 更新数据库配置和表结构
- `package.json` - 移除mongoose依赖，添加npm脚本
- `.env` - 移除MONGO_URI，添加DB_PATH配置

### 🚀 性能提升

#### 数据库性能
- **⚡ 查询优化**: SQLite原生查询性能提升
- **🔗 连接简化**: 移除MongoDB连接开销
- **💾 内存优化**: 减少内存占用和依赖包大小

#### 部署简化
- **🏗️ 零配置**: 无需安装MongoDB服务
- **📦 便携性**: 数据库文件随项目一起部署
- **🔧 维护性**: 统一SQL语法，更好的事务支持

---

## [v1.5.0] - 2025-7-1

### 🎨 界面优化

#### 购物车界面改进
- **🎭 现代化设计**: 更新购物车页面视觉设计
- **📱 响应式布局**: 优化移动端显示效果
- **🎯 交互优化**: 改进按钮样式和hover效果

#### 商品详情页增强
- **🖼️ 图片展示**: 优化商品图片显示效果
- **📝 描述布局**: 改进商品描述的排版
- **🛒 购买按钮**: 增强"加入购物车"按钮动画

### 🔧 功能完善

#### 购物车核心功能
- **➕ 数量调整**: 完善商品数量增减功能
- **💰 价格计算**: 实时更新小计和总价
- **🗑️ 删除商品**: 实现商品删除功能（v2.1.0中进一步优化）

#### 用户认证系统
- **🔐 密码加密**: 使用bcrypt加密用户密码
- **🎫 会话管理**: 实现express-session会话管理
- **🛡️ 权限控制**: 添加身份验证中间件

---

## [v1.0.0] - 2024-12-01

### 🎉 首次发布

#### 核心功能实现
- **👤 用户系统**: 用户注册、登录、会话管理
- **📦 商品管理**: 商品展示、搜索、分页浏览
- **🛒 购物车**: 基础购物车功能
- **🎨 界面设计**: 现代化响应式界面

#### 技术栈
- **后端**: Node.js + Express.js
- **数据库**: SQLite3
- **模板引擎**: EJS
- **前端**: HTML5 + CSS3 + JavaScript

#### 项目特色
- **🎬 视频背景**: 登录页面视频背景效果
- **📱 响应式**: 支持多种设备访问
- **🔒 安全性**: 密码加密和会话安全
- **📊 数据管理**: 完整的数据库设计

---

## 版本说明

### 版本号规则
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：
- **主版本号**: 不兼容的API修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

### 更新类型图标
- 🚀 重大功能更新
- ✅ 新增功能
- 🔧 功能改进
- 🐛 Bug修复
- 📚 文档更新
- 🎨 界面优化
- ⚡ 性能提升
- 🛡️ 安全更新
- ❌ 移除功能
- 📦 依赖更新

---

## 贡献指南

如果您想为项目贡献代码，请：
1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 问题反馈

如果您发现任何问题或有改进建议，请在 [Issues](../../issues) 页面提交。

---

**感谢您使用 STAR 在线购物平台！** 🌟