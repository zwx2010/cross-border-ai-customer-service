import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSseEvents } from '../src/dify.js';

test('SSE parser exposes answer deltas and completion metadata', () => {
  const events = [...parseSseEvents([
    'data: {"event":"message","conversation_id":"c1","message_id":"m1","answer":"Hello"}\n\n',
    'data: {"event":"message_end","conversation_id":"c1","message_id":"m1"}\n\n'
  ])];

  assert.deepEqual(events, [
    { type: 'delta', conversationId: 'c1', messageId: 'm1', text: 'Hello' },
    { type: 'end', conversationId: 'c1', messageId: 'm1' }
  ]);
});

test('SSE parser turns provider errors into a stable error event', () => {
  const [event] = [...parseSseEvents([
    'data: {"event":"error","code":"invalid_param","message":"bad request"}\n\n'
  ])];

  assert.deepEqual(event, { type: 'error', code: 'invalid_param', message: 'bad request' });
});
