# 安全最佳实践指南

## 🔒 概述

本文档为 STAR 在线购物平台提供了全面的安全最佳实践指南，涵盖了从前端到后端、从开发到部署的各个环节，旨在构建一个安全、可靠的电商系统。

## 🎯 安全目标

### 核心安全原则

1. **最小权限原则**: 用户和系统组件只获得完成任务所需的最小权限
2. **深度防御**: 多层安全防护，避免单点故障
3. **零信任架构**: 不信任任何用户或设备，始终验证
4. **数据保护**: 保护用户隐私和敏感数据
5. **持续监控**: 实时监控和响应安全威胁

### 安全合规要求

- **GDPR合规**: 用户数据保护和隐私权
- **PCI DSS**: 支付卡行业数据安全标准
- **OWASP Top 10**: 防范常见Web应用安全风险
- **ISO 27001**: 信息安全管理体系

## 🛡️ 身份认证与授权

### 1. 用户认证

#### 密码安全

**问题**: 弱密码和密码泄露风险

**解决方案**:
- **强密码策略**: 要求复杂密码
- **密码哈希**: 使用bcrypt或Argon2
- **密码历史**: 防止重复使用旧密码
- **账户锁定**: 防止暴力破解

```javascript
// ✅ 安全的密码处理
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

// 密码复杂度验证
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    throw new Error('密码长度至少8位');
  }
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('密码必须包含大小写字母、数字和特殊字符');
  }
  
  return true;
}

// 密码哈希
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// 密码验证
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// 登录限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: '登录尝试次数过多，请15分钟后再试',
  standardHeaders: true,
  legacyHeaders: false,
  // 根据IP和用户名限制
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.username || 'anonymous'}`;
  }
});

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 输入验证
    if (!username || !email || !password) {
      return res.status(400).json({ error: '所有字段都是必需的' });
    }
    
    // 密码复杂度验证
    validatePassword(password);
    
    // 检查用户是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(409).json({ error: '用户名或邮箱已存在' });
    }
    
    // 哈希密码
    const hashedPassword = await hashPassword(password);
    
    // 创建用户
    const result = db.prepare('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
      username,
      email,
      hashedPassword,
      new Date().toISOString()
    );
    
    res.status(201).json({
      success: true,
      message: '用户注册成功',
      userId: result.lastInsertRowid
    });
    
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 用户登录
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 输入验证
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码都是必需的' });
    }
    
    // 查找用户
    const user = db.prepare('SELECT id, username, email, password_hash, failed_login_attempts, locked_until FROM users WHERE username = ? OR email = ?').get(username, username);
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 检查账户是否被锁定
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: '账户已被锁定，请稍后重试' });
    }
    
    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      // 增加失败尝试次数
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // 锁定30分钟
      
      db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(
        failedAttempts,
        lockUntil ? lockUntil.toISOString() : null,
        user.id
      );
      
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 登录成功，重置失败尝试次数
    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = ? WHERE id = ?').run(
      new Date().toISOString(),
      user.id
    );
    
    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});
```

#### 多因素认证 (MFA)

**实施方案**:
- **TOTP**: 基于时间的一次性密码
- **SMS验证**: 短信验证码
- **邮箱验证**: 邮件验证码
- **生物识别**: 指纹、面部识别（移动端）

```javascript
// ✅ TOTP多因素认证实现
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// 生成MFA密钥
app.post('/api/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 生成密钥
    const secret = speakeasy.generateSecret({
      name: `STAR购物平台 (${req.user.username})`,
      issuer: 'STAR购物平台',
      length: 32
    });
    
    // 保存密钥到数据库（临时状态）
    db.prepare('UPDATE users SET mfa_secret = ?, mfa_enabled = 0 WHERE id = ?').run(
      secret.base32,
      userId
    );
    
    // 生成二维码
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
    
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA设置失败' });
  }
});

// 验证并启用MFA
app.post('/api/mfa/verify', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.userId;
    
    // 获取用户的MFA密钥
    const user = db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(userId);
    
    if (!user || !user.mfa_secret) {
      return res.status(400).json({ error: 'MFA未设置' });
    }
    
    // 验证TOTP令牌
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2 // 允许时间窗口偏差
    });
    
    if (!verified) {
      return res.status(401).json({ error: '验证码错误' });
    }
    
    // 启用MFA
    db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(userId);
    
    res.json({
      success: true,
      message: 'MFA已成功启用'
    });
    
  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA验证失败' });
  }
});

// MFA登录验证
app.post('/api/login/mfa', async (req, res) => {
  try {
    const { username, password, mfaToken } = req.body;
    
    // 基本登录验证（省略详细代码）
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 检查是否启用了MFA
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return res.status(200).json({
          requiresMFA: true,
          message: '请输入MFA验证码'
        });
      }
      
      // 验证MFA令牌
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 2
      });
      
      if (!verified) {
        return res.status(401).json({ error: 'MFA验证码错误' });
      }
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    logger.error('MFA login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});
```

### 2. 会话管理

#### JWT令牌安全

**最佳实践**:
- **短期有效期**: 减少令牌泄露风险
- **刷新令牌**: 实现令牌自动刷新
- **令牌撤销**: 支持令牌黑名单
- **安全存储**: 使用HttpOnly Cookie

```javascript
// ✅ 安全的JWT实现
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT配置
const JWT_CONFIG = {
  accessTokenExpiry: '15m', // 访问令牌15分钟
  refreshTokenExpiry: '7d', // 刷新令牌7天
  issuer: 'star-shopping',
  audience: 'star-users'
};

// 令牌黑名单（生产环境应使用Redis）
const tokenBlacklist = new Set();

// 生成令牌对
function generateTokens(payload) {
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    }
  );
  
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    }
  );
  
  return { accessToken, refreshToken };
}

