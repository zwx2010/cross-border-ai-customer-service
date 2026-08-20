# Railway 部署指南

本项目在 Railway 中使用三个服务：

```text
浏览器 → frontend（公网） → backend（Railway 私网） → Dify API
                                  ↓
                              MySQL（私网）
```

前端是唯一必须公开的服务。后端可以只保留 Railway 私网地址；MySQL 默认保持私有，不需要开启 TCP Public Access。

## 1. 部署前准备

- 将本仓库推送到 GitHub。
- 在 Dify 中发布三语客服应用并取得 API Key。
- 确认 Dify API 地址可从公网访问。
- 不要提交 `backend/.env`。

## 2. 创建 Railway 项目

1. 登录 Railway，选择 **New Project**。
2. 选择 **Deploy from GitHub repo**，连接本仓库。
3. 先创建后端服务，服务名建议设为 `backend`。
4. 在后端服务 Settings 中设置：
   - Root Directory：`/backend`
   - Config File Path：`/backend/railway.json`
5. 从同一个 GitHub 仓库再创建一个服务，命名为 `frontend`。
6. 在前端服务 Settings 中设置：
   - Root Directory：`/frontend`
   - Config File Path：`/frontend/railway.json`
7. 在项目画布点击 **+ New → Database → MySQL**，服务名建议保留为 `MySQL`。

## 3. 后端变量

在 `backend` 服务 Variables 中填写：

```env
DIFY_BASE_URL=https://你的-dify-地址/v1
DIFY_API_KEY=你的真实应用密钥
MYSQL_URL=${{MySQL.MYSQL_URL}}
```

可选的飞书变量：

```env
FEISHU_WEBHOOK_URL=
FEISHU_ENCRYPT_KEY=
```

要让“转接人工”按钮真正发送飞书群通知，必须在 backend 服务中填写 `FEISHU_WEBHOOK_URL`：

1. 在飞书群中添加“自定义机器人”。
2. 复制机器人 Webhook 地址。
3. 粘贴到 Railway → backend → Variables → `FEISHU_WEBHOOK_URL`。
4. 保存并等待 backend 重新部署。
5. 访问 backend 的 `/health`，确认 `dependencies.feishu` 为 `configured`。

如果没有配置该变量，按钮仍会更新会话为“等待人工”，但不会发送飞书消息；健康检查会显示 `feishu: missing`。

不要手工固定 `PORT`。Railway 会自动注入 `PORT`，当前后端已读取该变量并监听 `0.0.0.0`。

后端部署前会自动执行：

```text
npm run migrate
```

迁移脚本使用 `CREATE TABLE IF NOT EXISTS`，重复部署不会因为表已存在而失败。

## 4. 前端变量

在 `frontend` 服务 Variables 中填写：

```env
BACKEND_PRIVATE_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
```

这里的 `backend` 必须与 Railway 中的后端服务名完全一致。若服务名不同，请同步修改变量引用中的命名空间。

前端 Nginx 会监听 Railway 注入的 `PORT`，并把 `/api/*` 请求通过 Railway 私网转发到后端，因此浏览器不会直接访问或暴露后端私网地址。

## 5. 生成公网地址

1. 打开 `frontend` 服务。
2. 进入 **Settings → Networking**。
3. 点击 **Generate Domain**。
4. 打开生成的 `*.up.railway.app` 地址。

后端如需单独查看 `/health`，可以临时生成公网域名；正式演示并不要求后端公开。

## 6. 部署验收

按顺序检查：

1. MySQL 服务状态为 Active。
2. backend 的 Pre-deploy Logs 显示 `Database migration completed.`。
3. backend 部署通过 `/health` 健康检查。
4. frontend 部署通过 `/` 健康检查。
5. 打开前端 Railway Domain，可以新建会话。
6. 输入英文问题，出现真实 Dify 流式回答。
7. 刷新页面，历史会话仍然存在。
8. 切换泰语和越南语，分别验证回答。
9. 点击转人工，页面状态变成等待人工。

## 7. 常见错误

### 后端健康检查失败

- 检查是否手工设置了错误的 `PORT`。
- 确认服务 Root Directory 是 `/backend`。
- 检查 `DIFY_API_KEY` 和 `MYSQL_URL` 是否存在。
- 查看启动日志中是否有 MySQL 连接错误。

### 前端显示连接失败

- 检查 `BACKEND_PRIVATE_URL` 的服务名是否与 `backend` 一致。
- 确认后端服务已成功部署。
- 确认前端 Root Directory 是 `/frontend`。
- 查看 Nginx 日志是否出现 host not found 或 connection refused。

### 数据库迁移失败

- 确认 `MYSQL_URL=${{MySQL.MYSQL_URL}}` 引用了正确的 MySQL 服务名。
- MySQL 初次创建时需要短暂初始化，重新部署 backend 即可再次执行迁移。

### Dify 返回 401 或 404

- `DIFY_API_KEY` 必须是已发布应用的 API Key，而不是模型供应商密钥。
- `DIFY_BASE_URL` 通常应以 `/v1` 结尾，不要再附加 `/chat-messages`。

## 8. 正式演示建议

- Railway Region 尽量选择靠近 Dify 服务的位置。
- 先验证英文，再验证泰语、越南语和转人工。
- 保留一个已有历史记录的会话，用于展示 MySQL 持久化。
- 后续绑定自定义域名并启用 Railway 自动 HTTPS。
- MySQL 开启 Railway Backups，避免演示数据丢失。
