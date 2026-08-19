import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryConversationStore } from '../src/store.js';

test('conversation store ignores duplicate message events', async () => {
  const store = new InMemoryConversationStore();
  await store.appendMessage({
    eventId: 'm1', conversationId: 'c1', role: 'user', content: 'Where is my order?'
  });
  await store.appendMessage({
    eventId: 'm1', conversationId: 'c1', role: 'user', content: 'Where is my order?'
  });

  const conversation = await store.getConversation('c1');
  assert.equal(conversation?.messages.length, 1);
});
