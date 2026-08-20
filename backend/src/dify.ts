export type DifyEvent =
  | { type: 'delta'; conversationId: string; messageId: string; text: string }
  | { type: 'end'; conversationId: string; messageId: string }
  | { type: 'error'; code: string; message: string };

interface DifyPayload {
  event?: string;
  conversation_id?: string;
  message_id?: string;
  answer?: string;
  code?: string;
  message?: string;
}

function toEvent(payload: DifyPayload): DifyEvent | undefined {
  if (payload.event === 'message' && payload.conversation_id && payload.message_id) {
    return {
      type: 'delta',
      conversationId: payload.conversation_id,
      messageId: payload.message_id,
      text: payload.answer ?? ''
    };
  }
  if (payload.event === 'message_end' && payload.conversation_id && payload.message_id) {
    return { type: 'end', conversationId: payload.conversation_id, messageId: payload.message_id };
  }
  if (payload.event === 'error') {
    return {
      type: 'error',
      code: payload.code ?? 'dify_error',
      message: payload.message ?? 'Dify request failed'
    };
  }
  return undefined;
}

export function parseSseFrame(frame: string): DifyEvent | undefined {
  const data = frame
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
    .join('');
  if (!data || data === '[DONE]') return undefined;
  return toEvent(JSON.parse(data) as DifyPayload);
}

export function* parseSseEvents(chunks: Iterable<string>): Generator<DifyEvent> {
  let buffer = '';
  for (const chunk of chunks) {
    buffer += chunk;
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const event = parseSseFrame(frame);
      if (event) yield event;
    }
  }
}

export interface DifyClientOptions {
  baseUrl: string;
  apiKey: string;
  fetcher?: typeof fetch;
}

export interface ChatRequest {
  query: string;
  user: string;
  conversationId?: string;
}

export async function openDifyChat(options: DifyClientOptions, request: ChatRequest): Promise<Response> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${options.baseUrl.replace(/\/$/, '')}/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      inputs: {},
      query: request.query,
      user: request.user,
      response_mode: 'streaming',
      ...(request.conversationId ? { conversation_id: request.conversationId } : {})
    })
  });
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let detail = raw.trim();
    try {
      const payload = JSON.parse(raw) as { code?: string; message?: string; description?: string };
      detail = [payload.code, payload.message ?? payload.description].filter(Boolean).join(': ');
    } catch {
      // Keep the raw response when Dify does not return JSON.
    }
    throw new Error(`Dify request failed with status ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  return response;
}
