# 执行合同

## Intent Lock

- **变更名称**：cross-border-customer-service-bot
- **要解决的问题**：减少跨境电商人工客服处理英语、越南语、泰语常见咨询的工作量，并在高风险或机器人无法可靠回答时及时转人工。
- **范围内**：Dify 内部三语分层客服工作流；商品、订单/物流、售后/退款/退换货咨询；知识库上传、删除、更新、分类、版本/生效控制、检索测试和回答来源展示；人工接管和会话摘要；90% 常见问题准确率验证。
- **范围外**：外部电商/客服渠道接入、自动翻译专项优化、客服数据分析、自动执行退款或赔付。

## Approved Behavior

- **已批准需求摘要**：系统支持三语对话，按商品、订单物流和售后路由，使用已生效知识库回答；恶劣语气、明确要求人工、连续两次无法回答、退款/赔付/投诉时转人工。
- **关键场景**：三语等价问题路由；知识库版本切换与停用；未命中知识时不生成无依据的确定性答案；四类人工接管条件；转人工时输出语言、意图、问题、已收集信息和触发原因。
- **验收检查**：固定测试集覆盖三种语言、三类业务、知识库生命周期和人工接管规则；常见问题准确率达到 90%，规定的高风险场景无漏转。

## Design Constraints

- **架构约束**：采用分层 Dify 工作流，分离语言识别、意图路由、知识检索、回答生成、风险判断和人工接管。
- **接口约束**：首期只使用 Dify 内部预览/工作流接口；人工接管以状态和会话摘要作为占位输出，不连接真实外部渠道。
- **依赖约束**：依赖 Dify 工作流、模型和知识库能力；不得把后置的外部渠道、自动翻译专项优化或数据分析混入首期交付。
- **数据约束**：只有已生效版本参与检索；知识来源和版本必须可追溯；退款/赔付不允许由机器人直接执行。

## Execution Plan

Full 路径须先运行 `ssf execution recommend`，由用户确认 `inline`、`batch-inline` 或 `sdd`，再运行 `ssf execution plan`。执行计划必须与当前工件、合同和 wave 定义匹配。

## Execution Waves

### Wave 1

- **Wave ID**：foundation
- **任务**：1.1, 1.2, 1.3
- **依赖 wave**：无
- **策略**：`serial`
- **目标**：建立统一变量协议、三语意图路由和基础知识检索回答流程。
- **输入**：Dify 项目、三语测试样例、商品/物流/售后基准文档。
- **输出**：可在 Dify 预览中运行的三语基础客服工作流。
- **完成标准**：三种语言均能进入正确业务分支；命中有效知识时回答并显示来源；缺少必要信息时请求补充。
- **Review gate**：`.superpowers/sdd/reviews/foundation.md`；记录 base/head SHA 和 `pass` review receipt。

### Wave 2

- **Wave ID**：handoff
- **任务**：2.1, 2.2
- **依赖 wave**：foundation
- **策略**：`serial`
- **目标**：实现风险判断、转人工状态和会话摘要。
- **输入**：foundation 的工作流和会话变量。
- **输出**：四类人工接管场景均可触发的人工接管分支。
- **完成标准**：恶劣语气、明确转人工、连续两次无法回答、退款/赔付/投诉均停止自动处理并输出完整摘要。
- **Review gate**：`.superpowers/sdd/reviews/handoff.md`；记录 base/head SHA 和 `pass` review receipt。

### Wave 3

- **Wave ID**：knowledge-base
- **任务**：3.1, 3.2
- **依赖 wave**：foundation
- **策略**：`serial`
- **目标**：建立知识库生命周期和检索测试能力。
- **输入**：知识文档分类、版本、生效状态约定。
- **输出**：可维护、可测试、可追溯的首期知识库。
- **完成标准**：新版本发布、旧版本停用、文档删除/更新和检索来源展示均通过测试。
- **Review gate**：`.superpowers/sdd/reviews/knowledge-base.md`；记录 base/head SHA 和 `pass` review receipt。

### Wave 4

- **Wave ID**：acceptance
- **任务**：4.1, 4.2
- **依赖 wave**：handoff, knowledge-base
- **策略**：`serial`
- **目标**：完成固定验收集、准确率计算和边界回归。
- **输入**：前置 waves 的工作流、知识库和转人工分支。
- **输出**：三语综合验收结果、准确率报告和失败样例清单。
- **完成标准**：常见问题准确率达到 90%，高风险场景无漏转，结果可重复执行。
- **Review gate**：`.superpowers/sdd/reviews/acceptance.md`；记录 base/head SHA 和 `pass` review receipt。

## Test Obligations

- **必须先从失败测试开始的行为**：三语输入路由、连续两次无法回答计数、退款/赔付/投诉转人工、停用知识不再被检索。
- **必需的边界情况**：语言无法识别、问题同时涉及多个业务、知识库无命中、旧版与新版文档并存、用户在转人工前补充信息、恶劣语气但问题仍可识别。
- **回归敏感区域**：意图路由、知识库生效过滤、回答来源展示、人工接管条件、会话摘要字段和准确率统计。

## Execution Mode

- **可用方式与推荐**：执行前运行 `ssf execution recommend changes/cross-border-customer-service-bot --wave foundation:serial:1.1,1.2,1.3 --wave handoff:serial:2.1,2.2:foundation --wave knowledge-base:serial:3.1,3.2:foundation --wave acceptance:serial:4.1,4.2:handoff,knowledge-base`。
- **用户确认的模式**：待 DP-4 确认。
- **推荐理由 / 项目事实**：项目包含 9 个任务、4 个有依赖的交付 wave，且需要逐 wave 审查；由 `ssf execution recommend` 根据当前工件给出最终推荐。
- **非推荐选择的风险确认**：若选择非推荐模式，执行计划必须附带 `--acknowledge-recommendation`。
- **执行计划命令**：待 DP-4 选择模式后生成。
- **允许的修订**：只能保留或升级为 `sdd`，重新推荐后确认新 revision；不得降级执行模式。
- **计划 revision / artifact hash**：待 DP-4 生成。

## Verification Dimensions

| 维度 | 状态 | 发现 |
|------|------|------|
| Completeness | Pass | 规划中的 5 个 SHALL/MUST 行为均映射到任务、wave 和测试义务 |
| Correctness | Pending | 需在 Dify 预览中执行三语和业务测试集 |
| Coherence | Pass | proposal、specs、design、tasks 与本合同的范围和边界一致 |

**总体结论**：Pending — 等待 DP-3 合同批准和 DP-4 执行模式确认。

## Review Gates

- **强制审查点**：每个 Execution Wave 完成后记录 `ssf execution review` 的 review receipt。
- **阻塞类别**：依赖未通过、review receipt 为 `fail`、缺失或过期，或测试结果不能证明对应规格。
- **收口条件**：所有当前 wave 都有 `pass` review receipt，且综合验收达到 90% 准确率、高风险场景无漏转。

## Escalation Rules

- **何时回退到 `specifying`**：新增外部渠道、自动退款/赔付、自动翻译专项优化或客服数据分析进入首期范围；或三语/知识库/人工接管规则发生行为变化。
- **何时回退到 `bridging`**：仅执行分组、任务依赖、审查策略或执行模式发生变化，但已批准需求和设计不变。
- **何时不得继续实现**：合同未获 DP-3 批准、没有 current execution plan、前置 wave 未通过 review，或 Dify 测试显示规格未覆盖的风险行为。

