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
