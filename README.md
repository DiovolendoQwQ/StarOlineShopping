# STAR 在线购物平台

一个基于 Node.js 和 Express 框架开发的现代化在线购物平台，提供完整的电商功能体验。

## 项目概述

STAR 在线购物平台是一个功能完整的电商网站，支持用户注册登录、商品浏览、购物车管理、订单处理等核心电商功能。项目采用前后端分离的架构设计，使用 SQLite 数据库存储数据，具有良好的可扩展性和维护性。

## 主要功能

### 用户认证系统
- 用户注册与登录
- 密码加密存储（bcrypt）
- 会话管理（express-session）
- 身份验证中间件
- **管理员权限系统** ⭐
  - 多重身份验证机制
  - 基于用户ID/角色/邮箱的权限控制
  - 预设管理员账户支持

### 商品管理
- 商品列表展示
- 商品详情查看
- **智能搜索功能** ⭐
  - 模糊搜索与拼写容错
  - 拼音搜索支持
  - 实时搜索建议
  - 热门搜索词展示
  - 多关键词组合搜索
  - 相关性评分显示
- 分页浏览
- 丰富的商品图片资源

### 购物车功能
- 添加商品到购物车
- 购物车商品数量管理
- 购物车总价计算
- 删除购物车商品

### 数据分析系统 ⭐
- **智能数据面板**: 实时数据概览和可视化图表
- **用户行为分析**: 深度用户行为洞察和转化分析
- **产品性能分析**: 全面的产品数据统计和排行
- **趋势分析**: 多维度数据趋势展示
- **用户行为追踪**: 完整的用户行为数据收集
- **管理员后台**: 专业的数据分析管理界面
### 分布式与实时通信（新增）
- 局域网 WebSocket 实时通道：`/ws`（客服）与 `/admin/ws`（管理员监控）
- 自动发现并显示已连接客户端设备（在线会话列表）
- 健康检查与自动恢复：`GET /health`；支持 `CLUSTER_ENABLED=1` 进程守护
- 可选 TLS/SSL 加密通信（`TLS_ENABLED=1`），前端自动切换 `wss://`

## 🆕 更新摘要（2025-11-28）

- 集成“多客户端-单服务端”客服聊天到后台仪表盘的“客服咨询”分区，支持在图中对话框直接聊天而非命令行。
- 用户标识：优先 `username`，其次 `email`，未登录用户显示为 `Guest`；信息在用户侧初始化消息中携带。
- 侧边栏会话列表：按最近活跃排序，显示用户名/邮箱与最后一条消息预览；未读消息以红色圆角徽章显示，点击会话后清零。
- 历史记录：支持通过 `GET /admin/api/chat/history/:sessionId` 拉取会话历史并渲染到消息区。
- 双通道发送：管理员在仪表盘聊天框发送 `reply` 直接经 WebSocket 下发给对应会话；用户侧断网时将自动走 REST 回退 `POST /api/customer-service/inquiry`。
- 主要改动文件：
  - 前端管理端集成：`views/analytics/partials/scripts.ejs` 中新增/改造 `AdminChat` 模块（侧边栏、未读、消息气泡、发送/回车、历史载入）。
  - 客服UI：`views/analytics/partials/customer-service.ejs`（会话列表与消息区样式、输入与发送按钮）。
  - 服务端WS路由与转发：`app.js` 中 `/ws`（用户）与 `/admin/ws`（管理员）握手、消息分发与会话历史管理。

### 快速上手（客服）
- 管理端：访问 `http://localhost:3000/analytics/dashboard`，左侧选择“客服咨询”，在右侧聊天框直接回复用户。
- 用户端：访问 `http://localhost:3000/customer-service.html`，输入消息即可与客服通信。

### 消息类型约定
- 用户侧 → 服务端（WS）：
  - `type: 'init'`：携带 `sessionId` 与 `user`（`username/email/userId/avatar`）
  - `type: 'question'`：用户消息文本 `message`
