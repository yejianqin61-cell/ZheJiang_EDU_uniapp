# 瓯越AI组题网 — UI 设计审计 & 优化方案

**评估基准**：Vercel Web Interface Guidelines + Frontend Design 美学原则  
**评估范围**：`frontend-web/src` 全部页面、组件、样式  
**日期**：2026-06-17

---

## 一、整体评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整性 | ★★★★☆ | 所有页面功能齐全，Element Plus 组件正确使用 |
| 色彩体系 | ★★★☆☆ | 橙色主色明确，但缺乏层次和点缀色 |
| 字体排版 | ★★☆☆☆ | 系统默认字体，无品牌特色，层级单调 |
| 空间构成 | ★★★☆☆ | 单列居中布局多，缺乏张力和节奏感 |
| 视觉层次 | ★★☆☆☆ | 卡片齐平，缺少大小对比和信息优先级引导 |
| 动效微交互 | ★☆☆☆☆ | 几乎无动效，仅 hover 上移和颜色过渡 |
| 细节打磨 | ★★☆☆☆ | 功能性到位，但缺乏品牌感和精致感 |
| 无障碍 | ★☆☆☆☆ | 缺少 aria-label、焦点状态、语义化标签 |

---

## 二、问题清单（按严重程度）

### 🔴 P0 — 影响品牌感和第一印象

#### 2.1 字体过于通用

