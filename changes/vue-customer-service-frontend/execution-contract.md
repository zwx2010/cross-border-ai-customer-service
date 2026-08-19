# 执行合同

## Intent Lock

- **变更名称**：`vue-customer-service-frontend`
- **要解决的问题**：现有 Dify 客服机器人已经完成三语核心能力验收，但缺少安全的外部接入层、消费者界面、客服工作台、会话持久化和飞书人工协作能力。
- **范围内**：独立 Vue 3 前端；独立 Node.js + TypeScript + Fastify 后端；Dify API 安全代理与 SSE；MySQL 会话持久化；消费者聊天页和客服工作台；飞书 Webhook 通知与自建应用双向协作；配置化主题；Docker Compose 与生产云部署说明。
- **范围外**：修改或发布 Dify 工作流；真实退款、赔付、订单变更；外部电商平台；客服数据分析；可视化主题编辑器；替用户创建云资源或飞书租户配置。

## Approved Behavior

- **已批准需求摘要**：前后端独立部署，浏览器只访问自有 API；后端保存 Dify/飞书/数据库凭据并负责协议适配；前端提供消费者和客服两种模式；会话、消息、语言、摘要、人工状态可恢复；Dify 触发人工时同步到前端和飞书；主题使用配置和 CSS 变量；三语能力复用现有 Dify 工作流。
- **关键场景**：三语流式对话；Dify 流式错误和中断重试；会话历史恢复；消费者/客服双模式状态一致；恶劣语气、明确转人工、连续两次无法回答、退款/赔付/投诉转人工；飞书通知、有效接管指令、无效/重复事件拒绝；主题非法字段回退；缺失密钥和依赖不可用时启动失败或健康检查失败。
- **验收检查**：前端构建与后端类型检查；Dify SSE 模拟和真实本地 API 验证；MySQL 迁移与恢复；浏览器三语与响应式场景；飞书签名/去重/权限测试；构建产物扫描确认没有 Dify API Key 或飞书凭据；Docker Compose 启动和生产配置检查。

## Design Constraints

- **架构约束**：前端与后端为独立项目；前端不得直连 Dify 或飞书；后端按 Dify、会话、人工转接、飞书、健康检查划分边界。
- **接口约束**：Dify 适配器必须支持 Workflow `chat-messages`、`conversation_id`、用户标识、流式增量、结束和错误事件；对前端暴露统一的会话 API 和错误结构；飞书入口必须验签、校验权限、处理重放。
- **依赖约束**：运行依赖 Node.js、Fastify、MySQL、Dify API 和飞书配置；前端主题不得依赖可视化编辑器；真实飞书联调需要用户提供自建应用、Webhook、事件订阅和权限配置。
- **数据约束**：消息事件必须幂等；会话数据按用户或客服权限隔离；保存 Dify conversation ID、语言、摘要、人工状态和转接原因；凭据只能从后端环境变量或密钥管理读取。

## Execution Plan

执行方式必须先运行 `ssf execution recommend`，由用户确认 `sdd`、`inline` 或 `batch-inline` 后，再生成当前 wave 计划。当前契约不预先批准执行模式。

## Execution Waves

### Wave 1

- **Wave ID**：`foundation`
- **任务**：`1.1, 1.2, 2.1, 2.2`
- **依赖 wave**：无
- **策略**：`serial`
- **目标**：建立前后端边界、配置与数据模型，实现 Dify 安全代理、流式会话和 MySQL 恢复。
- **输入**：本契约、规划包、现有 Dify Workflow API 配置、MySQL 连接配置。
- **输出**：可运行的前后端骨架、API 类型、数据库迁移、Dify Adapter、会话 API 和自动化测试。
- **完成标准**：三语消息可以经后端流式往返；会话可恢复；重复事件不重复写入；浏览器和构建产物无法获得 Dify API Key。
- **Review gate**：`reviews/foundation.md`、base/head SHA、`ssf execution review --wave foundation ... --verdict pass`。

### Wave 2

- **Wave ID**：`experience-handoff`
- **任务**：`3.1, 3.2, 3.3, 4.1, 4.2`
- **依赖 wave**：`foundation`
- **策略**：`serial`
- **目标**：交付双模式页面、人工转接状态、飞书双通道和协作回写。
- **输入**：Wave 1 通过的 API 和数据模型；飞书配置（若未提供则使用可验证的模拟适配器）。
- **输出**：消费者聊天页、客服工作台、共享前端状态、飞书通知/回写模块和集成测试。
- **完成标准**：两种页面共享同一会话状态；四类人工转接均能持久化并通知；有效飞书指令可更新状态；无效或重复事件不改变状态。
- **Review gate**：`reviews/experience-handoff.md`、base/head SHA、`ssf execution review --wave experience-handoff ... --verdict pass`。