- 服务端 → 用户侧（WS）：
  - `type: 'ack'`：确认已收到
  - `type: 'reply'`：管理员回复
- 服务端 → 管理端（WS）：
  - `type: 'clients'`：在线会话列表
  - `type: 'message'`：用户消息（含 `sessionId/message/user/timestamp`）
  - `type: 'reply'`：管理员回复回显
  - `type: 'metrics'`、`type: 'server_log'`、`type: 'error_log'`、`type: 'log_init'`

### 端点一览
- WebSocket 客服：`/ws`
- WebSocket 管理端：`/admin/ws`
- 拉取历史：`GET /admin/api/chat/history/:sessionId`
- 在线会话：`GET /admin/api/clients`
- REST 回退：`POST /api/customer-service/inquiry`

### 响应式界面
- 现代化的用户界面设计
- 支持多种设备访问
- 视频背景登录页面
- 直观的商品展示

## 技术栈

### 后端技术
- **Node.js** - 运行时环境
- **Express.js** - Web 应用框架
- **SQLite3** - 轻量级数据库
- **bcryptjs** - 密码加密
- **express-session** - 会话管理
- **EJS** - 模板引擎
- **Morgan** - HTTP 请求日志
- **Multer** - 文件上传处理
- **Method-override** - HTTP 方法重写
- **node-cron** - 定时任务调度
- **uuid** - 唯一标识符生成
- **ws** - WebSocket 服务
- **jsonwebtoken** - JWT 身份验证
- **cookie-parser** - Cookie 解析

### 前端技术
- **HTML5** - 页面结构
- **CSS3** - 样式设计
- **JavaScript** - 交互逻辑
- **响应式设计** - 多设备适配
- **Chart.js** - 数据可视化图表库
- **Bootstrap** - UI组件框架
- **Font Awesome** - 图标库
- 客服聊天前端模块：`public/js/app.js`（断线重试、离线队列、REST 回退）

### 开发工具
- **dotenv** - 环境变量管理
- **TypeScript 类型定义** - 开发时类型支持

## 📁 项目结构

```
STAR_Online_Shopping/
├── app.js                 # 应用入口文件
├── package.json           # 项目依赖配置
├── .env                   # 环境变量配置
├── config/
│   ├── database.js        # 数据库配置
│   └── server.js          # 服务器配置
├── controllers/
│   ├── cartController.js      # 购物车控制器
│   ├── analyticsController.js # 数据分析控制器
│   └── orderController.js     # 订单控制器
├── middleware/
│   ├── authMiddleware.js      # 认证中间件
│   ├── adminAuth.js           # 管理员权限中间件
│   └── behaviorTracker.js     # 行为追踪中间件
├── models/
│   ├── Product.js             # 商品模型
│   ├── cart.js                # 购物车模型
│   ├── UserBehavior.js        # 用户行为模型
│   ├── UserPreference.js      # 用户偏好模型
│   └── AnalyticsSummary.js    # 分析汇总模型
├── routes/
│   ├── authRoutes.js      # 认证路由
│   ├── cartRoutes.js      # 购物车路由
│   ├── productRoutes.js   # 商品路由
│   └── userRoutes.js      # 用户路由
├── services/
│   └── analyticsService.js # 数据分析服务
├── public/
│   ├── css/               # 样式文件
│   ├── js/                # 前端脚本
│   │   └── search.js      # 智能搜索功能脚本
│   ├── image/             # 商品图片资源
│   ├── Picture/           # 其他图片资源
│   ├── homepage.html      # 主页
│   ├── login.html         # 登录页面
│   ├── detail.html        # 商品详情页
│   └── liebiao.html       # 商品列表页
├── database/
│   └── db.sqlite          # SQLite 数据库文件
├── views/                 # EJS 模板文件
│   └── analytics/         # 数据分析视图
│       └── dashboard.ejs  # 数据分析面板
├── scripts/
│   └── start.ps1          # Windows 一键启动脚本
└── uploads/               # 文件上传目录
```

