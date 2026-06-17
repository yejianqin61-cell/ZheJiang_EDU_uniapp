# Task 04 — 联调测试 + 部署上线

**关联文档**：[Task 01](./Task_01_Frontend_Infrastructure.md) · [Task 02](./Task_02_Frontend_Pages.md) · [Task 03](./Task_03_Backend_Auth_Payment.md)  
**前置依赖**：Task 01 + 02 + 03 全部完成  
**预估工时**：1.5 天

---

## 目标

全链路联调、测试、修复 Bug、部署到生产服务器、验收交付。

---

## Day 1 上午：自动化测试修复 (1.5h)

### 1. 后端测试适配

旧测试中有微信相关的 mock 和断言，需适配：

- [ ] `auth.service.spec.ts` — 保留 `codeToOpenid` 旧测试，新增 `loginByPhone` 测试
- [ ] `auth.controller.spec.ts` — 新增 `POST /login { phone, smsCode }` 测试
- [ ] `payment.service.spec.ts` — `wxPayParams` → `payForm`，`wxOutTradeNo` → `outTradeNo`
- [ ] `payment.controller.spec.ts` — 新增支付宝回调测试
- [ ] `order.controller.spec.ts` — 响应格式适配
- [ ] `user.service.spec.ts` — 手机号脱敏测试（profile 不暴露完整手机号？或按业务决定）
- [ ] `wxpay.client.spec.ts` — 保留不动（旧微信支付代码未删除）

### 2. 前端测试（如果有）

- [ ] `frontend-web/src/__tests__/` — 如果有单元测试，适配新的 mock 结构
- [ ] 删除旧 `frontend-legacy/src/__tests__/utils/setup.ts` 中的 UniApp mock

### 3. 运行全量测试

- [ ] `cd backend && npm test` → 全部通过
- [ ] `cd frontend-web && npm test` → 全部通过（如果有）

---

## Day 1 上午（续）：端到端流程测试 (1.5h)

### 4. 教师端全链路

- [ ] **登录**：输入手机号 → 获取验证码 → 登录 → 跳转首页
- [ ] **首页**：统计数字正确、快捷入口可点击
- [ ] **组卷配置**：年级/科目下拉联动、知识点多选、题量滑块、提交
- [ ] **AI组卷**：Loading 状态、返回试卷
- [ ] **试卷预览**：前 5 题显示、截断遮罩、分流卡片
- [ ] **下载服务支付**：点击 → 确认 → 跳转支付宝 → 支付成功 → 回跳 → 下载文件
- [ ] **文件下载**：`window.open` 正常下载 DOCX/PDF
- [ ] **打印服务**：选份数 → 选地址 → 支付 → 订单详情物流时间线
- [ ] **历史订单**：Tab 切换、下载按钮、打印详情
- [ ] **个人中心**：信息显示、退出登录

### 5. 管理后台全链路

- [ ] **仪表盘**：统计卡片 + ECharts 图表渲染正常
- [ ] **文件上传**：选文件 → 上传 → AI 解析 → 进度轮询
- [ ] **入库审核**：待审核列表 → 单题通过/拒绝 → 批量通过/拒绝 → 全选/反选
- [ ] **题库管理**：6 维筛选、关键词搜索、单题删除、批量删除
- [ ] **知识点中心**：列表、筛选
- [ ] **定价配置**：编辑下载价 + 打印三档价 → 保存
- [ ] **订单管理**：范围筛选 + Tab 切换 + 物流状态操作
- [ ] **提现管理**：通过/拒绝

### 6. 贡献题 + 余额流程

- [ ] **教师上传题目**：选文件 → 预览 → 提交审核
- [ ] **管理员审核**：通过 → 余额到账
- [ ] **余额提现**：提交申请 → 管理员处理

---

## Day 1 下午：Bug 修复 + 边缘情况 (2h)

### 7. 边缘情况测试

- [ ] 未登录访问受保护页面 → 重定向到 `/login`
- [ ] teacher 角色访问 `/admin/*` → 重定向到 `/`
- [ ] Token 过期 → 自动跳登录页
- [ ] 刷新页面 → Token 不丢失 → 用户状态保持
- [ ] 浏览器后退/前进 → 路由正确
- [ ] 空数据列表 → `el-empty` 正常显示
- [ ] 网络错误 → `ElMessage.error` 提示
- [ ] 文件类型校验（上传非支持格式）
- [ ] 文件大小超限
- [ ] 支付超时（5 分钟轮询结束后的提示）
- [ ] 重复下单检测（同一试卷同类型订单不可重复创建）

