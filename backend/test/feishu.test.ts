import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeishuSignature, verifyFeishuSignature } from '../src/integrations/feishu.js';

test('Feishu signature accepts a current valid request and rejects stale data', () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createFeishuSignature(timestamp, 'encrypt-key', '{"event":"handoff"}');
  assert.equal(verifyFeishuSignature(timestamp, signature, 'encrypt-key', '{"event":"handoff"}'), true);
  assert.equal(verifyFeishuSignature('1', signature, 'encrypt-key', '{"event":"handoff"}'), false);
});
