# 甲方配置指南：支付宝支付 + 短信验证码

Version 1.0 | 2026-06-18

---

## 一、支付宝电脑网站支付

### 1.1 前提

- 已注册企业支付宝账号
- 已完成企业实名认证
- 准备好营业执照照片

### 1.2 创建应用

```
1. 打开 https://open.alipay.com/  → 用企业支付宝账号登录
2. 顶部导航 → "开发者中心"
3. 左侧菜单 → "网页/移动应用"
4. 点击 "创建应用" → 选择 "网页应用"
5. 填写：
   - 应用名称：瓯越AI组题网
   - 应用图标：上传一个 logo
   - 应用类型：网页应用
6. 提交审核（一般 1 个工作日）
```

### 1.3 签约电脑网站支付

```
1. 应用审核通过后，在应用详情页 → "能力管理"
2. 找到 "电脑网站支付" → 点击 "签约"
3. 填写签约信息：
   - 网站地址：https://ouyueaizuti.cn
   - 经营类目：教育培训 → 教育服务
4. 提交 → 审核通过（1-3 个工作日）
```

### 1.4 获取密钥（审核通过后操作）

```
1. 应用详情页 → "开发设置"
2. 找到 "接口加签方式" → 点击 "设置"
3. 加签模式选择 "公钥"
4. 下载支付宝密钥生成工具（Windows/Mac 都有）
5. 运行工具，生成一对密钥：
   - 应用私钥（自己保管）← 填到 .env 的 ALIPAY_PRIVATE_KEY
   - 应用公钥（上传到支付宝）← 上传后支付宝会生成支付宝公钥
6. 上传公钥后，支付宝会生成 "支付宝公钥" ← 填到 .env 的 ALIPAY_PUBLIC_KEY
7. 复制 APP_ID（应用ID）← 填到 .env 的 ALIPAY_APP_ID
```

### 1.5 填到服务器 .env

```bash
# 服务器上编辑 /opt/app/.env
ALIPAY_APP_ID=2021xxxxxxxxxxxx          # 从支付宝获取
ALIPAY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
你的应用私钥内容（含换行）
-----END RSA PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
支付宝公钥内容（含换行）
-----END PUBLIC KEY-----"
ALIPAY_NOTIFY_URL=https://ouyueaizuti.cn/v1/payment/alipay/callback
ALIPAY_RETURN_URL=https://ouyueaizuti.cn/orders
```

---

## 二、阿里云短信验证码

### 2.1 前提

- 已注册阿里云账号（https://aliyun.com）
- 已完成实名认证

### 2.2 开通短信服务

```
1. 打开 https://www.aliyun.com/product/sms
2. 点击 "立即开通"
3. 按提示完成开通（免费开通，按量付费约 ¥0.045/条）
```

### 2.3 申请短信签名

```
1. 阿里云控制台 → 短信服务 → 国内消息 → 签名管理
2. 点击 "添加签名"
3. 签名：瓯越AI组题网
4. 签名用途：自用（网站）
5. 签名来源：已备案网站 → 填写 ouyueaizuti.cn
6. 上传营业执照 + 网站备案截图
7. 提交审核（1-2 个工作日）
```

> ⚠️ 签名必须和网站名一致。如果网站备案名字不是"瓯越AI组题网"，用备案名。

### 2.4 申请短信模板

```
1. 签名审核通过后 → 模板管理 → 添加模板
2. 模板类型：验证码
3. 模板名称：登录验证码
4. 模板内容：您的验证码是${code}，有效期5分钟。请勿泄露！
5. 场景说明：用户手机号登录时发送验证码
6. 提交审核（1-2 个工作日）
```

### 2.5 获取 AccessKey

```
1. 阿里云控制台右上角头像 → AccessKey 管理
2. 点击 "创建 AccessKey"
3. 手机验证 → 获取 AccessKey ID 和 AccessKey Secret
```

> ⚠️ AccessKey Secret 只显示一次，务必复制保存！

### 2.6 填到服务器 .env

```bash
# 服务器上编辑 /opt/app/.env
ALIBABA_ACCESS_KEY_ID=LTAI5tXXXXXXXXXXXXXX     # AccessKey ID
ALIBABA_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx  # AccessKey Secret
SMS_SIGN_NAME=瓯越AI组题网                       # 审核通过的签名
SMS_TEMPLATE_CODE=SMS_123456789                  # 审核通过的模板CODE
```

---

## 三、服务器操作（拿到 key 后）

甲方把以上 6 个值发给你后，SSH 到服务器修改：

```bash
nano /opt/app/.env
# 填好上面 6 个值，保存

pm2 restart ai-paper-backend
```

---

## 四、甲方需要给你的 6 个值

| # | 变量 | 说明 |
|---|------|------|
| 1 | `ALIPAY_APP_ID` | 支付宝应用 ID（2021 开头的一串数字） |
| 2 | `ALIPAY_PRIVATE_KEY` | 支付宝应用私钥（pem 格式文本） |
| 3 | `ALIPAY_PUBLIC_KEY` | 支付宝公钥（pem 格式文本） |
| 4 | `ALIBABA_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| 5 | `ALIBABA_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
| 6 | `SMS_TEMPLATE_CODE` | 短信模板 CODE（SMS_ 开头） |

> ⚠️ 注意：SMS_SIGN_NAME 如果审核不通过可能需要改成备案名，到时候告诉我。