## 数据库设计

项目使用 SQLite 数据库，包含以下主要数据表：

### users 表（用户信息）
- `id` - 用户唯一标识
- `username` - 用户名
- `email` - 邮箱地址（唯一）
- `password` - 加密密码

### products 表（商品信息）
- `id` - 商品唯一标识
- `name` - 商品名称
- `description` - 商品描述
- `price` - 商品价格
- `image` - 商品图片
- `stock` - 库存数量（默认0）
- `created_at` - 创建时间
- `updated_at` - 更新时间

### carts 表（购物车）
- `id` - 购物车唯一标识
- `user_id` - 用户ID（外键）
- `total_price` - 购物车总价

### cart_items 表（购物车商品）
- `id` - 记录唯一标识
- `cart_id` - 购物车ID（外键）
- `product_id` - 商品ID（外键）
- `quantity` - 商品数量

### orders 表（订单信息）
- `id` - 订单唯一标识
- `user_email` - 用户邮箱
- `product_id` - 商品ID
- `quantity` - 购买数量
- `status` - 订单状态
- `created_at` - 创建时间

### user_behaviors 表（用户行为）
- `id` - 行为记录唯一标识
- `user_id` - 用户ID
- `action_type` - 行为类型（view、add_to_cart、purchase等）
- `target_type` - 目标类型（product、page等）
- `target_id` - 目标ID
- `metadata` - 元数据（JSON格式）
- `ip_address` - IP地址
- `user_agent` - 用户代理
- `created_at` - 创建时间

### user_preferences 表（用户偏好）
- `id` - 偏好记录唯一标识
- `user_id` - 用户ID
- `product_id` - 商品ID
- `weight` - 偏好权重
- `created_at` - 创建时间
- `updated_at` - 更新时间

### analytics_summary 表（分析汇总）
- `id` - 汇总记录唯一标识
- `date` - 日期
- `metric_type` - 指标类型
- `metric_value` - 指标值
- `created_at` - 创建时间

## 安装与运行

### 环境要求
- Node.js (版本 14.0 或更高)
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd STAR_Online_Shopping
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   项目根目录已包含 `.env` 文件，常用配置如下（可按需扩展）：
   ```env
   # 数据库配置 - 使用SQLite
   DB_PATH=./database/star_shopping.db
   
   # 会话密钥，用于加密和验证会话
   SESSION_SECRET=your_secret_key
   
   # JWT 身份验证
   JWT_SECRET=your_jwt_secret
   
   # 服务器运行地址与端口
   HOST=0.0.0.0
   PORT=3000
   
   # 局域网网卡名（可选，用于打印LAN地址，如 Wi-Fi）
   WIFI_IFACE=
   
   # TLS/SSL（可选）
   TLS_ENABLED=0
   TLS_KEY_PATH=
   TLS_CERT_PATH=
   
   # 自动恢复（可选）
   CLUSTER_ENABLED=0
   ```

4. **数据库迁移（可选）**
   
   如果你有旧版本的数据库，可以运行迁移脚本：
   ```bash
   npm run migrate
   ```
   
   这将会：
   - 自动检测旧数据库文件
   - 创建新的统一SQLite数据库
   - 迁移所有现有数据
   - 备份旧数据库文件

5. **启动应用**
   ```bash
   npm start
   # 或者使用 node 直接运行
   node app.js
   ```
   Windows 一键启动（同时打开首页与后台仪表盘）：
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\start.ps1
   ```

6. **访问应用**
   
   打开浏览器访问：`http://localhost:3000`

## 📖 使用指南

### 用户注册与登录
1. 访问首页会自动跳转到登录页面
2. 新用户点击"立即注册"创建账户
3. 已有账户的用户直接登录

### 商品浏览
1. 登录成功后进入主页
2. 浏览各类商品分类
3. 点击商品查看详细信息

