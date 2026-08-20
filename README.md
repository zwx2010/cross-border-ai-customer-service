# 跨境电商三语 AI 客服与人工协作系统

一个面向跨境电商客服场景的全栈 AI 应用：消费者通过网页提出商品、物流和售后问题，Fastify 后端安全调用 Dify，使用 SSE 返回真实流式回答，并通过 MySQL 保存会话状态；需要人工处理时，可向飞书发送通知并接收接管状态回写。

> 当前仓库已经完成本地代码、自动化测试和生产构建验证。接入已发布的 Dify 应用、云 MySQL 和飞书租户后，可作为真实在线演示系统运行，不使用前端固定回答。

## 核心能力

- 英语、泰语、越南语三语客服工作流
- 商品咨询、订单物流、售后退款与退换货问答
- Dify API 服务端代理，API Key 不进入浏览器
- SSE 流式回答与 Dify `conversation_id` 会话关联
- 消费者聊天页与客服工作台双模式界面
- MySQL 会话、消息和人工接管状态模型
- 飞书 Webhook 转人工通知
- 飞书应用事件签名校验、重放防护和状态回写
- Docker Compose 本地运行与云部署边界说明
- 自动化测试覆盖 Dify SSE、会话权限、消息幂等和飞书安全校验

## 系统架构

```mermaid
flowchart LR
    U[消费者 / 客服浏览器] -->|HTTPS| F[Vue 3 前端]
    F -->|自有会话 API| B[Fastify 后端]
    B -->|Streaming API| D[Dify 三语客服工作流]
    D --> K[Dify 知识库]
    B -->|会话与人工状态| M[(MySQL)]
    B -->|转人工通知| W[飞书 Webhook]
    R[飞书应用事件] -->|验签与去重| B
```

关键安全边界：浏览器只访问自有后端；`DIFY_API_KEY`、数据库凭据和飞书密钥只保存在服务端环境变量中。

详细设计见 [系统架构说明](docs/architecture.md)。

## 演示流程

部署并接入真实 Dify 后，可以直接在网页中演示：

1. 选择 English、Tiếng Việt 或ไทย。
2. 输入商品、物流或售后问题。
3. 页面实时显示 Dify 返回的流式回答。
4. 刷新页面或切换会话，验证历史会话恢复。
5. 输入退款、投诉或明确转人工的问题，观察人工接管状态。
6. 配置飞书后，验证转接通知和客服状态回写。

建议演示问题：

```text
Where is my order?
สินค้าชิ้นนี้มีขนาดอะไรบ้าง
Tôi muốn hoàn tiền
I want to speak to a human agent
```

## 当前验证状态

| 能力 | 当前状态 | 证明方式 |
|---|---|---|
| 前端生产构建 | 已通过 | `npm run build` |
| 后端自动化测试 | 已通过 | SSE、会话、飞书、权限和幂等测试 |
| Dify 流式适配器 | 已实现 | `/chat-messages` + SSE 事件解析 |
| MySQL 持久化实现 | 已实现 | Schema、连接池和 Store |
| Docker Compose | 已配置 | 前端、后端、MySQL 三服务 |
| 真实 Dify 在线回答 | 待部署 | 发布 Dify 应用并配置 API Key |
| 云 MySQL | 待部署 | 提供云数据库连接地址 |
| 真实飞书联调 | 待配置 | 提供 Webhook、应用密钥和事件回调地址 |
| HTTPS 公网演示 | 待部署 | 配置域名、证书和反向代理 |

## 本地运行

### 1. 准备 Dify

在 Dify 中发布客服应用，获取应用 API Key。后端调用的是：

```text
POST {DIFY_BASE_URL}/chat-messages
```

### 2. 配置环境变量

复制环境变量样例：

```powershell
Copy-Item backend/.env.example backend/.env
```

至少填写：

```env
DIFY_BASE_URL=http://host.docker.internal/v1
DIFY_API_KEY=你的真实应用密钥
MYSQL_URL=mysql://customer_service:customer_service@mysql:3306/customer_service
PORT=4100
```

飞书为可选配置：

```env
FEISHU_WEBHOOK_URL=
FEISHU_ENCRYPT_KEY=
```

### 3. 启动

```powershell
docker compose up --build
```

启动后访问：

- 前端：`http://localhost:8080`
- 健康检查：`http://localhost:4100/health`

更多说明见 [通用部署文档](docs/deployment.md) 和 [Railway 部署指南](docs/railway-deployment.md)。

## 项目结构

```text
.
├─ frontend/                 Vue 3 消费者聊天页与客服工作台
├─ backend/
│  ├─ src/server.ts         会话、消息、转人工和飞书 API
│  ├─ src/dify.ts           Dify Streaming API 适配器
│  ├─ src/mysql-store.ts    MySQL 会话存储
│  ├─ src/integrations/     飞书通知与事件安全校验
│  ├─ migrations/           MySQL 初始化脚本
│  └─ test/                 自动化测试
├─ docs/                    架构与部署说明
├─ specs/                   已合并的系统规格
└─ docker-compose.yml       本地三服务编排
```

## 安全说明

- 不要把 `backend/.env`、Dify API Key、飞书密钥或数据库密码提交到仓库。
- 前端构建变量中不得包含 Dify 或飞书凭据。
- 生产环境必须启用 HTTPS、受控 CORS、数据库备份和密钥管理。
- 本项目不自动执行真实退款、赔付或订单修改，高风险业务必须转人工。

## 后续展示完善

- 接通真实 Dify API 和云 MySQL
- 增加在线演示域名与 HTTPS
- 补充消费者聊天页、客服工作台、知识库命中和转人工截图
- 完成飞书真实通知与双向接管联调
- 增加可复现的三语演示问题和验收记录
