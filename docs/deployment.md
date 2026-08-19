# 本地与生产部署

## 本地 Docker Compose

1. 复制 `backend/.env.example` 为 `backend/.env`。
2. 填入 `DIFY_API_KEY`，确认 `DIFY_BASE_URL` 能从后端容器访问本地 Dify；Docker Desktop 通常使用 `host.docker.internal`。
3. 执行 `docker compose up --build`。
4. 打开 `http://localhost:8080`，后端健康检查为 `http://localhost:4100/health`。

后端缺少 Dify API Key 时必须启动失败；不要把密钥写入前端 `.env`、Vite 构建参数或浏览器代码。

## 生产云部署边界

- 前端容器部署到静态托管或容器服务，反向代理 `/api` 到后端。
- 后端容器部署到具备 HTTPS、日志和密钥管理的服务，数据库使用托管 MySQL 或受控 MySQL 集群。
- `DIFY_API_KEY`、飞书签名密钥和数据库凭据通过云密钥管理注入，不提交到仓库。
- 配置域名、TLS、CORS、备份、监控和飞书事件回调地址后，再执行真实联调。
- 本项目不自动创建云资源、飞书应用或 Webhook；未提供这些资源时只能完成模拟适配器验证。