### 智能搜索功能
1. **基础搜索**: 在搜索框输入商品名称或关键词
2. **模糊搜索**: 支持拼写错误容错，如输入"小咪"可找到"小米"
3. **拼音搜索**: 支持拼音输入，如"xiaomi"可找到"小米"
4. **搜索建议**: 输入时自动显示相关建议，支持键盘导航
5. **热门搜索**: 点击热门搜索标签快速搜索热门商品
6. **多关键词**: 使用空格分隔多个关键词进行组合搜索

### 购物车操作
1. 在商品页面点击"加入购物车"
2. 访问购物车页面管理商品
3. 调整商品数量或删除商品
4. 查看购物车总价

### 数据分析系统使用
#### 管理员登录
1. **使用预设管理员账户**：
   - 邮箱：`admin@star.com`
   - 密码：`admin123456`
2. **创建新管理员账户**：
   - 用户名以 `admin_` 开头
   - 邮箱以 `@admin.star.com` 结尾
   - 或使用用户ID：`admin`、`administrator`、`root`

#### 访问数据分析面板
1. 管理员登录后访问：`http://localhost:3000/analytics/dashboard`
2. 查看实时数据概览、用户行为分析、产品性能等
3. 支持7天/30天/90天时间范围选择
4. 可导出数据报告和图表
#### 客服系统
- 在仪表盘左侧点击“客服咨询”，直接在主内容区进行实时聊天
- 客服页面也可通过 `http://localhost:3000/customer-service.html` 独立访问
#### 服务器监控与错误日志
- 服务器监控：实时查看 CPU、内存与在线会话
- 错误日志：实时滚动显示后端 error/warn/info 级别日志

## 开发说明

### 启动开发服务器

npm run dev