// 验证访问令牌中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }
  
  // 检查令牌是否在黑名单中
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: '令牌已失效' });
  }
  
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  }, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '令牌已过期', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: '令牌无效' });
    }
    
    req.user = user;
    next();
  });
}

// 刷新令牌
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: '刷新令牌缺失' });
  }
  
  // 检查刷新令牌是否在黑名单中
  if (tokenBlacklist.has(refreshToken)) {
    return res.status(401).json({ error: '刷新令牌已失效' });
  }
  
  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  }, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '刷新令牌无效' });
    }
    
    if (user.type !== 'refresh') {
      return res.status(403).json({ error: '令牌类型错误' });
    }
    
    // 生成新的令牌对
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: user.userId,
      username: user.username
    });
    
    // 将旧的刷新令牌加入黑名单
    tokenBlacklist.add(refreshToken);
    
    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });
  });
});

// 登出
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const { refreshToken } = req.body;
  
  // 将令牌加入黑名单
  if (token) tokenBlacklist.add(token);
  if (refreshToken) tokenBlacklist.add(refreshToken);
  
  res.json({
    success: true,
    message: '登出成功'
  });
});
```

## 🔐 数据保护

### 1. 数据加密

#### 敏感数据加密

**加密策略**:
- **静态加密**: 数据库中的敏感数据
- **传输加密**: HTTPS/TLS
- **应用层加密**: 敏感字段单独加密

```javascript
// ✅ 数据加密实现
const crypto = require('crypto');

// 加密配置
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16
};

// 生成加密密钥（应从环境变量获取）
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('加密密钥未配置');
  }
  return Buffer.from(key, 'hex');
}

// 加密函数
function encrypt(text) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // 返回 iv + tag + encrypted 的组合
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('数据加密失败');
  }
}

