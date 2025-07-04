# 🔒 安全检查清单

## 📋 概述

本文档提供了STAR在线购物平台的安全检查清单，帮助开发团队定期进行安全审查和维护。

## 🛡️ 依赖安全检查

### 📦 NPM依赖审计

**定期检查频率**: 每周一次，发布前必检

```bash
# 检查安全漏洞
npm audit

# 自动修复可修复的漏洞
npm audit fix

# 强制修复（谨慎使用）
npm audit fix --force

# 检查过时的依赖
npm outdated
```

**检查清单**:
- [ ] 运行 `npm audit` 无高危漏洞
- [ ] 所有依赖都是最新的稳定版本
- [ ] 移除未使用的依赖包
- [ ] 检查依赖的许可证兼容性

### 🔍 依赖分析工具

**推荐工具**:
- **Snyk**: 持续安全监控
- **WhiteSource**: 开源安全管理
- **GitHub Dependabot**: 自动依赖更新

## 🔐 身份认证与授权

### 👤 用户认证

**检查项目**:
- [ ] 密码强度要求（最少8位，包含大小写字母、数字、特殊字符）
- [ ] 密码正确加密存储（bcrypt，salt rounds >= 12）
- [ ] 会话管理安全配置
- [ ] 登录失败次数限制
- [ ] 账户锁定机制

```javascript
// 密码强度验证示例
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

// bcrypt配置检查
const saltRounds = 12 // 推荐值
const hashedPassword = await bcrypt.hash(password, saltRounds)
```

### 🎫 会话安全

**配置检查**:
- [ ] `httpOnly: true` - 防止XSS攻击
- [ ] `secure: true` - 生产环境强制HTTPS
- [ ] `sameSite: 'strict'` - 防止CSRF攻击
- [ ] 合理的会话过期时间
- [ ] 会话ID随机性足够强

```javascript
// 安全的会话配置
app.use(session({
  secret: process.env.SESSION_SECRET, // 强随机密钥
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    sameSite: 'strict'
  },
  name: 'sessionId' // 隐藏默认会话名
}))
```

## 🛡️ 输入验证与清理

### 📝 数据验证

**检查项目**:
- [ ] 所有用户输入都经过验证
- [ ] 使用白名单而非黑名单验证
- [ ] 数据类型和格式验证
- [ ] 长度限制检查
- [ ] 特殊字符过滤

```javascript
// 输入验证示例
const { body, validationResult } = require('express-validator')

const validateUserInput = [
  body('email').isEmail().normalizeEmail(),
  body('username').isAlphanumeric().isLength({ min: 3, max: 20 }),
  body('quantity').isInt({ min: 1, max: 99 }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
]
```

### 🗃️ SQL注入防护

**检查项目**:
- [ ] 使用参数化查询或ORM
- [ ] 避免动态SQL拼接
- [ ] 输入转义和清理
- [ ] 数据库权限最小化

```javascript
// ❌ 危险的SQL拼接
const query = `SELECT * FROM users WHERE id = ${userId}`

// ✅ 安全的参数化查询
const query = 'SELECT * FROM users WHERE id = ?'
db.get(query, [userId], callback)

// ✅ 使用ORM（如果适用）
const user = await User.findById(userId)
```

## 🌐 Web安全头

### 🛡️ HTTP安全头

**必需的安全头**:
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security` (HTTPS)
- [ ] `Content-Security-Policy`

```javascript
// 使用helmet中间件
const helmet = require('helmet')

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))
```

## 🔍 XSS防护

### 🧹 输出编码

**检查项目**:
- [ ] 所有用户输入在输出时都经过编码
- [ ] 使用模板引擎的自动转义功能
- [ ] 避免使用 `innerHTML` 直接插入用户数据
- [ ] 实施内容安全策略(CSP)

```javascript
// EJS模板自动转义
<%= userInput %> <!-- 自动转义 -->
<%- userInput %> <!-- 不转义，危险！ -->

