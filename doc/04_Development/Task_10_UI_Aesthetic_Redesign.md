# Task 10 — UI 美学升级（温润学术风）

**关联文档**：[UI_Design_Audit](../03_Design/UI_Design_Audit.md) · [Task_08_Desktop_UI_Redesign](./Task_08_Desktop_UI_Redesign.md)  
**背景**：Task_08 解决了布局桌面化（宽窄、单栏→双栏），但视觉风格仍停留"功能工具"阶段。本次在布局基础上注入品牌美学。  
**预估工时**：4 小时

---

## 设计方向：温润学术风 (Warm Academic)

**关键词**：纸质试卷 / 红笔批改 / 墨香书卷  
**用户**：浙江中小学教师 → 需要专业感、信任感、效率感

### 配色体系

```
主色：   #d4743a  温橙（保留原 #e67e22 的暖感，降饱和更沉稳）
浅色：   #e8a87c  浅橙（hover、边框、淡背景）
深色：   #a0522d  深棕橙（active、文字强调）
朱砂红： #c0392b  价格、重要提示、删除
墨绿：   #2c5f2d  成功、通过、教育联想

中性色（warm gray）：
  深棕黑： #3d322b  正文（替代 #2c3e50）
  暖灰：   #8b7e74  次要文字（替代 #7f8c8d）
  浅暖灰： #bfb3a8  占位符（替代 #bdc3c7）
  暖边框： #e8e0d5  分割线（替代 #ecf0f1）
  米白页： #faf7f2  页面背景（替代 #faf6f1）
  纯白卡： #ffffff  卡片背景

阴影：
  card:   0 2px 16px rgba(61, 50, 43, 0.06)
  hover:  0 8px 30px rgba(61, 50, 43, 0.10)
```

### 字体体系

- **标题**：`"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif`
- **正文**：`"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif`
- **数字/英文**：`"DM Sans", "Inter", sans-serif`（等宽数字用于价格）
- **字体加载**：`<link rel="preload" as="font">` + `font-display: swap`

---

## Phase 1：品牌感知（1.5h）

### 1.1 色彩体系刷新

**文件**：[variables.scss](frontend-web/src/styles/variables.scss)

- [ ] 主色从 `#e67e22` → `#d4743a`（降饱和 5%，更沉稳）
- [ ] `$color-primary-light` → `#e8a87c`
- [ ] `$color-primary-dark` → `#a0522d`
- [ ] 新增 `$color-accent-red: #c0392b`（朱砂红）
- [ ] 新增 `$color-accent-green: #2c5f2d`（墨绿）
- [ ] 中性色全部改为 warm gray 系列
- [ ] 背景色 `$bg-color` → `#faf7f2`（米白）
- [ ] 阴影 rgba 值改用新色系

### 1.2 字体引入 + 加载

**文件**：[index.html](frontend-web/index.html) + [reset.scss](frontend-web/src/styles/reset.scss)

- [ ] `<link rel="preconnect" href="https://fonts.googleapis.com">`
- [ ] `<link rel="preload" as="font">` 预加载思源宋体
- [ ] `<link>` 引入 Google Fonts：Noto Serif SC, DM Sans
- [ ] `reset.scss` body 字体栈更新
- [ ] 标题 `h1-h3` 使用思源宋体
- [ ] 添加 `font-display: swap` 避免 FOIT

### 1.3 TopNav 毛玻璃化

**文件**：[TopNav.vue](frontend-web/src/components/TopNav.vue)

- [ ] 背景改为 `rgba(255,255,255,0.88)` + `backdrop-filter: blur(12px)`
- [ ] 去掉橙色渐变，底部细阴影 `0 1px 3px rgba(0,0,0,0.06)`
- [ ] Logo 文字改为橙色（`$color-primary`）
- [ ] 导航链接改为深色文字，激活态橙色下划线
- [ ] 右上角个人中心图标保持蓝色

### 1.4 首页 Hero 强化

**文件**：[index.vue](frontend-web/src/pages/index/index.vue)

- [ ] 标题字体 → 思源宋体，放大到 `48px`，字重 800
- [ ] 添加 CSS 几何背景（径向渐变圆 + 网格点阵 `radial-gradient`）
- [ ] 添加信任数字行：「已服务 X 所学校 · 题库 X 道题目」
- [ ] Hero 入场动画：标题 + 副标题 + 按钮依次淡入上移（`animation-delay` 错开）
- [ ] 按钮添加 `active: scale(0.97)` 按压反馈

### 1.5 卡片层次体系

**文件**：[global.scss](frontend-web/src/styles/global.scss) + [index.vue](frontend-web/src/pages/index/index.vue)

- [ ] `.page-card` 悬停阴影加深至 `0 8px 30px rgba(61,50,43,0.10)`
- [ ] `.feature-card` 间距增大至 `$spacing-xl`（32px）
- [ ] `.feature-card--hero` 保留暖色淡背景 + 左边框强调
- [ ] 所有卡片添加 `transition: transform 0.25s ease, box-shadow 0.25s ease`

---

## Phase 2：体验打磨（1.5h）

### 2.1 路由过渡动画

**文件**：[App.vue](frontend-web/src/App.vue)

- [ ] `<router-view>` 包裹 `<transition name="page-fade">`
- [ ] CSS：`.page-fade-enter-active, .page-fade-leave-active { transition: opacity 0.2s }`
- [ ] `.page-fade-enter-from, .page-fade-leave-to { opacity: 0; transform: translateY(6px) }`

