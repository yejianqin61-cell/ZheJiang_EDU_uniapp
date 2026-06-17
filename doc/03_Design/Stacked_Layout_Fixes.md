# 单列堆叠布局 — 排查 & 改进方案

**日期**: 2026-06-17  
**范围**: `frontend-web/src/pages` 全部 34 个页面

---

## 一、排查结果

已排查全部 34 个页面。**已修复** 14 个（Task_08/10），**无需修复** 4 个（表格/全宽），**待修复** 12 个，**可接受** 2 个。

### 🔴 HIGH — 8 个页面（max-width ≤ 720px，1920px 屏幕浪费 >60%）

| 页面 | max-width | 浪费比例 | 问题 |
|------|-----------|---------|------|
| [payment](frontend-web/src/pages/payment/index.vue#L75) | **520px** | 73% | 订单摘要 + 2 个支付卡片竖排 |
| [profile/balance](frontend-web/src/pages/profile/balance/index.vue) | **640px** | 67% | 余额卡片 + 说明文字竖排 |
| [profile/withdraw](frontend-web/src/pages/profile/withdraw/index.vue) | **640px** | 67% | 单张表单卡片 |
| [orders/detail](frontend-web/src/pages/orders/detail/index.vue#L65) | **700px** | 64% | 订单信息+物流+时间线竖排 |
| [contribute/detail](frontend-web/src/pages/contribute/detail/index.vue) | **720px** | 63% | info-grid 竖排 |
| [contribute/exercise-detail](frontend-web/src/pages/contribute/exercise-detail/index.vue#L58) | **720px** | 63% | 同上 |
| [contribute/upload](frontend-web/src/pages/contribute/upload/index.vue) | **720px** | 63% | 表单卡片单列 |
| [address/edit](frontend-web/src/pages/address/edit/index.vue) | **720px** | 63% | el-form 单列 |

### 🟡 MEDIUM — 4 个页面（800-1000px，浪费 48-58%）

| 页面 | max-width | 浪费比例 | 问题 |
|------|-----------|---------|------|
| [contribute/exercise-upload](frontend-web/src/pages/contribute/exercise-upload/index.vue#L108) | **800px** | 58% | 表单 section 竖排 |
| [address/list](frontend-web/src/pages/address/list/index.vue) | **900px** | 53% | 地址卡片竖排 |
| [contribute/preview](frontend-web/src/pages/contribute/preview/index.vue) | **1000px** | 48% | 题目卡片竖排 |
| [exercises/category](frontend-web/src/pages/exercises/category.vue#L56) | **1000px** | 48% | 类目/课时卡片竖排 |

---

## 二、改进方案

### 2.1 支付页（520px → 双栏）

**当前**：520px 单列，订单摘要 + 余额支付 + 支付宝 + Mock 四张卡竖排。

**改进**：
- max-width → 800px
- 左侧：订单摘要（金额大字）
- 右侧：支付方式（余额/支付宝/Mock 竖排）

### 2.2 余额页 + 提现页（640px → 并入个人中心？或加宽）

**当前**：640px 窄列。

**改进**：max-width → 900px，内容居中但不再过窄。这两个页面内容少（1-2 张卡），不需要双栏。

### 2.3 订单详情页（700px → 双栏）

**当前**：700px，订单信息 + 物流时间线上下堆叠。

**改进**：max-width → 1200px，左侧订单信息 + 右侧物流时间线。

### 2.4 贡献详情 / 练习详情页（720px → 加宽）

**改进**：max-width → 900px。详情页以阅读为主，不宜过宽但 720px 太窄。

### 2.5 题库上传页（720px → 加宽 + 表单项并排）

**改进**：max-width → 1000px，学科/年级用 `el-row` 并排。

### 2.6 地址编辑页（720px → 加宽 + 表单双列）

**改进**：max-width → 1000px，省市区三下拉并排，详情地址占一整行。

### 2.7 练习上传页（800px → 加宽）

**改进**：max-width → 1000px。

### 2.8 地址列表页（900px → 卡片网格）

**改进**：max-width → 1200px，地址卡片 `grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`。

### 2.9 题库预览页（1000px → 加宽）

**改进**：max-width → 1200px。

### 2.10 练习类目页（1000px → 加宽 + 双列网格）

**改进**：max-width → 1200px，类目卡片 `grid-template-columns: repeat(2, 1fr)`。

---

## 三、改动清单

| 页面 | 改动 | 当前 | 目标 |
|------|------|------|------|
| payment | 双栏 | 520px | 800px + 左右分栏 |
| profile/balance | 加宽 | 640px | 900px |
| profile/withdraw | 加宽 | 640px | 900px |
| orders/detail | 双栏 | 700px | 1200px + 左右分栏 |
| contribute/detail | 加宽 | 720px | 900px |
| contribute/exercise-detail | 加宽 | 720px | 900px |
| contribute/upload | 加宽+并排 | 720px | 1000px |
| address/edit | 加宽+并排 | 720px | 1000px |
| contribute/exercise-upload | 加宽 | 800px | 1000px |
| address/list | 卡片网格 | 900px | 1200px |
| contribute/preview | 加宽 | 1000px | 1200px |
| exercises/category | 加宽+双列 | 1000px | 1200px |

**共 12 个文件，预估 1.5h**（大部分只改数字，少数需结构调整）
