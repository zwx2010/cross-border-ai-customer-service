import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHandoffWebhookPayload, createFeishuSignature, sendFeishuWebhook, verifyFeishuSignature } from '../src/integrations/feishu.js';

test('Feishu signature accepts a current valid request and rejects stale data', () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createFeishuSignature(timestamp, 'encrypt-key', '{"event":"handoff"}');
  assert.equal(verifyFeishuSignature(timestamp, signature, 'encrypt-key', '{"event":"handoff"}'), true);
  assert.equal(verifyFeishuSignature('1', signature, 'encrypt-key', '{"event":"handoff"}'), false);
});

test('Feishu webhook payload follows the handoff notification template', async () => {
  let requestBody = '';
  const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
    requestBody = String(init?.body ?? '');
    return new Response('{}', { status: 200 });
  };
  const payload = buildHandoffWebhookPayload({ conversationId: 'c1', reason: 'refund_request', summary: 'Customer requests a refund' });
  await sendFeishuWebhook('https://open.feishu.cn/bot/v2/hook/test', payload, fetcher);
  const parsed = JSON.parse(requestBody);
  assert.equal(parsed.msg_type, 'interactive');
  assert.equal(parsed.card.header.title.content, '⚠️ 客服请求人工接管');
  assert.match(parsed.card.body.elements[0].text.content, /c1/);
  assert.match(parsed.card.body.elements[0].text.content, /refund_request/);
});
