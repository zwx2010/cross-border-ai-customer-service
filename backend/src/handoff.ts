import type { ConversationStore } from './store.js';

export interface HandoffInput { conversationId: string; reason: string; summary?: string }
export type HandoffNotifier = (input: HandoffInput) => Promise<void>;

export async function recordHandoff(store: ConversationStore, input: HandoffInput, notifier?: HandoffNotifier): Promise<void> {
  if (!input.reason.trim()) throw new Error('handoff_reason_required');
  if (!store.updateConversation) throw new Error('handoff_store_unsupported');
  await store.updateConversation(input.conversationId, { handoffStatus: 'waiting_human', handoffReason: input.reason, summary: input.summary });
  if (notifier) await notifier(input);
}
