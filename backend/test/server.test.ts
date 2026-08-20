import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { InMemoryConversationStore } from '../src/store.js';

test('health endpoint does not expose provider credentials', async () => {
  const app = await createApp({
    config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 },
    store: new InMemoryConversationStore()
  });
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok', dependencies: { database: 'ready', dify: 'configured', feishu: 'missing' } });
  assert.equal(response.body.includes('secret'), false);
  await app.close();
});

test('conversation API creates and restores a conversation', async () => {
  const app = await createApp({
    config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 },
    store: new InMemoryConversationStore()
  });
  const created = await app.inject({
    method: 'POST', url: '/api/conversations', payload: { conversationId: 'c1', userId: 'u1', language: 'en' }
  });
  assert.equal(created.statusCode, 201);
  const restored = await app.inject({ method: 'GET', url: '/api/conversations/c1?userId=u1' });
  assert.equal(restored.statusCode, 200);
  assert.equal(restored.json().id, 'c1');
  assert.equal(restored.json().language, 'en');
  await app.close();
});

test('conversation APIs require the owner for reads and existing IDs', async () => {
  const app = await createApp({
    config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 },
    store: new InMemoryConversationStore()
  });
  await app.inject({ method: 'POST', url: '/api/conversations', payload: { conversationId: 'owned', userId: 'u1' } });
  assert.equal((await app.inject({ method: 'GET', url: '/api/conversations/owned' })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/api/conversations', payload: { conversationId: 'owned', userId: 'u2' } })).statusCode, 404);
  await app.close();
});

test('conversation API deletes only the owner conversation', async () => {
  const app = await createApp({
    config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 },
    store: new InMemoryConversationStore()
  });
  await app.inject({ method: 'POST', url: '/api/conversations', payload: { conversationId: 'delete-me', userId: 'u1' } });
  const forbidden = await app.inject({ method: 'DELETE', url: '/api/conversations/delete-me?userId=u2' });
  assert.equal(forbidden.statusCode, 404);
  const deleted = await app.inject({ method: 'DELETE', url: '/api/conversations/delete-me?userId=u1' });
  assert.equal(deleted.statusCode, 204);
  const missing = await app.inject({ method: 'GET', url: '/api/conversations/delete-me?userId=u1' });
  assert.equal(missing.statusCode, 404);
  await app.close();
});

test('message API persists the user message before streaming the assistant reply', async () => {
  const app = await createApp({
    config: { difyBaseUrl: 'http://dify.local/v1', difyApiKey: 'secret', mysqlUrl: 'mysql://x', port: 4100 },
    store: new InMemoryConversationStore(),
    fetcher: async () => new Response(
      'data: {"event":"message","conversation_id":"dify-c1","message_id":"m1","answer":"请提供订单号。"}\n\n' +
      'data: {"event":"message_end","conversation_id":"dify-c1","message_id":"m1"}\n\n',
      { status: 200, headers: { 'content-type': 'text/event-stream' } }
    )
  });
  await app.inject({ method: 'POST', url: '/api/conversations', payload: { conversationId: 'c1', userId: 'u1' } });

  const response = await app.inject({
    method: 'POST',
    url: '/api/conversations/c1/messages',
    payload: { userId: 'u1', query: '  物流多久能到？  ' }
  });

  assert.equal(response.statusCode, 200);
  const conversation = await app.inject({ method: 'GET', url: '/api/conversations/c1?userId=u1' });
  assert.deepEqual(conversation.json().messages.map((message: { role: string; content: string }) => [message.role, message.content]), [
    ['user', '物流多久能到？'],
    ['assistant', '请提供订单号。']
  ]);
  await app.close();
});
