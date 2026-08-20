import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { InMemoryConversationStore } from '../src/store.js';
import { createFeishuSignature, InMemoryFeishuEventStore } from '../src/integrations/feishu.js';

test('Feishu event endpoint accepts a signed command once and ignores replay', async () => {
  const store = new InMemoryConversationStore();
  await store.ensureConversation('c1', 'u1');
  const app = await createApp({ config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 }, store, feishuEncryptKey: 'key', feishuEventStore: new InMemoryFeishuEventStore() });
  const body = { event_id: 'evt-1', conversation_id: 'c1', action: 'take_over' };
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = { 'x-feishu-timestamp': timestamp, 'x-feishu-signature': createFeishuSignature(timestamp, 'key', JSON.stringify(body)) };
  assert.equal((await app.inject({ method: 'POST', url: '/api/feishu/events', headers, payload: body })).statusCode, 200);
  assert.equal((await app.inject({ method: 'POST', url: '/api/feishu/events', headers, payload: body })).json().status, 'duplicate_ignored');
  assert.equal((await store.getConversation('c1'))?.handoffStatus, 'human_active');
  await app.close();
});

test('handoff API only changes a conversation for its owner', async () => {
  const store = new InMemoryConversationStore();
  await store.ensureConversation('c2', 'u1');
  const app = await createApp({ config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 }, store });
  const response = await app.inject({ method: 'POST', url: '/api/handoff', payload: { conversationId: 'c2', userId: 'u2', reason: 'manual_request' } });
  assert.equal(response.statusCode, 404);
  assert.equal((await store.getConversation('c2'))?.handoffStatus, 'bot');
  await app.close();
});

test('handoff API sends a Feishu notification and reports its delivery state', async () => {
  const store = new InMemoryConversationStore();
  await store.ensureConversation('c3', 'u3');
  let notified = 0;
  const app = await createApp({
    config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 },
    store,
    handoffNotifier: async input => { notified++; assert.equal(input.conversationId, 'c3'); }
  });
  const response = await app.inject({ method: 'POST', url: '/api/handoff', payload: { conversationId: 'c3', userId: 'u3', reason: 'manual_request', summary: '需要人工协助' } });
  assert.equal(response.statusCode, 202);
  assert.deepEqual(response.json(), { status: 'waiting_human', notification: 'sent' });
  assert.equal(notified, 1);
  assert.equal((await store.getConversation('c3'))?.handoffStatus, 'waiting_human');
  await app.close();
});

test('handoff API returns a provider error when Feishu delivery fails', async () => {
  const store = new InMemoryConversationStore();
  await store.ensureConversation('c4', 'u4');
  const app = await createApp({
    config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 },
    store,
    handoffNotifier: async () => { throw new Error('feishu_webhook_failed:400'); }
  });
  const response = await app.inject({ method: 'POST', url: '/api/handoff', payload: { conversationId: 'c4', userId: 'u4', reason: 'manual_request' } });
  assert.equal(response.statusCode, 502);
  assert.equal(response.json().error, 'feishu_webhook_failed:400');
  await app.close();
});