# 生产模式
npm start
```

### 数据库初始化
应用启动时会自动创建必要的数据表，无需手动初始化。

### 添加新功能
1. 在 `routes/` 目录添加新的路由文件
2. 在 `controllers/` 目录添加对应的控制器
3. 在 `app.js` 中注册新路由
4. 更新前端页面和样式

## 安全特性

- **密码加密**：使用 bcrypt 对用户密码进行哈希加密
- **会话管理**：使用 express-session 管理用户会话
- **身份验证**：中间件验证用户登录状态
- **JWT + RBAC**：分析后台 API 基于 JWT 管理员访问控制
- **外键约束**：数据库启用外键约束保证数据完整性
- **输入验证**：前后端双重验证用户输入

## 界面特色

- **视频背景登录页**：提供沉浸式的登录体验
- **响应式设计**：适配各种屏幕尺寸
- **现代化UI**：简洁美观的用户界面
- **丰富的商品展示**：支持多种商品图片格式
- **直观的导航**：清晰的页面结构和导航

## API 接口

### 认证相关
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录

### 商品相关
- `GET /products/all` - 获取商品列表（支持分页和搜索）
- `GET /products/:id` - 获取商品详情
- `GET /products/api/search` - 智能搜索API（模糊搜索、拼音搜索）
- `GET /products/api/suggestions` - 获取搜索建议
- `GET /products/api/hot-searches` - 获取热门搜索词

### 购物车相关
- `GET /cart` - 获取购物车页面
- `POST /cart/add` - 添加商品到购物车
- `PUT /cart/update/:id` - 更新购物车商品数量
- `DELETE /cart/remove/:id` - 删除购物车商品

### 数据分析相关
- `GET /analytics/dashboard` - 数据分析面板页面
- `GET /analytics/api/overview` - 实时数据概览API
- `GET /analytics/api/user-behavior` - 用户行为分析API
- `GET /analytics/api/product-performance` - 产品性能分析API
- `GET /analytics/api/trends` - 趋势分析API
- `GET /analytics/api/advanced-user-behavior` - 高级用户行为分析API
### 实时与系统接口（新增）
- WebSocket 客服：`/ws`
- WebSocket 管理员：`/admin/ws`
- 健康检查：`GET /health`
- 在线客户端：`GET /admin/api/clients`
- 错误日志：`GET /admin/api/logs`

## 📋 版本信息

### 当前版本
- **最新版本**: v2.3.0
- **发布日期**: 2025-7-4
- **主要更新**: 数据分析系统全面上线

### 版本历史
- 📄 [完整更新日志](./docs/CHANGELOG.md) - 查看详细的版本历史和技术变更
- 🔍 [智能搜索功能说明](./docs/FUZZY_SEARCH_README.md) - 详细的搜索功能使用指南
- 🚀 [发布说明](./docs/RELEASE_NOTES.md) - 查看最新版本的主要功能和改进
- 🔄 [迁移指南](./docs/MIGRATION_GUIDE.md) - 数据库升级和迁移说明
- 📋 [代码质量建议](./docs/CODE_QUALITY_RECOMMENDATIONS.md) - 代码质量改进建议
- 🔒 [安全检查清单](./docs/SECURITY_CHECKLIST.md) - 安全性检查和建议

## 🤝 贡献与支持

### 贡献代码
我们欢迎任何形式的贡献！请查看以下指南：

1. **Fork** 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 **Pull Request**

### 问题反馈
- 🐛 [报告Bug](../../issues/new?template=bug_report.md)
- 💡 [功能建议](../../issues/new?template=feature_request.md)
- 💬 [讨论交流](../../discussions)

### 获取帮助
- 📚 查看本文档的各个章节
- 🔍 搜索 [已有Issues](../../issues)
- 📧 联系维护者

## 📜 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

### 技术栈致谢
- [Node.js](https://nodejs.org/) - JavaScript 运行时
- [Express.js](https://expressjs.com/) - Web 应用框架
- [SQLite](https://www.sqlite.org/) - 轻量级数据库
- [EJS](https://ejs.co/) - 模板引擎

## 未来规划

- [x] ~~智能搜索功能~~ ✅ 已完成 (v2.2.0)
- [x] ~~数据分析系统~~ ✅ 已完成 (v2.3.0)
- [x] ~~管理员后台~~ ✅ 已完成 (v2.3.0)
- [ ] 添加订单管理功能
- [ ] 实现支付系统集成
- [ ] 添加商品评价系统
- [ ] 添加商品推荐算法
- [ ] 搜索历史记录功能
- [ ] 语音搜索功能
- [ ] 图像识别搜索
- [ ] 支持多语言国际化
- [ ] 移动端 APP 开发
- [ ] 添加实时聊天客服
  （已完成：内嵌客服聊天与 WebSocket 实时通道）

## 常见问题
- WebSocket 频繁断开或无法连接
  - 仅保留一次 `/js/app.js` 引入，避免重复初始化导致连接竞争
  - 确认服务端日志包含“WebSocket 客服模块已启用”，端口与协议匹配（启用 TLS 时使用 `https/wss`）
  - 检查浏览器与防火墙策略，确保端口可访问
  - 访问 `http://localhost:3000/health` 验证服务健康
- 仪表盘客服不显示或显示在页面下方
  - 已将“客服咨询”模块置于主内容容器同级，点击左侧标签即可显示；如仍异常，清理浏览器缓存后刷新
- [ ] 数据分析报告导出功能
- [ ] 用户画像分析
- [ ] A/B测试系统
- [ ] 实时预警系统

---

<div align="center">

**STAR 在线购物平台** - 让购物变得更简单、更愉快！ 🌟

[![GitHub stars](https://img.shields.io/github/stars/DiovolendoQwQ/STAR_Online_Shopping?style=social)](../../stargazers)
[![GitHub forks](https://img.shields.io/github/forks/DiovolendoQwQ/STAR_Online_Shopping?style=social)](../../network/members)
[![GitHub issues](https://img.shields.io/github/issues/DiovolendoQwQ/STAR_Online_Shopping)](../../issues)
[![GitHub license](https://img.shields.io/github/license/DiovolendoQwQ/STAR_Online_Shopping)](./LICENSE)

</div>
