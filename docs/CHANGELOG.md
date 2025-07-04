# 更新日志 (CHANGELOG)

本文档记录了 STAR 在线购物平台的所有重要变更和版本更新。

## [v2.3.0] - 2025-7-4

### 🚀 重大功能更新

#### 数据分析系统全面上线
- **📊 智能数据面板**: 全新的数据分析后台系统
  - 实时数据概览（活跃用户、订单统计、收入分析）
  - 多维度数据可视化图表
  - 支持7天/30天/90天时间范围选择
  - 响应式设计，支持移动端访问
- **👥 用户行为分析**: 深度用户行为洞察
  - 用户行为类型分布统计
  - 用户活跃度趋势分析
  - 用户转化漏斗分析
  - 热门产品排行榜
- **📈 产品性能分析**: 全面的产品数据分析
  - 产品浏览量统计
  - 产品转化率分析
  - 收入贡献度排行
  - 库存预警功能
- **🔍 趋势分析**: 多维度数据趋势展示
  - 用户增长趋势
  - 订单量趋势
  - 收入趋势
  - 产品浏览趋势

#### 管理员权限系统
- **🔐 多重身份验证**: 灵活的管理员权限验证
  - 基于用户ID的权限控制
  - 基于用户角色的权限管理
  - 基于用户名前缀的快速识别
  - 基于邮箱域名的企业级权限
- **👑 预设管理员账户**: 开箱即用的管理员功能
  - 默认管理员账户：admin@star.com
  - 支持快速创建新管理员
  - 完整的权限管理文档

### 🛠️ 新增功能

#### 用户行为追踪系统
- **📝 行为记录**: 完整的用户行为数据收集
  - 页面浏览行为追踪
  - 商品查看行为记录
  - 购物车操作追踪
  - 购买行为分析
- **🎯 智能分析**: 基于行为数据的智能洞察
  - 用户偏好分析
  - 购买路径分析
  - 转化率优化建议
  - 个性化推荐基础

#### 数据可视化组件
- **📊 Chart.js集成**: 丰富的图表展示
  - 折线图（趋势分析）
  - 柱状图（对比分析）
  - 饼图（分布分析）
  - 环形图（占比分析）
- **🎨 现代化界面**: 美观的数据展示界面
  - 卡片式布局设计
  - 渐变色彩搭配
  - 响应式图表适配
  - 交互式数据展示

### 🔧 技术架构升级

#### 后端服务扩展
- **新增服务模块**:
  - `services/analyticsService.js` - 数据分析核心服务
  - `controllers/analyticsController.js` - 分析控制器
  - `models/UserBehavior.js` - 用户行为数据模型
  - `models/UserPreference.js` - 用户偏好模型
  - `models/AnalyticsSummary.js` - 分析汇总模型
- **API端点扩展**:
  - `GET /analytics/dashboard` - 数据分析面板
  - `GET /analytics/api/overview` - 实时数据概览API
  - `GET /analytics/api/user-behavior` - 用户行为分析API
  - `GET /analytics/api/product-performance` - 产品性能API
  - `GET /analytics/api/trends` - 趋势分析API

#### 数据库结构优化
```sql
-- 新增数据表
CREATE TABLE user_behaviors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  weight REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analytics_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 中间件增强
- **行为追踪中间件**: 自动记录用户行为
- **管理员权限中间件**: 多层级权限验证
- **缓存控制**: 实时数据的缓存策略优化

### 📚 文档完善
- **📖 新增文档**: `ADMIN_LOGIN_GUIDE.md` - 详细的管理员登录指南
- **🔧 配置说明**: 数据分析系统配置和使用说明
- **🚀 快速开始**: 预设管理员账户和快速访问指南
- **🛠️ 故障排除**: 常见问题解决方案

---

## [v2.2.0] - 2025-7-3

### 🔍 智能搜索系统全面升级

#### 模糊搜索功能
- **🎯 智能模糊匹配**: 实现基于编辑距离的智能搜索算法
  - 支持拼写错误容错（如"小米"可匹配"小米手机"）
  - 多关键词组合搜索（如"小米 手机"）
  - 智能相关性评分系统（0-100%匹配度显示）
- **🔤 拼音搜索支持**: 集成拼音搜索功能
  - 支持全拼搜索（如"xiaomi"匹配"小米"）
  - 支持简拼搜索（如"xm"匹配"小米"）
  - 中英文混合搜索
- **📝 同义词识别**: 智能同义词匹配
  - 手机/电话自动匹配
  - 笔记本/电脑自动匹配
  - 可扩展的同义词词典

#### 实时搜索体验
- **💡 智能搜索建议**: 实时搜索建议功能
  - 输入时自动显示相关建议
  - 支持键盘导航（上下箭头选择，回车确认）
  - 点击建议直接搜索
- **🔥 热门搜索词**: 动态热门搜索展示
  - 基于搜索频率的热门词汇
  - 美观的标签式展示
  - 一键搜索热门商品
- **⌨️ 键盘导航**: 完整的键盘操作支持
  - 上下箭头浏览建议
  - 回车键确认搜索
  - ESC键关闭建议框

#### 用户界面优化
- **🎨 搜索悬浮框优化**: 解决悬浮框与商品重叠问题
  - 调整z-index层级（搜索建议: 10001, 热门搜索: 10002）
  - 优化定位和间距
  - 改进边框、圆角和阴影效果
- **✨ 交互动画效果**: 提升用户体验
  - 搜索建议悬停时左侧橙色边框
  - 热门搜索标签悬停动画（背景变色、轻微上移、阴影）
  - 流畅的过渡动画效果
- **📊 搜索结果增强**: 丰富的搜索结果展示
  - 显示匹配度百分比
  - 商品描述和库存信息
  - 搜索统计信息（找到X个相关商品）

### 🔧 技术架构升级

#### 后端API扩展
- **新增API端点**:
  - `GET /products/api/search` - 智能搜索API
  - `GET /products/api/suggestions` - 搜索建议API
  - `GET /products/api/hot-searches` - 热门搜索API
- **搜索算法优化**:
  - 实现Levenshtein距离算法
  - 多字段搜索（名称、描述、标签）
  - 相关性评分算法

#### 前端架构重构
- **SearchManager类**: 全新的搜索管理器
  - 支持多容器管理
  - 统一的事件处理机制
  - 模块化的代码结构
- **性能优化**:
  - 防抖搜索（300ms延迟）
  - 智能缓存机制
  - 异步加载优化

### 📚 文档完善
- **📖 新增文档**: `FUZZY_SEARCH_README.md` - 详细的搜索功能说明
- **🔧 配置指南**: 搜索功能配置和自定义说明
- **🚀 性能优化**: 搜索性能调优建议
- **🔍 故障排除**: 常见问题解决方案

---

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