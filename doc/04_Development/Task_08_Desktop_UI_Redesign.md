# Task 08 — 桌面端 UI 布局重塑

**关联文档**：[Web_Migration_Blueprint](../03_Design/Web_Migration_Blueprint.md) · [Progress_Assessment_20260617](./Progress_Assessment_20260617.md)  
**背景**：当前 UI 由 UniApp 小程序迁移而来，大量保留了移动端布局习惯（窄列居中、全宽按钮、竖排卡片）。本次任务将 UI 调整为真正的桌面端优先设计。  
**预估工时**：2 天

---

## 背景诊断

### 移动端残留清单

| # | 症状 | 出现位置 | 在1920px屏幕表现 |
|---|------|---------|-----------------|
| 1 | 内容区 max-width 过窄（720~800px） | 8 个 teacher 页面 | 内容仅占 37%~42% 宽度 |
| 2 | 单列居中布局，无分栏 | 所有 teacher 页面 | 两侧大面积空白 |
| 3 | 全宽按钮 `width: 100%` | 4 个页面 | 短按钮拉伸到一整行 |
| 4 | 预览页服务卡片竖排 | paper/preview | 下载/打印上下堆叠 |
| 5 | 组卷配置全部纵向堆叠 | paper/config | 浪费横向空间 |
| 6 | 筛选栏 input 仅 160px | 全局 filter-bar | 知识点名称显示不全 |
| 7 | 首页9宫格等大无层次 | index | 缺乏主次引导 |
| 8 | 响应式仅 768px 一个断点 | global.scss | 无中间过渡 |
| 9 | TopNav 宽屏下内容稀疏 | TopNav | Logo→3链接→用户区，中间空 |

---

## Phase 1：宽度统一 — 改数字即可 (0.5h)

### 1.1 页面 max-width 提升

将以下文件的 `max-width` 统一调整：

