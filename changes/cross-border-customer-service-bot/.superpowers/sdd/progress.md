# SDD Progress Ledger

## Foundation

- Task 1.1: complete — Dify workflow variables and branch protocol configured.
- Task 1.2: complete — English, Vietnamese, and Thai routing configured for product, order/logistics, after-sales, and human handoff intents.
- Task 1.3: complete — existing knowledge base connected; empty project knowledge base created for subsequent lifecycle work.
- Verification: Dify preview covered English, Vietnamese, and Thai logistics questions; each response used the corresponding language and requested the order number. A refund request paused at the human-intervention node.
- Note: evidence is manual Dify preview evidence; no external channel or production deployment was performed.

## Handoff repair (DP-5 continuation)

- Added a qwen3.8-max pre-classifier LLM that receives `sys.query` and emits `HUMAN` or `NORMAL`.
- Added a variable aggregator and conditional branch; the `HUMAN` branch is configured to match `HUMAN` and route to the existing `accept_handoff` intervention node, while the ELSE branch routes to Question Classifier.
- The stale `开始 → Question Classifier` edge was removed. The intended path is now `开始 → LLM 3 → 变量聚合器 → 条件分支`; HUMAN routes to `accept_handoff`, ELSE routes to Question Classifier.
- Regression evidence: `I need a human agent, please.` and `I want a refund for my order.` both pause at 人工介入 and expose the `已接管` action; the former completed successfully after confirmation.
- Remaining failure: `Where is my order?` is also routed to 人工介入, so the qwen3.8-max pre-classifier is over-triggering HUMAN. Multilingual logistics regression is paused until the pre-classifier prompt/rule is tightened.
- Status: not passed. Do not publish; refine the pre-classifier and rerun all three language logistics cases.