// 手动转义
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
```

## 🔒 CSRF防护

### 🎫 CSRF令牌

**检查项目**:
- [ ] 所有状态改变操作都需要CSRF令牌
- [ ] 令牌随机性足够强
- [ ] 令牌与会话绑定
- [ ] 使用SameSite cookie属性

```javascript
// 使用csurf中间件
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })

app.use(csrfProtection)

// 在表单中包含CSRF令牌
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

## 📁 文件上传安全

### 📤 上传验证

**检查项目**:
- [ ] 文件类型白名单验证
- [ ] 文件大小限制
- [ ] 文件名清理
- [ ] 病毒扫描（如果适用）
- [ ] 上传目录权限限制

```javascript
// 安全的文件上传配置
const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    // 生成安全的文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'))
    }
  }
})
```

## 🗄️ 数据库安全

### 🔐 数据库配置

**检查项目**:
- [ ] 数据库连接使用强密码
- [ ] 数据库用户权限最小化
- [ ] 敏感数据加密存储
- [ ] 定期数据备份
- [ ] 数据库访问日志记录

```javascript
// 数据库连接安全配置
const dbConfig = {
  filename: process.env.DB_PATH,
  // 启用WAL模式提高并发性能
  mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  // 设置连接超时
  timeout: 5000
}

// 敏感数据加密
const crypto = require('crypto')
const algorithm = 'aes-256-gcm'
const secretKey = process.env.ENCRYPTION_KEY

function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(algorithm, secretKey)
  // 加密实现
}
```

## 📊 日志与监控

### 📝 安全日志

**记录事件**:
- [ ] 登录尝试（成功/失败）
- [ ] 权限变更
- [ ] 敏感操作
- [ ] 异常访问模式
- [ ] 系统错误

```javascript
// 安全事件日志
const winston = require('winston')

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn'
    })
  ]
})

// 记录安全事件
securityLogger.warn('登录失败', {
  userId: req.body.username,
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
})
```

## 🔄 定期安全任务

### 📅 每日任务
- [ ] 检查系统日志异常
- [ ] 监控失败登录尝试
- [ ] 验证备份完整性

### 📅 每周任务
- [ ] 运行 `npm audit`
- [ ] 检查依赖更新
- [ ] 审查访问日志
- [ ] 测试备份恢复

### 📅 每月任务
- [ ] 全面安全扫描
- [ ] 更新安全补丁
- [ ] 审查用户权限
- [ ] 密码策略检查

### 📅 每季度任务
- [ ] 渗透测试
- [ ] 安全培训
- [ ] 灾难恢复演练
- [ ] 安全政策更新

## 🚨 事件响应

### 🔍 安全事件处理

**发现安全问题时的步骤**:
1. **立即响应**
   - [ ] 隔离受影响的系统
   - [ ] 保存证据和日志
   - [ ] 通知相关人员

2. **评估影响**
   - [ ] 确定受影响的数据和系统
   - [ ] 评估潜在损失
   - [ ] 制定修复计划

3. **修复和恢复**
   - [ ] 修复安全漏洞
   - [ ] 恢复服务
   - [ ] 验证修复效果

4. **事后分析**
   - [ ] 分析根本原因
   - [ ] 更新安全措施
   - [ ] 文档化经验教训

## 📞 紧急联系信息

**安全团队联系方式**:
- 🚨 紧急热线: [电话号码]
- 📧 安全邮箱: security@company.com
- 💬 内部通讯: #security-alerts

## 🔗 相关资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js安全最佳实践](https://nodejs.org/en/docs/guides/security/)
- [Express.js安全指南](https://expressjs.com/en/advanced/best-practice-security.html)
- [SQLite安全配置](https://www.sqlite.org/security.html)

---

**记住**: 安全是一个持续的过程，不是一次性的任务。定期审查和更新这个检查清单，确保它与最新的安全威胁和最佳实践保持同步。