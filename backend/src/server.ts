import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig, type AppConfig } from './config.js';
import { openDifyChat, parseSseFrame } from './dify.js';
import { InMemoryConversationStore, type ConversationStore } from './store.js';

interface AppOptions {
  config?: AppConfig;
  store?: ConversationStore;
  fetcher?: typeof fetch;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const store = options.store ?? new InMemoryConversationStore();
  const app = Fastify({ logger: false });

  app.get('/health', async () => ({
    status: 'ok',
    dependencies: { database: 'ready', dify: config.difyApiKey ? 'configured' : 'missing' }
  }));

  app.post<{ Body: { conversationId?: string; userId: string; language?: string } }>(
    '/api/conversations',
    async (request, reply) => {
      if (!request.body?.userId) return reply.code(400).send({ error: 'userId_required' });
      const conversation = await store.ensureConversation(
        request.body.conversationId ?? crypto.randomUUID(),
        request.body.userId
      );
      if (request.body.language && store.updateConversation) {
        await store.updateConversation(conversation.id, { language: request.body.language });
        conversation.language = request.body.language;
      }
      return reply.code(201).send(conversation);
    }
  );

  app.get<{ Params: { id: string }; Querystring: { userId?: string } }>(
    '/api/conversations/:id',
    async (request, reply) => {
      const conversation = await store.getConversation(request.params.id);
      if (!conversation || (request.query.userId && conversation.userId !== request.query.userId)) {
        return reply.code(404).send({ error: 'conversation_not_found' });
      }
      return conversation;
    }
  );

  app.post<{ Params: { id: string }; Body: { query: string; userId: string } }>(
    '/api/conversations/:id/messages',
    async (request, reply) => {
      if (!request.body?.query?.trim()) return reply.code(400).send({ error: 'query_required' });
      const conversation = await store.getConversation(request.params.id);
      if (!conversation || conversation.userId !== request.body.userId) {
        return reply.code(404).send({ error: 'conversation_not_found' });
      }
      const response = await openDifyChat({
        baseUrl: config.difyBaseUrl,
        apiKey: config.difyApiKey,
        fetcher: options.fetcher
      }, {
        query: request.body.query,
        user: request.body.userId,
        conversationId: conversation.difyConversationId
      });
      reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' });
      const reader = response.body?.getReader();
      if (!reader) return reply.raw.end();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const event = parseSseFrame(frame);
          if (!event) continue;
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          if (event.type === 'delta') {
            await store.appendMessage({ eventId: event.messageId, conversationId: conversation.id, role: 'assistant', content: event.text });
            if (store.updateConversation) await store.updateConversation(conversation.id, { difyConversationId: event.conversationId });
          }
        }
      }
      reply.raw.end();
      return reply;
    }
  );

  return app;
}
