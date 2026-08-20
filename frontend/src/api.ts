export interface Conversation { id: string; userId: string; language?: string; summary?: string; handoffStatus: string; handoffReason?: string; messages: { role: string; content: string }[] }
// The Nginx proxy already owns the /api prefix in production.
// Keep the client base URL empty by default so paths are not generated as /api/api/*.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function createConversation(userId: string, language: string): Promise<Conversation> {
  const response = await fetch(`${baseUrl}/api/conversations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, language }) });
  if (!response.ok) throw new Error('conversation_create_failed');
  return response.json() as Promise<Conversation>;
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const response = await fetch(`${baseUrl}/api/conversations?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) throw new Error('conversation_list_failed');
  return response.json() as Promise<Conversation[]>;
}

export async function getConversation(id: string, userId: string): Promise<Conversation> {
  const response = await fetch(`${baseUrl}/api/conversations/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) throw new Error('conversation_load_failed');
  return response.json() as Promise<Conversation>;
}

export async function deleteConversation(id: string, userId: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/conversations/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('conversation_delete_failed');
}

export async function requestHandoff(id: string, reason: string, summary?: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/handoff`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conversationId: id, reason, summary }) });
  if (!response.ok) throw new Error('handoff_failed');
}

export async function sendMessage(id: string, userId: string, query: string, onEvent: (event: Record<string, unknown>) => void): Promise<void> {
  const response = await fetch(`${baseUrl}/api/conversations/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, query }) });
  if (!response.ok || !response.body) throw new Error('message_send_failed');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) {
    const part = await reader.read(); if (part.done) break; buffer += decoder.decode(part.value, { stream: true });
    const frames = buffer.split('\n\n'); buffer = frames.pop() ?? '';
    for (const frame of frames) { const line = frame.split(/\r?\n/).find(item => item.startsWith('data:')); if (line) onEvent(JSON.parse(line.slice(5).trim()) as Record<string, unknown>); }
  }
}