// 解密函数
function decrypt(encryptedData) {
  try {
    const key = getEncryptionKey();
    
    // 提取 iv, tag 和 encrypted data
    const iv = Buffer.from(encryptedData.slice(0, ENCRYPTION_CONFIG.ivLength * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(ENCRYPTION_CONFIG.ivLength * 2, (ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength) * 2), 'hex');
    const encrypted = encryptedData.slice((ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength) * 2);
    
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('数据解密失败');
  }
}

// 敏感数据处理示例
class UserService {
  // 保存用户敏感信息
  static async saveUserProfile(userId, profileData) {
    try {
      const { phone, address, idCard } = profileData;
      
      // 加密敏感字段
      const encryptedPhone = phone ? encrypt(phone) : null;
      const encryptedAddress = address ? encrypt(address) : null;
      const encryptedIdCard = idCard ? encrypt(idCard) : null;
      
      // 保存到数据库
      db.prepare(`
        INSERT OR REPLACE INTO user_profiles 
        (user_id, phone_encrypted, address_encrypted, id_card_encrypted, updated_at) 
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        encryptedPhone,
        encryptedAddress,
        encryptedIdCard,
        new Date().toISOString()
      );
      
      return { success: true };
    } catch (error) {
      logger.error('Save user profile error:', error);
      throw new Error('保存用户信息失败');
    }
  }
  
  // 获取用户敏感信息
  static async getUserProfile(userId) {
    try {
      const profile = db.prepare(`
        SELECT phone_encrypted, address_encrypted, id_card_encrypted 
        FROM user_profiles 
        WHERE user_id = ?
      `).get(userId);
      
      if (!profile) {
        return null;
      }
      
      // 解密敏感字段
      return {
        phone: profile.phone_encrypted ? decrypt(profile.phone_encrypted) : null,
        address: profile.address_encrypted ? decrypt(profile.address_encrypted) : null,
        idCard: profile.id_card_encrypted ? decrypt(profile.id_card_encrypted) : null
      };
    } catch (error) {
      logger.error('Get user profile error:', error);
      throw new Error('获取用户信息失败');
    }
  }
}
```

### 2. 数据脱敏

#### 日志脱敏

**脱敏策略**:
- **手机号脱敏**: 显示前3位和后4位
- **邮箱脱敏**: 显示前2位和域名
- **身份证脱敏**: 显示前6位和后4位
- **银行卡脱敏**: 显示后4位

```javascript
// ✅ 数据脱敏工具
class DataMasking {
  // 手机号脱敏
  static maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  
  // 邮箱脱敏
  static maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    return username.substring(0, 2) + '***@' + domain;
  }
  
  // 身份证脱敏
  static maskIdCard(idCard) {
    if (!idCard || idCard.length < 10) return idCard;
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }
  
  // 银行卡脱敏
  static maskBankCard(cardNumber) {
    if (!cardNumber || cardNumber.length < 8) return cardNumber;
    return '**** **** **** ' + cardNumber.slice(-4);
  }
  
  // 地址脱敏
  static maskAddress(address) {
    if (!address || address.length < 10) return address;
    return address.substring(0, 6) + '***' + address.slice(-4);
  }
  
  // 通用对象脱敏
  static maskObject(obj, sensitiveFields = ['phone', 'email', 'idCard', 'bankCard', 'address']) {
    const masked = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (masked[field]) {
        switch (field) {
          case 'phone':
            masked[field] = this.maskPhone(masked[field]);
            break;
          case 'email':
            masked[field] = this.maskEmail(masked[field]);
            break;
          case 'idCard':
            masked[field] = this.maskIdCard(masked[field]);
            break;
          case 'bankCard':
            masked[field] = this.maskBankCard(masked[field]);
            break;
          case 'address':
            masked[field] = this.maskAddress(masked[field]);
            break;
        }
      }
    });
    
    return masked;
  }
}

// 日志中间件
function loggerMiddleware(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // 记录请求日志（脱敏处理）
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // 脱敏请求体
    if (req.body && Object.keys(req.body).length > 0) {
      logData.requestBody = DataMasking.maskObject(req.body);
    }
    
    // 脱敏响应数据
    if (data && typeof data === 'string') {
      try {
        const responseData = JSON.parse(data);
        if (responseData.user) {
          responseData.user = DataMasking.maskObject(responseData.user);
        }
        logData.responseData = responseData;
      } catch (e) {
        // 非JSON响应，不记录
      }
    }
    
    logger.info('API Request', logData);
    
    return originalSend.call(this, data);
  };
  
  next();
}

app.use(loggerMiddleware);
```

## 🛡️ 输入验证与防护

### 1. SQL注入防护

**防护策略**:
- **参数化查询**: 使用预编译语句
- **输入验证**: 严格验证用户输入
- **最小权限**: 数据库用户权限最小化
- **错误处理**: 不暴露数据库错误信息

```javascript
// ✅ SQL注入防护
const validator = require('validator');

// 输入验证工具
class InputValidator {
  // 验证用户ID
  static validateUserId(userId) {
    if (!userId || !Number.isInteger(Number(userId)) || Number(userId) <= 0) {
      throw new Error('无效的用户ID');
    }
    return Number(userId);
  }
  
  // 验证产品ID
  static validateProductId(productId) {
    if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
      throw new Error('无效的产品ID');
    }
    return Number(productId);
  }
  
  // 验证搜索关键词
  static validateSearchKeyword(keyword) {
    if (!keyword || typeof keyword !== 'string') {
      throw new Error('搜索关键词不能为空');
    }
    
    // 移除危险字符
    const sanitized = keyword.replace(/[<>"'%;()&+]/g, '');
    
    if (sanitized.length > 100) {
      throw new Error('搜索关键词过长');
    }
    
    return sanitized.trim();
  }
  
  // 验证邮箱
  static validateEmail(email) {
    if (!email || !validator.isEmail(email)) {
      throw new Error('邮箱格式无效');
    }
    return email.toLowerCase().trim();
  }
  
  // 验证手机号
  static validatePhone(phone) {
    if (!phone || !validator.isMobilePhone(phone, 'zh-CN')) {
      throw new Error('手机号格式无效');
    }
    return phone.trim();
  }
}

// 安全的数据库查询类
class SecureDatabase {
  constructor(db) {
    this.db = db;
  }
  
  // 安全的用户查询
  findUserById(userId) {
    try {
      const validUserId = InputValidator.validateUserId(userId);
      return this.db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(validUserId);
    } catch (error) {
      logger.error('Database query error:', error);
      throw new Error('查询用户信息失败');
    }
  }
  
  // 安全的产品搜索
  searchProducts(keyword, category, page = 1, limit = 20) {
    try {
      const validKeyword = InputValidator.validateSearchKeyword(keyword);
      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset = (validPage - 1) * validLimit;
      
      let query = 'SELECT id, name, price, image_url FROM products WHERE 1=1';
      const params = [];
      
      if (validKeyword) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${validKeyword}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (category && Number.isInteger(Number(category))) {
        query += ' AND category_id = ?';
        params.push(Number(category));
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(validLimit, offset);
      
      return this.db.prepare(query).all(...params);
    } catch (error) {
      logger.error('Product search error:', error);
      throw new Error('搜索产品失败');
    }
  }
  
  // 安全的订单创建
  createOrder(userId, items) {
    const transaction = this.db.transaction(() => {
      try {
        const validUserId = InputValidator.validateUserId(userId);
        
        // 验证商品项
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error('订单商品不能为空');
        }
        
        // 创建订单
        const orderResult = this.db.prepare(`
          INSERT INTO orders (user_id, status, created_at) 
          VALUES (?, 'pending', ?)
        `).run(validUserId, new Date().toISOString());
        
        const orderId = orderResult.lastInsertRowid;
        
        // 添加订单项
        const insertOrderItem = this.db.prepare(`
          INSERT INTO order_items (order_id, product_id, quantity, price) 
          VALUES (?, ?, ?, ?)
        `);
        
        let totalAmount = 0;
        
        for (const item of items) {
          const productId = InputValidator.validateProductId(item.productId);
          const quantity = Math.max(1, parseInt(item.quantity) || 1);
          
          // 获取产品价格
          const product = this.db.prepare('SELECT price FROM products WHERE id = ?').get(productId);
          if (!product) {
            throw new Error(`产品 ${productId} 不存在`);
          }
          
          const itemTotal = product.price * quantity;
          totalAmount += itemTotal;
          
          insertOrderItem.run(orderId, productId, quantity, product.price);
        }
        
        // 更新订单总金额
        this.db.prepare('UPDATE orders SET total_amount = ? WHERE id = ?').run(totalAmount, orderId);
        
        return { orderId, totalAmount };
      } catch (error) {
        logger.error('Create order error:', error);
        throw error;
      }
    });
    
    return transaction();
  }
}

// 使用安全数据库类
const secureDb = new SecureDatabase(db);

// API端点示例
app.get('/api/products/search', (req, res) => {
  try {
    const { keyword, category, page, limit } = req.query;
    const products = secureDb.searchProducts(keyword, category, page, limit);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});
```

### 2. XSS防护

**防护策略**:
- **输入过滤**: 过滤危险HTML标签
- **输出编码**: HTML实体编码
- **CSP策略**: 内容安全策略
- **Cookie安全**: HttpOnly和Secure标志

```javascript
// ✅ XSS防护
const DOMPurify = require('isomorphic-dompurify');
const helmet = require('helmet');

// XSS防护中间件
function xssProtection(req, res, next) {
  // 递归清理对象中的字符串
  function sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj, {
        ALLOWED_TAGS: [], // 不允许任何HTML标签
        ALLOWED_ATTR: []
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }
  
  // 清理请求体
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // 清理查询参数
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

// 安全头部配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Cookie安全配置
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
    httpOnly: true, // 防止XSS攻击
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    sameSite: 'strict' // 防止CSRF攻击
  }
}));

// 应用XSS防护中间件
app.use(xssProtection);

// 安全的HTML渲染
function renderSafeHTML(template, data) {
  // 对数据进行HTML实体编码
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  
  const safeData = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      safeData[key] = escapeHtml(value);
    } else {
      safeData[key] = value;
    }
  }
  
  return template.replace(/{{(\w+)}}/g, (match, key) => {
    return safeData[key] || '';
  });
}
```

### 3. CSRF防护

**防护策略**:
- **CSRF令牌**: 验证请求来源
- **SameSite Cookie**: 限制跨站请求
- **Referer检查**: 验证请求来源
- **双重提交**: Cookie和表单双重验证

```javascript
// ✅ CSRF防护
const csrf = require('csurf');
const crypto = require('crypto');

// CSRF令牌生成和验证
class CSRFProtection {
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  static verifyToken(sessionToken, requestToken) {
    if (!sessionToken || !requestToken) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(sessionToken, 'hex'),
      Buffer.from(requestToken, 'hex')
    );
  }
}

// CSRF中间件
function csrfProtection(req, res, next) {
  // GET请求不需要CSRF保护
  if (req.method === 'GET') {
    return next();
  }
  
  // 生成CSRF令牌（如果不存在）
  if (!req.session.csrfToken) {
    req.session.csrfToken = CSRFProtection.generateToken();
  }
  
  // 验证CSRF令牌
  const sessionToken = req.session.csrfToken;
  const requestToken = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!CSRFProtection.verifyToken(sessionToken, requestToken)) {
    return res.status(403).json({
      error: 'CSRF令牌验证失败',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }
  
  next();
}

// 提供CSRF令牌的端点
app.get('/api/csrf-token', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = CSRFProtection.generateToken();
  }
  
  res.json({
    csrfToken: req.session.csrfToken
  });
});

// 应用CSRF保护到需要的路由
app.use('/api/orders', csrfProtection);
app.use('/api/profile', csrfProtection);
app.use('/api/payment', csrfProtection);

// 前端CSRF令牌处理
const frontendCSRFScript = `
<script>
// 获取CSRF令牌
fetch('/api/csrf-token')
  .then(response => response.json())
  .then(data => {
    // 将令牌添加到所有AJAX请求
    const csrfToken = data.csrfToken;
    
    // 设置默认请求头
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      if (options.method && options.method !== 'GET') {
        options.headers = {
          ...options.headers,
          'X-CSRF-Token': csrfToken
        };
      }
      return originalFetch(url, options);
    };
    
    // 为表单添加隐藏字段
    document.querySelectorAll('form').forEach(form => {
      if (form.method.toUpperCase() !== 'GET') {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_csrf';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);
      }
    });
  })
  .catch(error => {
    console.error('Failed to get CSRF token:', error);
  });
</script>
`;
```

## 🔍 安全监控与日志

### 1. 安全事件监控

**监控策略**:
- **异常登录**: 监控异常登录行为
- **暴力破解**: 检测密码暴力破解
- **异常访问**: 监控异常API访问
- **数据泄露**: 检测敏感数据访问

```javascript
// ✅ 安全监控系统
class SecurityMonitor {
  constructor() {
    this.suspiciousActivities = new Map();
    this.alertThresholds = {
      failedLogins: 5,
      apiCalls: 100,
      dataAccess: 50
    };
  }
  
  // 记录可疑活动
  recordSuspiciousActivity(type, identifier, details) {
    const key = `${type}:${identifier}`;
    const now = Date.now();
    
    if (!this.suspiciousActivities.has(key)) {
      this.suspiciousActivities.set(key, []);
    }
    
    const activities = this.suspiciousActivities.get(key);
    activities.push({ timestamp: now, details });
    
    // 清理1小时前的记录
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentActivities = activities.filter(activity => activity.timestamp > oneHourAgo);
    this.suspiciousActivities.set(key, recentActivities);
    
    // 检查是否超过阈值
    this.checkThresholds(type, identifier, recentActivities);
  }
  
  // 检查阈值
  checkThresholds(type, identifier, activities) {
    const threshold = this.alertThresholds[type];
    if (threshold && activities.length >= threshold) {
      this.triggerAlert(type, identifier, activities);
    }
  }
  
  // 触发安全警报
  triggerAlert(type, identifier, activities) {
    const alert = {
      type: 'SECURITY_ALERT',
      category: type,
      identifier,
      count: activities.length,
      timeWindow: '1 hour',
      timestamp: new Date().toISOString(),
      activities: activities.slice(-5) // 最近5次活动
    };
    
    logger.warn('Security Alert Triggered', alert);
    
    // 发送通知（邮件、短信、Slack等）
    this.sendSecurityNotification(alert);
    
    // 自动响应措施
    this.autoResponse(type, identifier);
  }
  
  // 自动响应
  autoResponse(type, identifier) {
    switch (type) {
      case 'failedLogins':
        // 临时封禁IP
        this.blockIP(identifier, 30 * 60 * 1000); // 30分钟
        break;
      case 'apiCalls':
        // 限制API访问
        this.limitAPIAccess(identifier, 60 * 60 * 1000); // 1小时
        break;
      case 'dataAccess':
        // 记录审计日志
        this.auditDataAccess(identifier);
        break;
    }
  }
  
  // 发送安全通知
  async sendSecurityNotification(alert) {
    try {
      // 这里可以集成邮件、短信、Slack等通知服务
      console.log('Security notification sent:', alert);
      
      // 示例：发送邮件通知
      // await emailService.sendSecurityAlert(alert);
      
      // 示例：发送Slack通知
      // await slackService.sendAlert(alert);
    } catch (error) {
      logger.error('Failed to send security notification:', error);
    }
  }
  
  // 封禁IP
  blockIP(ip, duration) {
    // 实现IP封禁逻辑
    logger.info(`IP ${ip} blocked for ${duration}ms`);
  }
  
  // 限制API访问
  limitAPIAccess(identifier, duration) {
    // 实现API限制逻辑
    logger.info(`API access limited for ${identifier} for ${duration}ms`);
  }
  
  // 审计数据访问
  auditDataAccess(identifier) {
    // 记录详细的数据访问审计日志
    logger.info(`Data access audit triggered for ${identifier}`);
  }
}

const securityMonitor = new SecurityMonitor();

// 登录监控中间件
function loginMonitor(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    try {
      const responseData = JSON.parse(data);
      
      // 监控登录失败
      if (req.path === '/api/login' && !responseData.success) {
        securityMonitor.recordSuspiciousActivity('failedLogins', req.ip, {
          username: req.body.username,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }
      
      // 监控成功登录
      if (req.path === '/api/login' && responseData.success) {
        // 检查异常登录（如异常时间、地点等）
        this.checkAnomalousLogin(req, responseData.user);
      }
    } catch (e) {
      // 忽略非JSON响应
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// API访问监控
function apiMonitor(req, res, next) {
  // 记录API访问
  securityMonitor.recordSuspiciousActivity('apiCalls', req.ip, {
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next();
}

// 敏感数据访问监控
function dataAccessMonitor(req, res, next) {
  const sensitiveEndpoints = ['/api/users', '/api/orders', '/api/payments'];
  
  if (sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    const userId = req.user ? req.user.userId : 'anonymous';
    
    securityMonitor.recordSuspiciousActivity('dataAccess', userId, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

// 应用监控中间件
app.use(loginMonitor);
app.use(apiMonitor);
app.use(authenticateToken, dataAccessMonitor);
```

### 2. 安全审计日志

**审计策略**:
- **用户行为**: 记录用户关键操作
- **系统事件**: 记录系统安全事件
- **数据变更**: 记录敏感数据变更
- **访问控制**: 记录权限检查结果

```javascript
// ✅ 安全审计日志系统
class SecurityAuditLogger {
  constructor(db) {
    this.db = db;
    this.initAuditTables();
  }
  
  // 初始化审计表
  initAuditTables() {
    // 创建审计日志表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        user_id INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        resource TEXT,
        action TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        severity TEXT DEFAULT 'INFO'
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_logs(event_type);
    `);
  }
  
  // 记录审计日志
  log(eventType, details) {
    try {
      this.db.prepare(`
        INSERT INTO audit_logs 
        (event_type, user_id, ip_address, user_agent, resource, action, details, severity) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        eventType,
        details.userId || null,
        details.ip || null,
        details.userAgent || null,
        details.resource || null,
        details.action || null,
        JSON.stringify(details.data || {}),
        details.severity || 'INFO'
      );
    } catch (error) {
      logger.error('Failed to write audit log:', error);
    }
  }
  
  // 用户认证事件
  logAuthentication(success, userId, ip, userAgent, details = {}) {
    this.log('AUTHENTICATION', {
      userId,
      ip,
      userAgent,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      severity: success ? 'INFO' : 'WARN',
      data: details
    });
  }
  
  // 权限检查事件
  logAuthorization(success, userId, resource, action, ip) {
    this.log('AUTHORIZATION', {
      userId,
      ip,
      resource,
      action: success ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      severity: success ? 'INFO' : 'WARN'
    });
  }
  
  // 数据访问事件
  logDataAccess(userId, resource, action, ip, details = {}) {
    this.log('DATA_ACCESS', {
      userId,
      ip,
      resource,
      action,
      severity: 'INFO',
      data: details
    });
  }
  
  // 数据修改事件
  logDataModification(userId, resource, action, ip, oldData, newData) {
    this.log('DATA_MODIFICATION', {
      userId,
      ip,
      resource,
      action,
      severity: 'WARN',
      data: {
        oldData: DataMasking.maskObject(oldData),
        newData: DataMasking.maskObject(newData)
      }
    });
  }
  
  // 安全事件
  logSecurityEvent(eventType, severity, userId, ip, details) {
    this.log('SECURITY_EVENT', {
      userId,
      ip,
      action: eventType,
      severity,
      data: details
    });
  }
  
  // 查询审计日志
  queryLogs(filters = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (filters.eventType) {
      query += ' AND event_type = ?';
      params.push(filters.eventType);
    }
    
    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }
    
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    return this.db.prepare(query).all(...params);
  }
}

const auditLogger = new SecurityAuditLogger(db);

// 审计中间件
function auditMiddleware(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    try {
      // 记录API访问
      if (req.user) {
        auditLogger.logDataAccess(
          req.user.userId,
          req.path,
          req.method,
          req.ip,
          {
            query: req.query,
            statusCode: res.statusCode
          }
        );
      }
      
      // 记录敏感操作
      if (req.method !== 'GET' && req.user) {
        const sensitiveEndpoints = ['/api/users', '/api/orders', '/api/payments'];
        if (sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
          auditLogger.logDataModification(
            req.user.userId,
            req.path,
            req.method,
            req.ip,
            req.body,
            JSON.parse(data)
          );
        }
      }
    } catch (e) {
      // 忽略错误，不影响正常响应
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// 应用审计中间件
app.use(auditMiddleware);

// 审计日志查询API
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const filters = {
      eventType: req.query.eventType,
      userId: req.query.userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      severity: req.query.severity,
      limit: Math.min(1000, parseInt(req.query.limit) || 100)
    };
    
    const logs = auditLogger.queryLogs(filters);
    
    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    logger.error('Query audit logs error:', error);
    res.status(500).json({ error: '查询审计日志失败' });
  }
});
```

## 🔐 支付安全

### 1. 支付数据保护

**保护策略**:
- **PCI DSS合规**: 遵循支付卡行业标准
- **敏感数据隔离**: 支付数据单独存储
- **加密传输**: 所有支付数据加密传输
- **令牌化**: 使用支付令牌替代敏感信息

```javascript
// ✅ 安全的支付处理
class SecurePaymentProcessor {
  constructor() {
    this.paymentGateway = new PaymentGateway({
      apiKey: process.env.PAYMENT_API_KEY,
      secretKey: process.env.PAYMENT_SECRET_KEY,
      environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
    });
  }
  
  // 创建支付令牌
  async createPaymentToken(cardData) {
    try {
      // 验证卡号格式
      if (!this.validateCardNumber(cardData.number)) {
        throw new Error('无效的卡号');
      }
      
      // 创建支付令牌（不存储真实卡号）
      const tokenResponse = await this.paymentGateway.createToken({
        number: cardData.number,
        expMonth: cardData.expMonth,
        expYear: cardData.expYear,
        cvc: cardData.cvc
      });
      
      return {
        token: tokenResponse.token,
        last4: cardData.number.slice(-4),
        brand: this.detectCardBrand(cardData.number)
      };
    } catch (error) {
      logger.error('Payment token creation error:', error);
      throw new Error('支付令牌创建失败');
    }
  }
  
  // 处理支付
  async processPayment(orderId, paymentToken, amount) {
    try {
      // 验证订单
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      if (!order) {
        throw new Error('订单不存在');
      }
      
      // 验证金额
      if (Math.abs(order.total_amount - amount) > 0.01) {
        throw new Error('支付金额不匹配');
      }
      
      // 处理支付
      const paymentResult = await this.paymentGateway.charge({
        token: paymentToken,
        amount: Math.round(amount * 100), // 转换为分
        currency: 'CNY',
        description: `订单支付 #${orderId}`
      });
      
      // 记录支付结果
      const paymentRecord = {
        orderId,
        paymentId: paymentResult.id,
        amount,
        status: paymentResult.status,
        createdAt: new Date().toISOString()
      };
      
      db.prepare(`
        INSERT INTO payments (order_id, payment_id, amount, status, created_at) 
        VALUES (?, ?, ?, ?, ?)
      `).run(
        paymentRecord.orderId,
        paymentRecord.paymentId,
        paymentRecord.amount,
        paymentRecord.status,
        paymentRecord.createdAt
      );
      
      // 更新订单状态
      if (paymentResult.status === 'succeeded') {
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', orderId);
      }
      
      return paymentResult;
    } catch (error) {
      logger.error('Payment processing error:', error);
      throw new Error('支付处理失败');
    }
  }
  
  // 验证卡号
  validateCardNumber(number) {
    // Luhn算法验证
    const digits = number.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  // 检测卡品牌
  detectCardBrand(number) {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      unionpay: /^62/
    };
    
    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(number)) {
        return brand;
      }
    }
    
    return 'unknown';
  }
}

