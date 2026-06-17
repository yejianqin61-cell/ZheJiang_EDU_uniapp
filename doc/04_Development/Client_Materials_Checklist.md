# 甲方材料交付清单 —— 全部资料汇总

Version 2.0 | 2026-06-11

---

## 总览

上线需要对接 **6 个外部平台**。以下是每个平台需要申请的账号、需要提供的材料、以及申请方式。

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   阿里云          微信公众平台      微信商户平台              │
│   ├─ ECS 服务器   ├─ 小程序AppID   ├─ 商户号 MCH_ID         │
│   ├─ 域名         ├─ AppSecret     ├─ API V3 密钥           │
│   ├─ SSL 证书     └─ 配置白名单    ├─ 证书序列号            │
│   ├─ 百炼 API Key                  ├─ 商户私钥              │
│   └─ COS 对象存储                  └─ 支付回调地址          │
│                                                             │
│   ✅ 已完成         ⏳ 待注册         ⏳ 待申请               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 一、阿里云（✅ 基本完成）

### ✅ 已完成项

| 项目 | 内容 | 状态 |
|------|------|:--:|
| ECS 云服务器 | 47.96.39.9 · 2核4G · Ubuntu 26.04 | ✅ |
| root 密码 | 已提供 | ✅ |
| 域名 | 已购买 + 已实名 + ICP 备案已通过 | ✅ |
| 百炼 API Key | sk-xxxxxxxx | ✅ |

### ⏳ 还需要做的

| 项目 | 去哪弄 | 耗时 | 费用 |
|------|--------|------|------|
| **腾讯云 COS** | https://console.cloud.tencent.com/cos | 10分钟 | 按量付费，很便宜 |
| SSL 证书 | 服务器上用 certbot 免费申请（我来做） | 5分钟 | 免费 |

#### COS 开通步骤

```
1. 打开 https://console.cloud.tencent.com/cos
2. 用同一个阿里云账号手机号注册腾讯云（对，不同平台要分别注册）
3. 进入 COS 控制台 → 创建存储桶
4. 名称：ai-paper  ·  地域：成都/广州（离浙江近）
5. 访问权限：私有读写
6. 创建完成后 → 左侧「密钥管理」→「访问密钥」→ 创建密钥
```

**拿到后发给我的 4 个值：**

```
COS_SECRET_ID:     AKIDxxxxxxxx
COS_SECRET_KEY:    xxxxxxxx
COS_BUCKET:        ai-paper-1234567890
COS_REGION:        ap-chengdu（或 ap-guangzhou）
```

---

## 二、微信小程序（⏳ 需要注册）

### 去哪注册

**https://mp.weixin.qq.com** → 立即注册 → 小程序

### 注册前准备

| 材料 | 说明 |
|------|------|
| 营业执照原件（照片/扫描件） | 清晰、四角完整、在有效期内 |
| 法定代表人身份证正反面 | 二代身份证 |
| 法定代表人本人微信 | 必须已实名认证 |
| 一个干净邮箱 | 没注册过微信公众平台的 |
| 手机号 | 能收验证码 |

### 注册注意

> 🔴 **选「个体工商户」**，不要选「个人」。个人主体不能微信支付。
> 🔴 **法人本人微信扫码**，其他人扫会报"法定代表人信息不一致"。
> 🔴 营业执照刚办（<5天）等几天再注册，工商数据有延迟。

### 注册完成后拿到的值 → 发给我

```
WX_APP_ID:      wx________________________________
WX_APP_SECRET:  ________________________________  ← 只显示一次！立刻复制！
```

详细步骤看：[微信小程序注册指南](WeChat_MiniProgram_Registration_Guide.md)

---

## 三、微信支付商户号（⏳ 需要申请）

### 去哪申请

**https://pay.weixin.qq.com** → 接入微信支付 → 马上注册

用小程序管理员的微信扫码登录。

### 申请条件

| 主体类型 | 需要 | 审核时间 |
|----------|------|----------|
| 个体工商户 | 营业执照 + 法人身份证 + 法人银行卡 | 1-3 天 |

### 申请流程

```
1. 提交营业执照 + 法人身份证
2. 填写法人银行卡号
3. 微信向银行卡打一笔验证款（0.01-1元）
4. 法人查银行卡入账金额，回填验证
5. 审核通过 → 进入商户平台
```

### 审核通过后，需要获取 4 样东西

#### ① 商户号 MCH_ID

```
商户平台 → 账户中心 → 商户信息 → 商户号
格式：1234567890（10位数字）
```

#### ② API V3 密钥

```
商户平台 → 账户中心 → API 安全 → 设置 APIv3 密钥
→ 点「生成」→ 随机 32 位字符串 → 复制保存
格式：a1b2c3d4e5f6...（32个字符）
```

#### ③ 证书序列号 + ④ 商户私钥