### Wave 3

- **Wave ID**：`release-readiness`
- **任务**：`5.1, 5.2, 6.1`
- **依赖 wave**：`experience-handoff`
- **策略**：`serial`
- **目标**：完成主题、响应式、部署和最终集成验收。
- **输入**：前两 wave 的通过审查结果；部署环境变量和可用的本地/测试 Dify。
- **输出**：主题系统、响应式页面、Compose、生产部署文档、健康检查和验收报告。
- **完成标准**：主题非法字段安全回退；桌面/移动页面可用；Compose 启动和健康检查通过；全验收集通过；凭据扫描无泄露。
- **Review gate**：`reviews/release-readiness.md`、base/head SHA、`ssf execution review --wave release-readiness ... --verdict pass`。

## Test Obligations

- **必须先从失败测试开始的行为**：Dify SSE 增量/结束/错误解析；重复消息事件幂等；会话权限隔离；飞书验签、重放和无权限指令；人工转接状态机；主题非法配置回退；缺失密钥启动检查。
- **必需的边界情况**：空消息、超长消息、Dify 超时、流式中断、刷新恢复、重复提交、并发状态更新、MySQL 短暂不可用、飞书重复回调、飞书凭据缺失、移动窄屏、三语长文本。
- **回归敏感区域**：现有 Dify 三语回答和转人工输出格式；`conversation_id` 关联；消息和人工状态一致性；飞书事件幂等；浏览器构建产物与日志脱敏。

## Execution Mode

- **可用方式与推荐**：待用户确认后运行 `ssf execution recommend changes/vue-customer-service-frontend --wave foundation:serial:1.1,1.2,2.1,2.2 --wave experience-handoff:serial:3.1,3.2,3.3,4.1,4.2:foundation --wave release-readiness:serial:5.1,5.2,6.1:experience-handoff`。
- **用户确认的模式**：Pending
- **推荐理由 / 项目事实**：新增两个项目、API 边界、数据库和外部协作集成，且每个 wave 有明确依赖；执行模式必须依据 CLI 推荐和用户确认记录。
- **非推荐选择的风险确认**：若用户选择非推荐模式，必须在执行计划中记录 `--acknowledge-recommendation`。
- **执行计划命令**：待 DP-4 选择后生成，不在本契约中伪造 receipt。
- **允许的修订**：若 API、数据库、飞书协议或页面范围变化，先回到规划文档并重新生成契约；不得带着过期契约实现。
- **计划 revision / artifact hash**：Pending，等待 DP-4 执行模式和计划。

## Verification Dimensions

| 维度 | 状态 | 发现 |
|------|------|------|
| Completeness | Pass | 规划包中的需求、任务、三类部署和飞书边界均映射到 wave 或测试义务 |
| Correctness | Pass | 约束与已批准范围一致，未包含真实交易执行或 Dify 发布 |
| Coherence | Pass | foundation → experience-handoff → release-readiness 依赖清晰 |

**总体结论**：待 DP-3 用户批准执行契约。

## Review Gates

- **强制审查点**：每个 Execution Wave 完成后记录独立 review report 和 `ssf execution review` 通过 receipt。
- **阻塞类别**：依赖 wave 未通过、review receipt 缺失/过期/失败、Dify API 协议不匹配、飞书安全校验失败、凭据泄露、数据库迁移不可回滚。
- **收口条件**：所有当前 wave 有 `pass` review receipt；集成验收通过；部署检查通过；未发布 Dify 的约束保持不变。

## Escalation Rules

- **何时回退到 `specifying`**：新增外部渠道、真实交易执行、权限模型、数据字段或用户可见页面范围；Dify/飞书 API 契约变化；主题需求升级为可视化编辑器。
- **何时回退到 `bridging`**：任务拆分、wave 依赖、执行模式或审查证据要求发生变化，但已批准需求与架构仍不变。
- **何时不得继续实现**：契约未获 DP-3 批准；没有当前 DP-4 执行计划；前置 wave 没有 `pass` review；未提供必要凭据却声称真实飞书联调通过；发现前端包含后端密钥。