### 8. 浏览器兼容性

- [ ] Chrome 120+（主力）
- [ ] Edge 120+
- [ ] Safari 17+
- [ ] 360 极速浏览器（国内常见）

### 9. 分辨率

- [ ] 1920×1080（主流办公分辨率）
- [ ] 1366×768（笔记本常见）
- [ ] 2560×1440（高分辨率）

---

## Day 2 上午：生产部署 (2h)

### 10. 环境变量配置

- [ ] 复制 `.env.production` → 填写所有生产变量：

```bash
# 数据库
DB_TYPE=postgres
DB_HOST=db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<强密码>
DB_DATABASE=ai_paper

# JWT
JWT_SECRET=<随机生成64位字符串>

# 短信验证码（生产用）
ALIBABA_ACCESS_KEY_ID=<阿里云 AccessKey>
ALIBABA_ACCESS_KEY_SECRET=<阿里云 Secret>
SMS_SIGN_NAME=AI智能组卷
SMS_TEMPLATE_CODE=SMS_XXXXXX

# 支付宝（生产用）
ALIPAY_APP_ID=<支付宝应用ID>
ALIPAY_PRIVATE_KEY=<应用私钥>
ALIPAY_PUBLIC_KEY=<支付宝公钥>
ALIPAY_NOTIFY_URL=https://你的域名.com/v1/payment/alipay/callback
ALIPAY_RETURN_URL=https://你的域名.com/orders

# 管理员
ADMIN_PHONES=13800138000

# AI（已有，保持不变）
QWEN3_API_URL=...
QWEN3_API_KEY=...
EMBEDDING_API_URL=...
EMBEDDING_API_KEY=...

# COS（已有，保持不变）
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_BUCKET=...
COS_REGION=...
```

### 11. Docker Compose 部署

- [ ] 确认 `docker-compose.yml` 包含所有服务：api / worker / export / db / redis / ocr
- [ ] 构建前端：

```bash
cd frontend-web
npm run build    # 产出 dist/
# dist/ 部署到 Nginx 或挂载到 NestJS 的静态文件目录
```

- [ ] 服务器上执行：

```bash
git pull
cd frontend-web && npm ci && npm run build
cd ../backend && npm ci && npm run build
cd ..
docker compose up -d --build
```

### 12. Nginx 配置

- [ ] 反向代理配置：

```nginx
server {
    listen 443 ssl http2;
    server_name 你的域名.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 前端静态文件
    root /path/to/frontend-web/dist;
    index index.html;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /v1/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Day 2 下午：验收 + 文档 (1.5h)

### 13. 生产验收

- [ ] `GET https://域名.com/v1/health` → 200 healthy
- [ ] 浏览器访问 `https://域名.com` → 登录页正常显示
- [ ] 生产环境完整链路走一遍（同 Day 1 上午流程）
- [ ] 支付宝真实支付测试（¥0.01 测试订单）
- [ ] 短信验证码真实发送测试
- [ ] HTTPS 证书有效
- [ ] 管理后台功能正常

### 14. 甲方交付物

- [ ] `.env.production` 模板文件（敏感值留空，让甲方自己填）
- [ ] 部署命令清单（一键脚本）
- [ ] 运维手册：
  - 怎么重启服务（`docker compose restart`）
  - 怎么查看日志（`docker compose logs -f`）
  - 怎么备份数据库（`pg_dump`）
  - 怎么更新代码（`git pull + docker compose up -d --build`）
- [ ] 支付宝商户后台操作说明：
  - 怎么看订单
  - 怎么退款
  - 怎么导出账单

### 15. 归档

- [ ] 旧 `frontend/` → 重命名为 `frontend-legacy/`，README 标记「已废弃，见 frontend-web/」
- [ ] `frontend-web/` → 标记为主前端项目
- [ ] `doc/04_Development/` 下补一份 `Deployment_Manual.md`（部署手册）

---

## 验收标准（最终）

- [ ] 全链路 E2E 在**生产环境**走通（登录→组卷→支付→导出）
- [ ] 管理后台全部功能可用
- [ ] 支付宝真实支付成功（测试金额 ¥0.01）
- [ ] 短信验证码真实发送成功
- [ ] HTTPS 证书有效（浏览器绿色锁图标）
- [ ] 后端全量测试通过
- [ ] 甲方拿到 `.env.production` 模板 + 部署命令 + 运维手册
- [ ] `frontend-legacy/` 已标记废弃
