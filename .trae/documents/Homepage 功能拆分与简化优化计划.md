## 目标
- 将 `homepage.html` 的展示与交互逻辑明确分层，移除内联脚本/样式，统一到独立模块与样式文件。
- 消除重复与冲突（例如搜索脚本与购物车交互的重复引入），保持页面结构简洁、职责清晰。
- 保留现有功能与跳转路径，统一“选购/加入购物车/查看详情”的交互规范。

## 功能拆分
1. 页面结构（纯 HTML）
- 保留并精简：`banner_x`（Logo/搜索/用户按钮/购物车）、`banner_y`（分类与弹出层）、`推荐商品`（`danpin`）、`配件区块`（`peijian`）、`footer`。
- 模态与提示容器：`#cartNotification`、`#logout-modal`、`#overlay`、`#logout-overlay` 仅保留容器标签。

2. 样式文件
- 新增：`public/css/homepage.css`
  - 迁移内联样式：`overlay/cart-notification/logout-modal`（来源：`homepage.html:10-25`）。
  - 保持与现有 `public/css/style.css` 一致的命名与层叠，避免覆盖冲突。

3. 前端脚本模块（移除全部内联脚本）
- 新增目录：`public/js/homepage/`
  - `notification.js`：负责购物车提示与错误提示（来源：`homepage.html:1491-1520`）。
  - `cart.js`：统一“加入购物车”事件委托与网络处理（来源：`homepage.html:1521-1566`；合并 `public/scripts.js:57-83` 的逻辑以消除重复弹窗/alert）。
  - `nav.js`：分类导航的展开/收起逻辑（来源：`homepage.html:1571-1594`）。
  - `accessories.js`：为配件区块动态补全跳转链接（来源：`homepage.html:1596-1624`）。
  - `logout.js`：退出确认模态逻辑（来源：`homepage.html:1729-1771`）。
- 页面仅加载统一入口：`public/js/homepage/index.js`（顺序聚合调用上述模块）。

4. 第三方/已有脚本的整合
- 搜索脚本：保留单次引入 `public/js/search.js`，移除重复引入（当前重复位置：`homepage.html:1487` 与 `homepage.html:1725`）。按需只保留一个。
- 商品列表脚本：如需在首页动态渲染商品（`public/scripts.js:1-29`），保持分离；首页不再重复管理“加入购物车”，由 `homepage/cart.js` 接管并与提示模块协作。

## 交互规范统一
- “选购”链接（导航弹层右侧）统一跳转到详情页，不再隐式触发加购（现状混用，见 `homepage.html:1611-1623` 与全局 `.add-to-cart` 监听）。
- “加入购物车”按钮仅出现在推荐商品/明确的购买区域，由 `cart.js` 处理；失败/未登录走统一提示与跳转。
- 统一返回首页路径为 `"/homepage"`（存在少量 `"/homepage.html"` 引用，参见搜索结果）。

## 具体改动项
- `homepage.html`
  - 移除 `<style>` 与所有 `<script>` 内联段，替换为：
    - `link`：`/css/style.css` + 新增 `homepage.css`
    - `script`：`/js/search.js`（一次）+ `homepage/index.js`
  - 清理重复 `search.js` 引入（`homepage.html:1487` 与 `homepage.html:1725`）。
  - 保持现有 DOM 结构与类名，便于样式兼容。
- 新增文件
  - `public/css/homepage.css`
  - `public/js/homepage/index.js`
  - `public/js/homepage/notification.js`
  - `public/js/homepage/cart.js`
  - `public/js/homepage/nav.js`
  - `public/js/homepage/accessories.js`
  - `public/js/homepage/logout.js`
- 调整 `public/scripts.js`
  - 移除 `alert` 提示，导出 `addToCart(productId, quantity)` 供首页 `cart.js` 复用或保持 API 一致；避免首页与通用脚本重复绑定事件。

## 逻辑优化点
- 事件委托与幂等：仅在入口初始化一次事件委托，避免重复绑定与冲突（当前首页与 `public/scripts.js` 可能并行处理）。
- 路由一致性：统一详情跳转与首页路径，避免 404（服务路由：`app.js:74`）。
- 错误处理一致：统一 `401` 跳转与错误提示（参考现有逻辑：`homepage.html:1547-1555`）。
- 可维护性：模块化拆分后，分类导航/配件链接/购物车交互可独立迭代，不影响页面其他部分。

## 验证方案
- 启动后访问 `http://localhost:3000/homepage`，验证：
  - 搜索联动正常（`public/js/search.js:24-41, 176-202`）。
  - “选购”仅跳详情；“加入购物车”弹提示并更新状态；未登录跳转登录。
  - 退出确认模态工作正常；Esc/点击遮罩可关闭。
- 浏览器控制台无重复事件绑定/脚本冲突告警。

## 影响面与兼容性
- 不改动后端路由与数据库结构（`app.js:60-68, 74`）。
- 图片与商品链接保持不变；`search.js` 的图片路径标准化继续生效（`public/js/search.js:520-526`）。
- 侧边栏/其他页面返回首页统一至 `"/homepage"`（按需后续统一）。

确认后我将执行上述拆分与优化，并给出具体代码改动（包含新增文件与更新后的 `homepage.html`）。