const paymentProcessor = new SecurePaymentProcessor();

// 支付API端点
app.post('/api/payments/create-token', authenticateToken, async (req, res) => {
  try {
    const { cardData } = req.body;
    
    // 验证输入
    if (!cardData || !cardData.number || !cardData.expMonth || !cardData.expYear || !cardData.cvc) {
      return res.status(400).json({ error: '卡片信息不完整' });
    }
    
    const tokenData = await paymentProcessor.createPaymentToken(cardData);
    
    // 记录审计日志
    auditLogger.logSecurityEvent(
      'PAYMENT_TOKEN_CREATED',
      'INFO',
      req.user.userId,
      req.ip,
      { last4: tokenData.last4, brand: tokenData.brand }
    );
    
    res.json({
      success: true,
      token: tokenData.token,
      last4: tokenData.last4,
      brand: tokenData.brand
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/payments/process', authenticateToken, async (req, res) => {
  try {
    const { orderId, paymentToken, amount } = req.body;
    
    // 验证输入
    if (!orderId || !paymentToken || !amount) {
      return res.status(400).json({ error: '支付信息不完整' });
    }
    
    const result = await paymentProcessor.processPayment(orderId, paymentToken, amount);
    
    // 记录审计日志
    auditLogger.logSecurityEvent(
      'PAYMENT_PROCESSED',
      'WARN',
      req.user.userId,
      req.ip,
      { orderId, amount, status: result.status }
    );
    
    res.json({
      success: true,
      paymentId: result.id,
      status: result.status
    });
  } catch (error) {
     res.status(400).json({ error: error.message });
   }
 });
 ```

## 🚀 部署安全

### 1. 服务器安全配置

**安全配置清单**:
- **防火墙配置**: 只开放必要端口
- **SSL/TLS配置**: 使用强加密套件
- **服务器加固**: 禁用不必要服务
- **定期更新**: 及时安装安全补丁

```bash
# Nginx安全配置示例
server {
    listen 443 ssl http2;
    server_name star-shopping.com;
    
    # SSL配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 安全头部
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";
    
    # 隐藏服务器信息
    server_tokens off;
    
    # 限制请求大小
    client_max_body_size 10M;
    
    # 限制请求频率
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name star-shopping.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. 环境变量安全

```bash
# .env.production 示例
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=star_shopping_prod
DB_USER=app_user
DB_PASSWORD=complex_secure_password_123!

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-256-bits-long
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# 加密密钥
ENCRYPTION_KEY=32-character-encryption-key-here
HASH_SALT_ROUNDS=12

# 支付网关
PAYMENT_API_KEY=pk_live_your_payment_api_key
PAYMENT_SECRET_KEY=sk_live_your_payment_secret_key

# 邮件服务
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@star-shopping.com
SMTP_PASS=app_specific_password

# 安全配置
SESSION_SECRET=your-session-secret-key
CSRF_SECRET=your-csrf-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 监控配置
LOG_LEVEL=warn
MONITORING_ENABLED=true
ALERT_EMAIL=admin@star-shopping.com
```

## 📊 安全实施计划

### 阶段1: 紧急安全修复 (1-2周)

**优先级: 🔴 高**

1. **输入验证和过滤**
   - [ ] 实施SQL注入防护
   - [ ] 添加XSS防护
   - [ ] 实施CSRF保护
   - [ ] 输入数据验证和清理

2. **身份认证加强**
   - [ ] 实施JWT令牌认证
   - [ ] 添加密码强度验证
   - [ ] 实施登录尝试限制
   - [ ] 添加会话管理

3. **基础安全头部**
   - [ ] 配置安全HTTP头部
   - [ ] 实施HTTPS重定向
   - [ ] 添加内容安全策略

### 阶段2: 核心安全功能 (2-4周)

**优先级: 🟡 中**

1. **数据保护**
   - [ ] 实施数据加密
   - [ ] 敏感数据脱敏
   - [ ] 数据备份加密
   - [ ] 访问控制优化

2. **支付安全**
   - [ ] PCI DSS合规检查
   - [ ] 支付令牌化
   - [ ] 支付数据隔离
   - [ ] 支付审计日志

3. **监控和日志**
   - [ ] 安全事件监控
   - [ ] 审计日志系统
   - [ ] 异常检测机制
   - [ ] 安全报警系统

### 阶段3: 高级安全特性 (4-6周)

**优先级: 🟢 低**

1. **高级认证**
   - [ ] 多因素认证(MFA)
   - [ ] 生物识别支持
   - [ ] 单点登录(SSO)
   - [ ] OAuth2集成

2. **安全自动化**
   - [ ] 自动化安全测试
   - [ ] 漏洞扫描集成
   - [ ] 安全CI/CD流水线
   - [ ] 自动化事件响应

3. **合规性**
   - [ ] GDPR合规检查
   - [ ] 数据保护影响评估
   - [ ] 隐私政策更新
   - [ ] 合规性审计

## 📈 安全监控指标

### 1. 关键安全指标 (KSI)

```javascript
// 安全指标监控
class SecurityMetrics {
  constructor() {
    this.metrics = {
      // 认证指标
      loginAttempts: 0,
      failedLogins: 0,
      successfulLogins: 0,
      
      // 攻击指标
      sqlInjectionAttempts: 0,
      xssAttempts: 0,
      csrfAttempts: 0,
      
      // 系统指标
      securityEvents: 0,
      dataBreaches: 0,
      vulnerabilities: 0
    };
  }
  
  // 记录安全事件
  recordSecurityEvent(eventType, severity = 'INFO') {
    this.metrics.securityEvents++;
    
    // 发送到监控系统
    this.sendToMonitoring({
      type: 'security_event',
      eventType,
      severity,
      timestamp: new Date().toISOString()
    });
    
    // 高严重性事件立即报警
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      this.sendAlert(eventType, severity);
    }
  }
  
  // 生成安全报告
  generateSecurityReport() {
    const report = {
      period: '24h',
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      
      // 计算安全评分
      securityScore: this.calculateSecurityScore(),
      
      // 风险评估
      riskLevel: this.assessRiskLevel(),
      
      // 建议
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }
  
  // 计算安全评分
  calculateSecurityScore() {
    let score = 100;
    
    // 根据安全事件扣分
    score -= this.metrics.sqlInjectionAttempts * 10;
    score -= this.metrics.xssAttempts * 8;
    score -= this.metrics.csrfAttempts * 6;
    score -= this.metrics.failedLogins * 0.1;
    
    return Math.max(0, Math.min(100, score));
  }
  
  // 评估风险等级
  assessRiskLevel() {
    const score = this.calculateSecurityScore();
    
    if (score >= 90) return 'LOW';
    if (score >= 70) return 'MEDIUM';
    if (score >= 50) return 'HIGH';
    return 'CRITICAL';
  }
  
  // 生成安全建议
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.failedLogins > 100) {
      recommendations.push('考虑加强登录保护机制');
    }
    
    if (this.metrics.sqlInjectionAttempts > 0) {
      recommendations.push('立即检查SQL注入防护');
    }
    
    if (this.metrics.xssAttempts > 0) {
      recommendations.push('加强XSS防护和输入验证');
    }
    
    return recommendations;
  }
  
  // 发送监控数据
  sendToMonitoring(data) {
    // 发送到监控系统 (如 Prometheus, DataDog等)
    console.log('Security metric:', data);
  }
  
  // 发送安全报警
  sendAlert(eventType, severity) {
    const alert = {
      title: `安全警报: ${eventType}`,
      severity,
      timestamp: new Date().toISOString(),
      message: `检测到${severity}级别的安全事件: ${eventType}`
    };
    
    // 发送邮件/短信/Slack通知
    console.log('Security alert:', alert);
  }
}

const securityMetrics = new SecurityMetrics();

// 定期生成安全报告
setInterval(() => {
  const report = securityMetrics.generateSecurityReport();
  console.log('Daily Security Report:', report);
}, 24 * 60 * 60 * 1000); // 每24小时
```

### 2. 安全仪表板

```html
<!-- 安全监控仪表板 -->
<!DOCTYPE html>
<html>
<head>
    <title>STAR购物平台 - 安全监控仪表板</title>
    <style>
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 20px; }
        .metric-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-top: 5px; }
        .risk-low { color: #10b981; }
        .risk-medium { color: #f59e0b; }
        .risk-high { color: #ef4444; }
        .risk-critical { color: #dc2626; background: #fee2e2; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="metric-card">
            <div class="metric-value" id="security-score">95</div>
            <div class="metric-label">安全评分</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value risk-low" id="risk-level">LOW</div>
            <div class="metric-label">风险等级</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value" id="failed-logins">12</div>
            <div class="metric-label">今日登录失败次数</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value" id="security-events">3</div>
            <div class="metric-label">今日安全事件</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value" id="attack-attempts">0</div>
            <div class="metric-label">攻击尝试次数</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value" id="active-sessions">156</div>
            <div class="metric-label">活跃会话数</div>
        </div>
    </div>
    
    <script>
        // 实时更新安全指标
        async function updateSecurityMetrics() {
            try {
                const response = await fetch('/api/security/metrics');
                const data = await response.json();
                
                document.getElementById('security-score').textContent = data.securityScore;
                document.getElementById('risk-level').textContent = data.riskLevel;
                document.getElementById('failed-logins').textContent = data.failedLogins;
                document.getElementById('security-events').textContent = data.securityEvents;
                document.getElementById('attack-attempts').textContent = data.attackAttempts;
                document.getElementById('active-sessions').textContent = data.activeSessions;
                
                // 更新风险等级样式
                const riskElement = document.getElementById('risk-level');
                riskElement.className = `metric-value risk-${data.riskLevel.toLowerCase()}`;
            } catch (error) {
                console.error('Failed to update security metrics:', error);
            }
        }
        
        // 每30秒更新一次
        setInterval(updateSecurityMetrics, 30000);
        updateSecurityMetrics();
    </script>
</body>
</html>
```

## 🎯 总结

### 安全目标达成

✅ **已实现的安全措施**:
- 输入验证和SQL注入防护
- XSS和CSRF防护
- JWT身份认证
- 数据加密和脱敏
- 安全监控和日志
- 支付安全保护

🔄 **持续改进计划**:
- 定期安全审计
- 漏洞扫描和修复
- 安全培训和意识提升
- 合规性检查和更新

### 联系支持

如需安全相关支持，请联系:
- **安全团队邮箱**: security@star-shopping.com
- **紧急安全热线**: +86-400-SECURITY
- **漏洞报告**: security-report@star-shopping.com

---

**最后更新**: 2025年7月3日  
**文档版本**: v1.0.0  
**适用版本**: STAR购物平台 v2.2.0+