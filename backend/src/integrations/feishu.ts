import { createHash, timingSafeEqual } from 'node:crypto';

export function createFeishuSignature(timestamp: string, encryptKey: string, body: string): string {
  return createHash('sha256').update(`${timestamp}\n${encryptKey}\n${body}`).digest('hex');
}

export function verifyFeishuSignature(timestamp: string, signature: string, encryptKey: string, body: string, now = Date.now()): boolean {
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(now - timestampNumber * 1000) > 5 * 60 * 1000) return false;
  const expected = Buffer.from(createFeishuSignature(timestamp, encryptKey, body));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export interface FeishuEventStore { has(eventId: string): Promise<boolean>; remember(eventId: string): Promise<void> }

export class InMemoryFeishuEventStore implements FeishuEventStore {
  private readonly ids = new Set<string>();
  async has(eventId: string): Promise<boolean> { return this.ids.has(eventId); }
  async remember(eventId: string): Promise<void> { this.ids.add(eventId); }
}

export async function sendFeishuWebhook(webhookUrl: string, payload: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`feishu_webhook_failed:${response.status}`);
}
