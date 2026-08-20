import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { loadConfig, type AppConfig } from './config.js';
import { openDifyChat, parseSseFrame } from './dify.js';
import { InMemoryConversationStore, type ConversationStore } from './store.js';
import { InMemoryFeishuEventStore, verifyFeishuSignature, type FeishuEventStore } from './integrations/feishu.js';
import { recordHandoff, type HandoffNotifier } from './handoff.js';

interface AppOptions {
  config?: AppConfig;
  store?: ConversationStore;
  fetcher?: typeof fetch;
  feishuEventStore?: FeishuEventStore;
  feishuEncryptKey?: string;
  handoffNotifier?: HandoffNotifier;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const store = options.store ?? new InMemoryConversationStore();
  const feishuEventStore = options.feishuEventStore ?? new InMemoryFeishuEventStore();
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

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

  app.delete<{ Params: { id: string }; Querystring: { userId?: string } }>(
    '/api/conversations/:id',
    async (request, reply) => {
      if (!request.query.userId) return reply.code(400).send({ error: 'userId_required' });
      const conversation = await store.getConversation(request.params.id);
      if (!conversation || conversation.userId !== request.query.userId) {
        return reply.code(404).send({ error: 'conversation_not_found' });
      }
      await store.deleteConversation(request.params.id);
      return reply.code(204).send();
    }
  );

  app.get<{ Querystring: { userId?: string } }>('/api/conversations', async (request, reply) => {
    if (!request.query.userId) return reply.code(400).send({ error: 'userId_required' });
    return store.listConversations(request.query.userId);
  });

  app.post<{ Body: { event_id?: string; conversation_id?: string; action?: string }; Headers: { 'x-feishu-timestamp'?: string; 'x-feishu-signature'?: string } }>(
    '/api/feishu/events',
    async (request, reply) => {
      const timestamp = request.headers['x-feishu-timestamp'];
      const signature = request.headers['x-feishu-signature'];
      const body = JSON.stringify(request.body ?? {});
      if (!options.feishuEncryptKey || !timestamp || !signature || !verifyFeishuSignature(timestamp, signature, options.feishuEncryptKey, body)) {
        return reply.code(401).send({ error: 'feishu_signature_invalid' });
      }
      const eventId = request.body.event_id;
      if (!eventId) return reply.code(400).send({ error: 'event_id_required' });
      if (await feishuEventStore.has(eventId)) return reply.code(200).send({ status: 'duplicate_ignored' });
      await feishuEventStore.remember(eventId);
      if (request.body.conversation_id && request.body.action && store.updateConversation) {
        const status = request.body.action === 'take_over' ? 'human_active' : request.body.action === 'resolve' ? 'resolved' : 'waiting_human';
        await store.updateConversation(request.body.conversation_id, { handoffStatus: status });
      }
      return reply.code(200).send({ status: 'accepted' });
    }
  );

  app.post<{ Body: { conversationId: string; reason: string; summary?: string } }>('/api/handoff', async (request, reply) => {
    try {
      await recordHandoff(store, request.body, options.handoffNotifier);
      return reply.code(202).send({ status: 'waiting_human' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'handoff_failed';
      return reply.code(message === 'handoff_reason_required' ? 400 : 404).send({ error: message });
    }
  });

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
      reply.hijack();
      reply.raw.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
        'access-control-allow-origin': request.headers.origin ?? '*',
        vary: 'Origin'
      });
      const reader = response.body?.getReader();
      if (!reader) return reply.raw.end();
      const decoder = new TextDecoder();
      let buffer = '';
      const pendingAssistantMessages = new Map<string, { conversationId: string; content: string }>();
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
            const pending = pendingAssistantMessages.get(event.messageId) ?? { conversationId: conversation.id, content: '' };
            pending.content += event.text;
            pendingAssistantMessages.set(event.messageId, pending);
            if (store.updateConversation) await store.updateConversation(conversation.id, { difyConversationId: event.conversationId });
          }
        }
      }
      for (const [eventId, message] of pendingAssistantMessages) {
        await store.appendMessage({ eventId, conversationId: message.conversationId, role: 'assistant', content: message.content });
      }
      reply.raw.end();
      return reply;
    }
  );

  return app;
}
