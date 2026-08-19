export interface Conversation { id: string; userId: string; language?: string; summary?: string; handoffStatus: string; handoffReason?: string; messages: { role: string; content: string }[] }
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4100';

export async function createConversation(userId: string, language: string): Promise<Conversation> {
  const response = await fetch(`${baseUrl}/api/conversations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, language }) });
  if (!response.ok) throw new Error('conversation_create_failed');
  return response.json() as Promise<Conversation>;
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