- [ ] [print/checkout/index.vue](frontend-web/src/pages/print/checkout/index.vue#L36)：`720px` → `1200px`
- [ ] [paper/config/index.vue](frontend-web/src/pages/paper/config/index.vue#L134)：`800px` → `1200px`
- [ ] [orders/index.vue](frontend-web/src/pages/orders/index.vue#L48)：`800px` → `1200px`
- [ ] [profile/index.vue](frontend-web/src/pages/profile/index.vue#L76)：`800px` → `1200px`
- [ ] [paper/preview/index.vue](frontend-web/src/pages/paper/preview/index.vue#L85)：`800px` → `1400px`（需要更宽容纳双栏）
- [ ] [exercises/index.vue](frontend-web/src/pages/exercises/index.vue#L46)：`1000px` → `1200px`
- [ ] [contribute/index.vue](frontend-web/src/pages/contribute/index.vue#L19)：`1000px` → `1200px`
- [ ] [index/index.vue](frontend-web/src/pages/index/index.vue#L83)：`1100px` → `1400px`

**原则**：
- 纯内容阅读页（组卷配置、订单列表、个人中心、练习）：**1200px**
- 需要容纳多栏或卡片网格的页面（首页、试卷预览、打印结算）：**1400px**

> 全局 `.container` ([global.scss:2](frontend-web/src/styles/global.scss#L2)) 已在 1400px，无需改动。

### 1.2 表单元素宽度调整

- [ ] [global.scss:129-131](frontend-web/src/styles/global.scss#L129-L131)：`.filter-bar .el-select, .el-input` 从 `width: 160px` 改为 `min-width: 180px; width: auto; max-width: 240px`

---

## Phase 2：布局升级 — 从单列到多栏 (1h)

### 2.1 试卷预览页：服务卡片横排

**文件**：[paper/preview/index.vue](frontend-web/src/pages/paper/preview/index.vue#L89)

- [ ] `.diversion` 从 `flex-direction: column` 改为 `flex-direction: row`
- [ ] `.service-card` 添加 `flex: 1` 使两张卡等宽
- [ ] 在 `@media (max-width: 768px)` 时恢复为 `column` 竖排

```scss
// 改前
.diversion { display: flex; flex-direction: column; gap: $spacing-md; }

// 改后
.diversion { display: flex; gap: $spacing-lg; 
  .service-card { flex: 1; }
}
@media (max-width: 768px) {
  .diversion { flex-direction: column; }
}
```

### 2.2 组卷配置页：左右双栏布局

**文件**：[paper/config/index.vue](frontend-web/src/pages/paper/config/index.vue#L69-L131)

当前所有表单项纵向堆叠。改为左右双栏：

- [ ] 左侧栏（flex: 1）：学段→年级→科目→知识点
- [ ] 右侧栏（width: 360px）：难度→题量→生成按钮（sticky 固定在视口）
- [ ] "开始AI组卷"按钮从底部中央移到右侧栏底部

```scss
// 结构变更
.config-page { max-width: 1200px; margin: 0 auto; }
.config-layout { display: flex; gap: $spacing-lg; align-items: flex-start; }
.config-left { flex: 1; min-width: 0; }
.config-right { width: 360px; flex-shrink: 0; position: sticky; top: $top-nav-height + $spacing-lg; }
```

template 结构变更（伪代码）：
```html
<div class="config-layout">
  <div class="config-left">
    <!-- 学段/年级/科目/知识点卡片 -->
  </div>
  <div class="config-right">
    <!-- 难度/题量卡片 + 生成按钮 -->
  </div>
</div>
```

- [ ] 知识点 tag-group 区域添加 `max-height: 300px; overflow-y: auto` 防止知识点过多时撑高

### 2.3 打印结算页：双栏布局

**文件**：[print/checkout/index.vue](frontend-web/src/pages/print/checkout/index.vue#L25-L32)

- [ ] 左侧：份数选择 + 分档计费表
- [ ] 右侧：收货地址 + 确认下单按钮

---

## Phase 3：按钮与组件微调 (0.5h)

### 3.1 全宽按钮 → 自适应宽度

- [ ] [print/checkout/index.vue:32](frontend-web/src/pages/print/checkout/index.vue#L32)：确认下单 `style="width:100%"` → `style="min-width: 240px"`
- [ ] [exercises/index.vue:40](frontend-web/src/pages/exercises/index.vue#L40)：下一步 `style="width:100%"` → `style="min-width: 200px"`
- [ ] [admin/upload/index.vue:22](frontend-web/src/pages/admin/upload/index.vue#L22)：上传按钮 `style="width:100%"` → `style="min-width: 220px"`
- [ ] [profile/index.vue:70](frontend-web/src/pages/profile/index.vue#L70)：退出登录 `style="width:100%"` → `style="max-width: 320px"`

> 登录页 ([login/index.vue:202](frontend-web/src/pages/login/index.vue#L202)) 全宽按钮保留不改——登录卡片 420px，全宽合理。

### 3.2 地址选择器宽度

- [ ] [print/checkout/index.vue:30](frontend-web/src/pages/print/checkout/index.vue#L30)：地址 `<el-select style="width:100%">` → `style="width: 100%; max-width: 600px"`

---

## Phase 4：首页重构 — 差异化卡片层次 (1h)

**文件**：[index/index.vue](frontend-web/src/pages/index/index.vue#L106-L111)

### 4.1 卡片网格改为 4 列

- [ ] `.features` 从 `grid-template-columns: repeat(3, 1fr)` 改为 `repeat(4, 1fr)`
- [ ] 响应式：`@media (max-width: 1200px)` 降为 3 列，`@media (max-width: 768px)` 降为 2 列

### 4.2 前两张核心卡片做大做强

- [ ] "AI智能组卷" 卡片：`grid-column: span 2`，更大的图标和内边距，使用渐变背景微亮色
- [ ] 或改为 Hero 区下方第一行只放 2 张宽卡（核心功能），第二行 4 张标准卡（练习功能），第三行 3 张标准卡（辅助功能）

### 4.3 Hero 区增强

- [ ] 添加副标题下的统计数字条（已有后台统计接口可复用的前提下）例如：「已服务 X 名教师 · 题库 X 道题 · 生成 X 份试卷」
- [ ] 或添加一张组卷流程示意图（3 步骤：选条件 → AI生成 → 下载打印）

---

## Phase 5：TopNav 增强 (0.5h)

**文件**：[TopNav.vue](frontend-web/src/components/TopNav.vue#L10-L20)

### 5.1 导航项外露

当前「同步练习」和「我的贡献」藏在用户下拉菜单里，桌面端应直接暴露在导航栏。

- [ ] `navItems` 增加「同步练习」(`/exercises`)
- [ ] 判断：如果已登录则显示「我的贡献」(`/contribute`)
- [ ] 导航项数量变为 5~6 个，TopNav 不再空荡

### 5.2 用户区优化

- [ ] 未登录状态：除「登录」按钮外，加一个「注册」按钮（跳转登录页，首次登录即注册）
- [ ] 或在右侧添加一个搜索框（搜题目/知识点）——但需确认后端有对应 API，非必须

---

## Phase 6：响应式补全 (0.5h)

**文件**：[global.scss](frontend-web/src/styles/global.scss#L185-L209)

### 6.1 新增断点

当前只有 `768px` 一个断点。新增两个中间断点：

- [ ] `@media (max-width: 1200px)`：
  - `.container` padding 减小
  - 首页 features 从 4 列降为 3 列
  - 组卷配置双栏恢复为单栏
  - 预览页服务卡片恢复竖排

- [ ] `@media (max-width: 1024px)`：
  - 页面 `max-width` 统一降为 `100%`（撑满）
  - TopNav 导航间距缩小
  - `.stat-cards` 从 `auto-fit` 降为 3 列

- [ ] 保留 `@media (max-width: 768px)`：
  - 首页 features 降为 2 列
  - admin sidebar 隐藏/折叠
  - 筛选栏全宽
  - TopNav 导航项精简或折叠为汉堡菜单（可选，非必须）

---

## Phase 7：细节打磨 (0.5h)

- [ ] 所有页面卡片间距统一为 `$spacing-lg`（24px）
- [ ] 表单 label 字体大小统一 `$font-size-sm`，颜色统一 `$text-color-secondary`
- [ ] `el-table` 添加 `stripe` 属性提升可读性
- [ ] 页面标题 `h1` 统一使用 `.page-header__title` 类
- [ ] 所有「返回首页」面包屑第一级统一链接到 `/`
- [ ] 空状态 `el-empty` 添加友好的 description 文案
- [ ] 管理后台各页 `el-pagination` 统一添加 `layout="total, prev, pager, next"` 显示总数

---

## 验收标准

- [ ] 8 个页面 `max-width` 已提升至 1200~1400px
- [ ] 试卷预览页服务卡片在宽屏下水平并排
- [ ] 组卷配置页在宽屏下左右双栏
- [ ] 4 个全宽按钮改为自适应宽度
- [ ] 首页卡片网格在宽屏下展示 4 列
- [ ] 筛选栏下拉框宽度不再截断内容
- [ ] TopNav 导航可见项 ≥ 5 个
- [ ] 3 个响应式断点 (1200px / 1024px / 768px) 过渡流畅
- [ ] `npm run build` 0 错误
- [ ] 1920px / 1366px / 1024px / 768px 四种分辨率下布局均无溢出、无过度空白

---

## 改动文件清单

| 文件 | 改动类型 | 风险 |
|------|---------|------|
| [index/index.vue](frontend-web/src/pages/index/index.vue) | 布局 + 样式 | 低 |
| [paper/config/index.vue](frontend-web/src/pages/paper/config/index.vue) | 布局重构 | **中**（template 结构调整） |
| [paper/preview/index.vue](frontend-web/src/pages/paper/preview/index.vue) | 布局 + 样式 | 低 |
| [orders/index.vue](frontend-web/src/pages/orders/index.vue) | 样式 | 极低 |
| [profile/index.vue](frontend-web/src/pages/profile/index.vue) | 样式 | 极低 |
| [print/checkout/index.vue](frontend-web/src/pages/print/checkout/index.vue) | 布局 + 样式 | 低 |
| [exercises/index.vue](frontend-web/src/pages/exercises/index.vue) | 样式 | 极低 |
| [contribute/index.vue](frontend-web/src/pages/contribute/index.vue) | 样式 | 极低 |
| [admin/upload/index.vue](frontend-web/src/pages/admin/upload/index.vue) | 样式 | 极低 |
| [TopNav.vue](frontend-web/src/components/TopNav.vue) | 逻辑 + 样式 | 低 |
| [global.scss](frontend-web/src/styles/global.scss) | 样式 | **中**（全局影响） |
| **共 11 个文件** | | |

---

> **本任务为纯前端 UI 调整，不改动任何业务逻辑、API 调用和 Pinia Store。所有改动仅限于 `<style>` 和 `<template>` 的布局结构。**
