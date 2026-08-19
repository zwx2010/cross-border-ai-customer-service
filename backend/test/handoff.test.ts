import test from 'node:test';
import assert from 'node:assert/strict';
import { recordHandoff } from '../src/handoff.js';
import { InMemoryConversationStore } from '../src/store.js';

test('handoff records status and sends one notification payload', async () => {
  const store = new InMemoryConversationStore(); await store.ensureConversation('c1', 'u1');
  let notified = 0; await recordHandoff(store, { conversationId: 'c1', reason: 'refund_request', summary: 'Customer requests a refund' }, async input => { notified++; assert.equal(input.conversationId, 'c1'); });
  assert.equal(notified, 1); assert.equal((await store.getConversation('c1'))?.handoffStatus, 'waiting_human');
});