**文件**：[variables.scss](frontend-web/src/styles/variables.scss#L16)

```scss
$font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
```

**问题**：纯系统字体栈，没有任何品牌识别度。教师群体对「教育类产品」有天然信任期待，系统字体给人"内部工具"而非"专业平台"的感觉。

**建议**：
- 标题字体：引入 **"思源宋体"**（Noto Serif SC）或 **"站酷文艺体"** 作为展示字体，体现教育/文化气质
- 正文字体：保留 `Microsoft YaHei` + `PingFang SC` 中文栈，确保可读性
- 数字/英文：搭配 `"DM Sans"` 或 `"Inter"` — 但要主观选择避免 cliché
- 备选方案：**"LXGW WenKai"**（霞鹜文楷）作为标题 — 书法感强，教育联想直接

#### 2.2 色彩过于平面化

**文件**：[variables.scss](frontend-web/src/styles/variables.scss#L1-L8)

**问题**：
- 橙色主色 `#e67e22` 单一，缺少明暗层次
- 背景色 `#faf6f1`（暖米色）意图好但太浅，几乎不可见，等于白色
- 缺少点缀色 —— 整个页面只有橙+白+灰，单调

**建议**：
- 主色保持 `#e67e22`，新增渐变色阶（`#f5a623` → `#e67e22` → `#c0392b`）
- 背景改为 **暖灰调**（`#f5f0eb` 或 `#faf7f2`），比纯白有温度
- 引入 **点缀色**：`#2c5f2d`（深绿，代表教育/成长）用于成功状态和重点强调
- 增加 **中性色阶**：不是单一灰色，而是 warm gray 系列（`#8b7e74`, `#a09890`）

#### 2.3 TopNav 渐变生硬

**文件**：[TopNav.vue](frontend-web/src/components/TopNav.vue#L93)

```scss
background: linear-gradient(135deg, $color-primary, $color-primary-dark);
```

**问题**：`#e67e22` → `#d35400` 渐变跨度小，几乎看不出渐变效果。56px 高度的导航栏用纯色更干净。

**建议**：
- 改用 **半透明毛玻璃** 风格：`background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);` 搭配底部细阴影
- 或者 **纯白导航栏** + 橙色文字 Logo + 底部 1px 暖色边框
- 若保持橙色：不要渐变，纯 `#e67e22`，降低饱和度 5%，更现代

#### 2.4 首页 Hero 区缺乏视觉冲击力

**文件**：[index.vue](frontend-web/src/pages/index/index.vue#L20-L28)

**问题**：Hero 区只有一个标题+副标题+按钮，没有任何视觉元素（插图、几何装饰、背景纹理），像段落而非 Hero。

**建议**：
- 添加 **几何背景图案**（CSS-only 网格、点阵或渐变圆）
- 标题放大到 `48-56px`，提升字重到 800+
- 添加一行 **信任数字**："已为 X 所学校服务 · 题库 X 道题目"
- 考虑添加 **淡入上移动画** 作为页面加载的第一印象

---

### 🟡 P1 — 影响用户体验和精致感

#### 2.5 卡片缺乏层次和对比

**涉及**：几乎所有页面的 `.page-card`、`.feature-card`

**问题**：所有卡片 `border-radius: 8px`、`box-shadow: 0 1px 6px`，白色背景统一 —— 卡片之间没有视觉区别，一眼望去全是白方块。

**建议**：
- 核心卡片（AI 组卷）用暖色淡背景（`#fef9f0`）+ 左边框强调色
- 增大卡片间距到 `$spacing-xl`（32px），留白即呼吸
- 悬停阴影加深到 `0 8px 30px`，制造"浮起"层次感
- 给不同优先级卡片设置不同的视觉权重（边框、背景色、阴影强度）

#### 2.6 无加载/过渡动效

**涉及**：整个应用

**问题**：页面切换是瞬间闪现，列表加载是突然出现。唯一的动效是 `transition: all 0.2s` 和 `hover` 上移。

**建议**：
- 路由切换：添加 `<router-view>` 的 **淡入过渡**（`<transition name="fade">`）
- 列表/表格：**交错入场动画**（staggered list animation）
- 按钮：`active` 状态加 `scale(0.97)` 按压反馈
- 卡片 hover：从 `translateY(-4px)` 改为更自然的 `translateY(-2px) scale(1.01)`
- **遵循 prefers-reduced-motion**

#### 2.7 表单元素间距不一致

**涉及**：`form-group`、`filter-bar`、各页表单

**问题**：label 和 input 间距、表单组间距、卡片内边距在不同页面不一致。
- 有的用 `margin-bottom: $spacing-lg`，有的用 `mt-md`
- 筛选栏输入框宽度不统一（`160px`、`200px`、`100%`）

**建议**：
- 统一表单垂直间距为 `$spacing-md`（16px）
- 统一输入框宽度：短文本 `180px`、中文本 `240px`、长文本 `100%`
- 统一卡片内边距为 `$spacing-xl`（32px），当前 `$spacing-lg`（24px）偏紧

#### 2.8 空状态和错误状态单调

**涉及**：所有使用 `el-empty` 的页面

**问题**：只显示 Element Plus 默认的 `el-empty` 组件，没有定制描述或插图。

**建议**：
- 自定义空状态插图（CSS 插画或 SVG）
- 描述文案更友好："还没有订单，去组一份试卷开始吧" + 快捷按钮

---

### 🟢 P2 — 细节打磨

#### 2.9 无障碍缺失

| 规则 | 状态 | 位置 |
|------|------|------|
| `<html lang>` | ✅ 已有 `zh-CN` | index.html:2 |
| `<meta name="theme-color">` | ❌ 缺失 | index.html |
| icon-only 按钮无 `aria-label` | ❌ | TopNav 个人中心按钮 |
| 焦点状态 | ⚠️ 依赖 Element Plus 默认 | 全局 |
| `<button>` vs `<div onClick>` | ⚠️ 卡片用 `@click` 在 `<div>` 上 | 多处 feature-card |
| `scroll-margin-top` on headings | ❌ 缺失 | 全站 |
| `prefers-reduced-motion` | ❌ 未处理 | 全局 |

#### 2.10 图片缺少宽高属性

**涉及**：`draw.vue` 缩略图、`index.vue` Hero 图

**问题**：`<img>` 标签没有 `width`/`height`，会导致 Cumulative Layout Shift (CLS)。

#### 2.11 submit 按钮无 loading 保护

**涉及**：多处表单

**问题**：部分表单的提交按钮在请求期间没有禁用，可重复点击。

#### 2.12 数字格式未国际化

**涉及**：所有价格显示

```html
¥{{ (amount/100).toFixed(2) }}
```

**建议**：中文环境下应显示 `¥12.00` 而非 `¥12`（已正确使用了 `.toFixed(2)`）。但更大金额（如 `¥12500.00`）应加千分位：`¥12,500.00`。

#### 2.13 省略号格式

**涉及**：多处 `...`

英文省略号应该用 `…`（U+2026）而非三个点 `...`。中文也应用 `…`。

#### 2.14 暗色模式无支持

当前 `html` 未设置 `color-scheme`，不支持系统暗色模式。作为教师工具，可能不需要完整暗色模式，但至少应该设置 `<meta name="theme-color">`。

---

## 三、优化方案（按优先级）

### Phase 1：品牌感知提升（1.5h）

| # | 改动 | 文件 | 影响 |
|---|------|------|------|
| 1 | 引入思源宋体标题字体 | `index.html` + `variables.scss` | 品牌辨识度 |
| 2 | 色彩体系扩展（渐变+点缀色+warm gray） | `variables.scss` | 整个应用 |
| 3 | TopNav 改为毛玻璃白色导航栏 | `TopNav.vue` | 第一印象 |
| 4 | 首页 Hero 几何背景 + 信任数字 + 入场动画 | `index.vue` | 首页冲击力 |
| 5 | 卡片层次体系（核心卡 vs 普通卡） | `index.vue` + `global.scss` | 视觉引导 |

### Phase 2：体验打磨（1.5h）

| # | 改动 | 文件 |
|---|------|------|
| 6 | 路由过渡动画 + 列表交错入场 | `App.vue` + 全局 CSS |
| 7 | 卡片 hover 动效优化 + 按压反馈 | `global.scss` |
| 8 | 统一表单间距和输入框宽度 | `global.scss` |
| 9 | 空状态定制（文案+快捷操作） | 多处 el-empty |
| 10 | prefers-reduced-motion 支持 | `global.scss` |

### Phase 3：无障碍 & 细节（1h）

| # | 改动 | 文件 |
|---|------|------|
| 11 | aria-label 补全、焦点状态 | 组件 |
| 12 | meta theme-color、scroll-margin-top | `index.html` + `global.scss` |
| 13 | img width/height 属性 | `draw.vue`, `index.vue` |
| 14 | 省略号 `...` → `…` | 多处 |
| 15 | 金额千分位格式化 | composable 新建 |

---

## 四、视觉方向选择

根据 Frontend Design 原则，为 "瓯越AI组题网" 选择以下方向：

### 主方向：**温润学术风**（Warm Academic）

| 元素 | 选择 |
|------|------|
| **比喻** | 纸质试卷 + 红笔批改 + 墨香书卷 |
| **主色** | 暖橙 `#e67e22`（保留），降低饱和 5% |
| **辅助色** | 朱砂红 `#c0392b`、墨绿 `#2c5f2d` |
| **背景** | 米白 `#faf7f2` + 宣纸纹理（CSS 噪点） |
| **标题字体** | 思源宋体 Noto Serif SC |
| **正文字体** | 微软雅黑 + PingFang SC |
| **圆角** | 8px（卡片）、6px（按钮）、4px（输入框） |
| **阴影** | 柔和扩散阴影（模拟纸张叠放） |
| **动效** | 缓慢淡入、轻轻上浮（墨水在宣纸上洇开的感觉） |

### 配色方案

```scss
// 主色
$color-primary: #d4743a;        // 温橙（比 #e67e22 更沉稳）
$color-primary-light: #e8a87c;  // 浅橙
$color-primary-dark: #a0522d;   // 深棕橙

// 点缀
$color-accent-red: #c0392b;     // 朱砂红（价格、重要提示）
$color-accent-green: #2c5f2d;   // 墨绿（成功、教育联想）

// 中性色（warm gray）
$text-primary: #3d322b;         // 深棕黑（比 #2c3e50 更暖）
$text-secondary: #8b7e74;       // 暖灰
$text-placeholder: #bfb3a8;     // 浅暖灰
$border-color: #e8e0d5;         // 暖边框
$bg-page: #faf7f2;              // 米白页面背景
$bg-card: #ffffff;               // 纯白卡片
```

---

## 五、预估工时

| Phase | 内容 | 工时 |
|-------|------|------|
| Phase 1 | 品牌感知（字体+色彩+导航+Hero+卡片） | 1.5h |
| Phase 2 | 体验打磨（动效+间距+空状态+降动效） | 1.5h |
| Phase 3 | 无障碍+细节（aria+meta+格式+图片） | 1h |
| **合计** | | **4h** |
