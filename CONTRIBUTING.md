# 🤝 贡献指南

感谢您对 STAR 在线购物平台的关注！我们欢迎所有形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码风格](#代码风格)
- [测试指南](#测试指南)
- [问题报告](#问题报告)
- [功能建议](#功能建议)

## 🤝 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们作为贡献者和维护者承诺，无论年龄、体型、残疾、种族、性别认同和表达、经验水平、国籍、个人形象、种族、宗教或性取向如何，参与我们项目和社区的每个人都能获得无骚扰的体验。

### 我们的标准

**积极行为包括：**
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同情

**不可接受的行为包括：**
- 使用性化的语言或图像
- 恶意评论、人身攻击或政治攻击
- 公开或私下骚扰
- 未经明确许可发布他人的私人信息
- 在专业环境中可能被认为不当的其他行为

## 🚀 如何贡献

### 贡献类型

我们欢迎以下类型的贡献：

- 🐛 **Bug 修复**
- ✨ **新功能开发**
- 📚 **文档改进**
- 🎨 **UI/UX 优化**
- ⚡ **性能优化**
- 🧪 **测试覆盖**
- 🔧 **工具和配置**
- 🌐 **国际化支持**

### 贡献流程

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **创建 Pull Request**

## 🛠️ 开发环境设置

### 系统要求

- Node.js 16.0 或更高版本
- npm 8.0 或更高版本
- Git 2.0 或更高版本

### 安装步骤

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/your-username/STAR_Online_Shopping.git
cd STAR_Online_Shopping

# 2. 安装依赖
npm install

# 3. 设置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

# 4. 初始化数据库
npm run migrate

# 5. 启动开发服务器
npm run dev
```

### 开发工具推荐

- **IDE**: Visual Studio Code
- **扩展**: 
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API测试)

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 提交类型

- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统
- `ci`: CI配置
- `chore`: 其他杂项

### 示例

```bash
# 新功能
git commit -m "feat(cart): add delete animation effect"

# Bug修复
git commit -m "fix(cart): resolve delete button not responding"

# 文档更新
git commit -m "docs: update installation guide"

# 破坏性变更
git commit -m "feat!: change API response format"
```

## 🔄 Pull Request 流程

### 提交前检查

- [ ] 代码遵循项目风格指南
- [ ] 所有测试通过
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息符合规范

### PR 标题格式

```
<type>: <description>
```

### PR 描述模板

请使用我们提供的 [PR 模板](.github/pull_request_template.md)。

### 审查流程

1. **自动检查**: CI/CD 流水线自动运行
2. **代码审查**: 至少需要一位维护者审查
3. **测试验证**: 确保所有测试通过
4. **合并**: 审查通过后合并到主分支

## 🎨 代码风格

### JavaScript/Node.js

- 使用 2 个空格缩进
- 使用单引号
- 行末不加分号
- 最大行长度 100 字符

### HTML/EJS

- 使用 2 个空格缩进
- 属性值使用双引号
- 自闭合标签末尾加斜杠

### CSS

- 使用 2 个空格缩进
- 属性按字母顺序排列
- 使用 kebab-case 命名

### 示例配置

```json
// .eslintrc.json
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es2021": true
  },
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "never"]
  }
}
```

## 🧪 测试指南

### 测试类型

- **单元测试**: 测试单个函数或组件
- **集成测试**: 测试模块间的交互
- **端到端测试**: 测试完整的用户流程

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "cart"

# 生成覆盖率报告
npm run test:coverage
```

### 测试规范

- 测试文件命名: `*.test.js` 或 `*.spec.js`
- 测试描述使用中文
- 每个功能至少有一个测试
- 覆盖率目标: 80%+

## 🐛 问题报告

### 报告 Bug

1. 使用 [Bug 报告模板](.github/ISSUE_TEMPLATE/bug_report.md)
2. 提供详细的复现步骤
3. 包含环境信息
4. 添加相关截图或日志

### 安全问题

如果发现安全漏洞，请不要公开报告。请发送邮件到 [security@example.com](mailto:security@example.com)。

## 💡 功能建议

### 提出建议

1. 使用 [功能建议模板](.github/ISSUE_TEMPLATE/feature_request.md)
2. 详细描述用例和需求
3. 考虑实现的复杂度
4. 评估对现有功能的影响

### 讨论流程

1. **提出建议**: 创建 Issue
2. **社区讨论**: 收集反馈
3. **技术评估**: 评估可行性
4. **决策**: 决定是否实现
5. **实现**: 分配给贡献者

## 📚 文档贡献

### 文档类型

- **用户文档**: README, 使用指南
- **开发文档**: API文档, 架构说明
- **贡献文档**: 本文档, 模板

### 文档规范

- 使用 Markdown 格式
- 添加适当的表情符号
- 保持简洁明了
- 提供代码示例

## 🏷️ 版本发布

### 版本号规范

我们遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- `MAJOR.MINOR.PATCH`
- `MAJOR`: 不兼容的 API 修改
- `MINOR`: 向下兼容的功能性新增
- `PATCH`: 向下兼容的问题修正

### 发布流程

1. 更新 CHANGELOG.md
2. 更新版本号
3. 创建 Git 标签
4. 发布 GitHub Release
5. 部署到生产环境

## 🎯 路线图

查看我们的 [项目路线图](https://github.com/your-username/STAR_Online_Shopping/projects) 了解未来的开发计划。

## 📞 获取帮助

### 联系方式

- 📧 **邮件**: support@example.com
- 💬 **讨论**: [GitHub Discussions](../../discussions)
- 🐛 **问题**: [GitHub Issues](../../issues)

### 社区资源

- [常见问题](./FAQ.md)
- [故障排除](./README.md#故障排除)
- [API 文档](./docs/API.md)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

### 贡献者

<!-- 这里会自动生成贡献者列表 -->

### 特别感谢

- 所有提供反馈的用户
- 开源社区的支持
- 相关技术栈的维护者

---

**再次感谢您的贡献！** 🎉

如果您有任何问题，请随时联系我们。我们期待与您一起构建更好的 STAR 在线购物平台！