```
商户平台 → 账户中心 → API 安全 → 申请 API 证书
→ 下载「微信支付商户API证书申请工具」
→ 按工具提示生成 CSR 并提交
→ 下载证书压缩包，解压得到三个文件：

  apiclient_key.pem    → 用记事本打开，复制全部内容（包括 BEGIN/END 行）
  apiclient_cert.pem   → 备用
  证书序列号            → 在商户平台 API 安全页面查看（40位十六进制字符串）
```

### 全部拿到后 → 发给我

```
WX_MCH_ID:              1234567890
WX_API_V3_KEY:          a1b2c3d4e5f6...（32位）
WX_MCH_SERIAL_NO:       ABCDEF123456...（40位十六进制）
WX_MCH_PRIVATE_KEY:     -----BEGIN PRIVATE KEY-----
                        xxxxxxxx
                        -----END PRIVATE KEY-----
```

---

## 四、管理员微信 OpenID

### 怎么获取

小程序上线后，甲方用自己的微信登录一次，后端的日志会打印出他的 OpenID。

或者在小程序审核阶段，可以用替代方案：

```bash
# 服务器上查看日志
pm2 logs | grep openid
```

### 拿到后 → 发给我

```
ADMIN_OPENIDS: oXXXX-xxxxxxxxxxxxx
```

> 这个不急，小程序能跑了再拿。

---

## 五、题库资料

### 格式要求

| 格式 | 支持 | 推荐度 |
|------|:--:|:--:|
| Word (.docx) | ✅ | ⭐⭐⭐ |
| Markdown (.md) | ✅ | ⭐⭐⭐ |
| PDF (.pdf) | ✅ | ⭐⭐ |
| 图片 (.png/.jpg) | ✅ OCR | ⭐⭐ |

### 每道题格式

```
题目编号或标题
题目正文
A. 选项1  B. 选项2  C. 选项3  D. 选项4
答案：A
解析：xxxxxxxx

（下一题……）
```

### 优先覆盖

```
第一优先：小学数学 1-6 年级 + 小学语文 1-6 年级
第二优先：初中各科 + 高中各科
```

整理好打包发过来。

---

## 六、交付物总清单（甲方签字确认）

请逐项确认，完成一项勾一项：

```
=== 阿里云（已完成） ===
☑ 云服务器 ECS 购买 + 启动
☑ root 密码
☑ 域名购买 + 实名 + ICP 备案
☑ 百炼 API Key

=== 阿里云（待完成） ===
□ COS 对象存储开通
□ COS_SECRET_ID：
□ COS_SECRET_KEY：
□ COS_BUCKET：
□ COS_REGION：

=== 微信小程序 ===
□ 小程序注册完成
□ WX_APP_ID：
□ WX_APP_SECRET：

=== 微信支付 ===
□ 商户号申请通过
□ WX_MCH_ID：
□ WX_API_V3_KEY：
□ WX_MCH_SERIAL_NO：
□ WX_MCH_PRIVATE_KEY：（apiclient_key.pem 文件内容）

=== 管理员 ===
□ ADMIN_OPENIDS：

=== 题库 ===
□ 题库 Word/MD 文件（打包发来）：

=== JWT 密钥（我来生成） ===
□ JWT_SECRET：  ← 不用甲方提供，我随机生成
```

---

## 七、全部填完后的 .env（预览）

甲方把上面所有值给你之后，填进去就是这样：

```ini
# ---- 域名 ----
DOMAIN=甲方的域名

# ---- 数据库 ----
DB_PASSWORD=AiPaper2026!

# ---- 管理员 ----
ADMIN_OPENIDS=oXXXX-xxxxxxxx

# ---- JWT ----
JWT_SECRET=<你随机生成的 UUID>

# ---- AI (百炼) ----
QWEN3_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
QWEN3_API_KEY=sk-xxxxxxxx
EMBEDDING_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings
EMBEDDING_API_KEY=sk-xxxxxxxx

# ---- 微信小程序 ----
WX_APP_ID=wx_xxxxxxxx
WX_APP_SECRET=xxxxxxxx

# ---- 微信支付 V3 ----
WX_MCH_ID=1234567890
WX_API_V3_KEY=a1b2c3d4e5f6...
WX_MCH_SERIAL_NO=ABCDEF123456...
WX_MCH_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
xxxxxxxx
-----END PRIVATE KEY-----
WX_PAY_NOTIFY_URL=https://甲方的域名/v1/orders/callback

# ---- 腾讯云 COS ----
COS_SECRET_ID=AKIDxxxxxxxx
COS_SECRET_KEY=xxxxxxxx
COS_BUCKET=ai-paper-1234567890
COS_REGION=ap-chengdu
```

---

> 📅 **推进顺序**：先注册小程序（营业执照在手就能做）→ 同步申请商户号 → 开通 COS → 整理题库。全部材料收齐大约需要 **1-2 周**。
