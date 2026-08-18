# Handoff Wave Review

## Scope

- qwen3.8-max pre-classifier receives the incoming `sys.query` through a user-role message.
- Reasoning-tag separation prevents `<think>` content from contaminating routing output.
- `HUMAN` routes to the existing `accept_handoff` intervention node.
- `LOGISTICS` routes directly to the existing logistics knowledge node.
- Other intents continue through Question Classifier.

## Verification

- English human request: paused at 人工介入; `已接管` action completed successfully.
- English refund request: paused at 人工介入.
- English logistics: completed in English and requested the order number.
- Vietnamese logistics: completed in Vietnamese and requested the order number.
- Thai logistics: completed in Thai and requested the order number.

## Verdict

Pass for the handoff and multilingual logistics routing scope. The Dify application remains unpublished; knowledge-base lifecycle and final acceptance waves remain outstanding.
