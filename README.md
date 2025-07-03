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

### 商品管理
- 商品列表展示
- 商品详情查看
- 商品搜索功能
- 分页浏览
- 丰富的商品图片资源

### 购物车功能
- 添加商品到购物车
- 购物车商品数量管理
- 购物车总价计算
- 删除购物车商品

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

### 前端技术
- **HTML5** - 页面结构
- **CSS3** - 样式设计
- **JavaScript** - 交互逻辑
- **响应式设计** - 多设备适配

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
│   └── cartController.js  # 购物车控制器
├── middleware/
│   └── authMiddleware.js  # 认证中间件
├── models/
│   ├── Product.js         # 商品模型
│   └── cart.js            # 购物车模型
├── routes/
│   ├── authRoutes.js      # 认证路由
│   ├── cartRoutes.js      # 购物车路由
│   ├── productRoutes.js   # 商品路由
│   └── userRoutes.js      # 用户路由
├── public/
│   ├── css/               # 样式文件
│   ├── js/                # 前端脚本
│   ├── image/             # 商品图片资源
│   ├── Picture/           # 其他图片资源
│   ├── homepage.html      # 主页
│   ├── login.html         # 登录页面
│   ├── detail.html        # 商品详情页
│   └── liebiao.html       # 商品列表页
├── database/
│   └── db.sqlite          # SQLite 数据库文件
├── views/                 # EJS 模板文件
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
   
   项目根目录已包含 `.env` 文件，默认配置如下：
   ```env
   # 数据库配置 - 使用SQLite
   DB_PATH=./database/star_shopping.db
   
   # 会话密钥，用于加密和验证会话
   SESSION_SECRET=your_secret_key
   
   # 服务器运行端口
   PORT=3000
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

### 购物车操作
1. 在商品页面点击"加入购物车"
2. 访问购物车页面管理商品
3. 调整商品数量或删除商品
4. 查看购物车总价

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

### 购物车相关
- `GET /cart` - 获取购物车页面
- `POST /cart/add` - 添加商品到购物车
- `PUT /cart/update/:id` - 更新购物车商品数量
- `DELETE /cart/remove/:id` - 删除购物车商品

## 📋 版本信息

### 当前版本
- **最新版本**: v2.1.0
- **发布日期**: 2024-12-19
- **主要更新**: 购物车功能全面优化

### 版本历史
- 📄 [完整更新日志](./CHANGELOG.md) - 查看详细的版本历史和技术变更
- 🚀 [发布说明](./RELEASE_NOTES.md) - 查看最新版本的主要功能和改进
- 🔄 [迁移指南](./MIGRATION_GUIDE.md) - 数据库升级和迁移说明

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

- [ ] 添加订单管理功能
- [ ] 实现支付系统集成
- [ ] 添加商品评价系统
- [ ] 实现管理员后台
- [ ] 添加商品推荐算法
- [ ] 支持多语言国际化
- [ ] 移动端 APP 开发
- [ ] 添加实时聊天客服

---

<div align="center">

**STAR 在线购物平台** - 让购物变得更简单、更愉快！ 🌟

[![GitHub stars](https://img.shields.io/github/stars/DiovolendoQwQ/STAR_Online_Shopping?style=social)](../../stargazers)
[![GitHub forks](https://img.shields.io/github/forks/DiovolendoQwQ/STAR_Online_Shopping?style=social)](../../network/members)
[![GitHub issues](https://img.shields.io/github/issues/DiovolendoQwQ/STAR_Online_Shopping)](../../issues)
[![GitHub license](https://img.shields.io/github/license/DiovolendoQwQ/STAR_Online_Shopping)](./LICENSE)

</div>