### 2.2 hover / active 交互优化

**文件**：[global.scss](frontend-web/src/styles/global.scss)

- [ ] 按钮 `active`: `transform: scale(0.97)` 按压反馈
- [ ] 卡片 hover: `translateY(-2px) scale(1.01)`（替代 `translateY(-4px)`）
- [ ] `transition` 属性只列出 transform, box-shadow, opacity（禁止 `transition: all`）

### 2.3 统一间距和宽度

**文件**：[global.scss](frontend-web/src/styles/global.scss)

- [ ] 卡片内边距 `padding` 从 `$spacing-lg`(24px) → `$spacing-xl`(32px)
- [ ] 表单组间距统一 `margin-bottom: $spacing-md`(16px)
- [ ] 筛选栏 select/input 宽度统一：短(120px)、中(180px)、长(240px)
- [ ] 页面标题与内容间距统一 `margin-bottom: $spacing-lg`(24px)

### 2.4 空状态定制

**涉及文件**：orders、contribute、exercises、admin 各页

- [ ] 订单列表：`el-empty description="还没有订单"` → 增加 `<el-button>去组卷</el-button>` 快捷操作
- [ ] 贡献列表：空状态引导到上传页
- [ ] 练习审核：空状态显示「暂无待审核试卷」

### 2.5 prefers-reduced-motion

**文件**：[global.scss](frontend-web/src/styles/global.scss)

- [ ] 全局添加 `@media (prefers-reduced-motion: reduce)`
- [ ] 禁用所有 `transition`、`animation`、`transform` 动效
- [ ] 路由过渡也在该条件下关闭

---

## Phase 3：无障碍 & 细节（1h）

### 3.1 无障碍补全

- [ ] [TopNav.vue](frontend-web/src/components/TopNav.vue)：个人中心 icon 按钮加 `aria-label="个人中心"`
- [ ] [index.vue](frontend-web/src/pages/index/index.vue)：所有 `@click` 卡片包装为 `<button>` 或加 `role="button" tabindex="0"` + `@keydown.enter`
- [ ] [index.html](frontend-web/index.html)：添加 `<meta name="theme-color" content="#d4743a">`
- [ ] [global.scss](frontend-web/src/styles/global.scss)：添加 `scroll-margin-top: 72px` 到 `h1, h2, h3`（TopNav 高度 + 缓冲）
- [ ] [global.scss](frontend-web/src/styles/global.scss)：`html` 设置 `color-scheme: light`

### 3.2 图片 CLS 防护

- [ ] [draw.vue](frontend-web/src/pages/exercises/draw.vue)：缩略图 `<img>` 添加 `width="720" height="960"`
- [ ] [index.vue](frontend-web/src/pages/index/index.vue)：Hero 若加图片，同样加宽高

### 3.3 文案细节

- [ ] 全局搜索 `...` → `…`（U+2026）
- [ ] 加载文案：「加载中…」「保存中…」
- [ ] 金额格式化 composable：[useFormat.ts](frontend-web/src/composables/useFormat.ts)（新建）
  - `formatCurrency(cents: number)` → `¥12,500.00`

### 3.4 按钮文本

- [ ] 全局审核按钮文本统一：「通过」「拒绝」「删除」「保存」
- [ ] 避免使用「确定」「取消」类模糊文案（Element Plus `ElMessageBox` 除外）

---

## 验收标准

- [ ] 导航栏毛玻璃效果，橙色文字 Logo
- [ ] 思源宋体标题在首页、登录页可见
- [ ] 卡片 hover 有浮起感，按钮有按压反馈
- [ ] 首页 Hero 有入场动画 + 背景几何装饰
- [ ] 路由切换有淡入过渡
- [ ] 空状态有引导文案和快捷按钮
- [ ] `prefers-reduced-motion` 下所有动效关闭
- [ ] icon-only 按钮有 `aria-label`
- [ ] `<meta name="theme-color">` 已设置
- [ ] 价格数字千分位格式化
- [ ] `...` → `…`
- [ ] `npm run build` 0 错误

---

## 改动文件清单

| Phase | 文件 | 改动类型 | 风险 |
|-------|------|---------|------|
| 1.1 | `styles/variables.scss` | 色彩重定义 | **高**—全局影响 |
| 1.2 | `index.html` + `styles/reset.scss` | 字体引入 | 中 |
| 1.3 | `components/TopNav.vue` | 样式重构 | 中 |
| 1.4 | `pages/index/index.vue` | 样式+模板 | 中 |
| 1.5 | `styles/global.scss` | 卡片阴影+间距 | 低 |
| 2.1 | `App.vue` | transition 包裹 | 低 |
| 2.2 | `styles/global.scss` | hover/active 统一 | 低 |
| 2.3 | `styles/global.scss` | 间距宽度统一 | 低 |
| 2.4 | orders/contribute/exercises 各页 | 空状态文案 | 低 |
| 2.5 | `styles/global.scss` | reduced-motion | 低 |
| 3.1 | TopNav + index + index.html + global | aria+meta | 低 |
| 3.2 | draw.vue + index.vue | img 属性 | 低 |
| 3.3 | 全局 + composable | 文案+格式化 | 低 |
| 3.4 | admin 审核各页 | 按钮文案 | 低 |
| **共 16 个文件** | | | |
