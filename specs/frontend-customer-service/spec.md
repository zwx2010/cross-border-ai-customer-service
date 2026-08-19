# frontend-customer-service

## Purpose

定义独立 Vue 3 前端、Fastify API 服务、MySQL 会话持久化和飞书人工协作的可验收行为，确保现有 Dify 客服工作流能够安全地服务于消费者和客服人员。

## Requirements

### Requirement: 双模式前端

The system SHALL 提供消费者聊天页和客服工作台两种页面模式，并 SHALL 通过同一后端会话接口访问 Dify。

#### Scenario: 消费者聊天

- **WHEN** 消费者进入聊天页并发送英语、越南语或泰语消息
- **THEN** 页面 SHALL 展示发送状态、Dify 流式回复、语言一致性和当前人工接管状态。

#### Scenario: 客服工作台

- **WHEN** 客服打开工作台
- **THEN** 页面 SHALL 展示可筛选的会话列表、消息记录、客户语言、会话摘要、知识来源、人工转接原因和当前状态。

### Requirement: Dify API 安全代理

The backend SHALL 代理 Dify Workflow API 请求、管理 API Key，并 SHALL 禁止浏览器直接获得 Dify API Key。

#### Scenario: 流式消息

- **WHEN** 前端发送一条消息
- **THEN** 后端 SHALL 携带服务端配置的 Dify 凭据和用户标识调用 `chat-messages`，并将可识别的 SSE 增量事件转发给前端。

#### Scenario: Dify 错误

- **WHEN** Dify 返回超时、鉴权失败或不可解析事件
- **THEN** 后端 SHALL 记录可关联的错误，不暴露密钥或内部凭据，并向前端返回可重试的统一错误结构。

### Requirement: 会话与消息持久化

The backend SHALL 使用 MySQL 保存会话、消息、语言、Dify conversation ID、摘要和人工转接状态，并 SHALL 支持按会话恢复历史。

#### Scenario: 恢复会话

- **WHEN** 用户或客服请求某个已有会话
- **THEN** 后端 SHALL 返回按时间排序的消息、当前语言、摘要和人工状态，且不得重复插入同一消息事件。

#### Scenario: 会话隔离

- **WHEN** 一个用户请求会话列表或消息
- **THEN** 系统 SHALL 只返回该用户或具备客服权限的操作范围内的数据。

### Requirement: 人工转接同步

The system SHALL 识别并持久化 Dify 输出的人工转接状态、触发原因和会话摘要，并 SHALL 同步到飞书通知与协作通道。

#### Scenario: 触发转人工

- **WHEN** Dify 返回明确转人工、恶劣语气、连续无法回答或退款/赔付/投诉状态
- **THEN** 后端 SHALL 保存转接事件，前端 SHALL 显示接管状态和摘要，且 SHALL 向配置的飞书 Webhook 推送通知。

#### Scenario: 飞书自建应用协作

- **WHEN** 飞书自建应用机器人收到客服接管、备注或状态更新指令
- **THEN** 后端 SHALL 校验来源和权限，更新会话人工状态，并将结果同步到前端；无效指令 SHALL 被拒绝且不改变会话。

### Requirement: 配置化视觉主题

The frontend SHALL 通过版本化配置和 CSS 变量支持品牌色、明暗模式、圆角、字体和布局密度定制，且 SHALL 不依赖可视化编辑器才能运行。

#### Scenario: 应用主题配置

- **WHEN** 部署环境提供合法主题配置
- **THEN** 两种页面模式 SHALL 使用相同主题变量，并在缺省字段时回退到安全默认值。

#### Scenario: 非法主题配置

- **WHEN** 主题配置包含无法解析的颜色、字体或布局值
- **THEN** 前端 SHALL 忽略非法字段并继续使用默认主题，不阻断聊天功能。

### Requirement: 三语与可访问状态

The frontend SHALL 支持英语、越南语和泰语的界面提示与消息展示，并 SHALL 清晰区分加载、失败、重试、等待人工和人工已接管状态。

#### Scenario: 流式中断重试

- **WHEN** 流式响应中断
- **THEN** 页面 SHALL 保留已展示内容，提示用户重试，并 SHALL 避免重复创建会话消息。

#### Scenario: 响应式布局

- **WHEN** 用户在桌面或移动宽度访问任一模式
- **THEN** 页面 SHALL 保持消息可读、输入可用和人工状态可见。

### Requirement: 部署与运行检查

The system SHALL 提供本地 Docker Compose 和生产云部署配置说明，包含前端、后端、MySQL、健康检查和必需环境变量。

#### Scenario: 本地启动

- **WHEN** 按部署文档提供环境变量并启动 Compose
- **THEN** 前端、后端和 MySQL SHALL 启动成功，健康检查 SHALL 可报告 Dify 代理和数据库状态。

#### Scenario: 缺少密钥

- **WHEN** 缺少 Dify 或飞书必需密钥
- **THEN** 后端 SHALL 在启动检查中明确报告缺失项，并 SHALL 不以半可用状态接收业务请求。
