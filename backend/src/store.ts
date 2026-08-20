export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  eventId: string;
  conversationId: string;
  role: MessageRole;
  content: string;
}

export interface Conversation {
  id: string;
  userId: string;
  language?: string;
  difyConversationId?: string;
  summary?: string;
  handoffStatus: 'bot' | 'waiting_human' | 'human_active' | 'resolved';
  handoffReason?: string;
  messages: Message[];
}

export interface ConversationStore {
  appendMessage(message: Message): Promise<void>;
  getConversation(id: string): Promise<Conversation | undefined>;
  listConversations(userId: string): Promise<Conversation[]>;
  ensureConversation(id: string, userId: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<boolean>;
  updateConversation?(id: string, patch: Partial<Pick<Conversation, 'language' | 'difyConversationId' | 'summary' | 'handoffStatus' | 'handoffReason'>>): Promise<void>;
}

export class InMemoryConversationStore implements ConversationStore {
  private readonly conversations = new Map<string, Conversation>();

  async ensureConversation(id: string, userId: string): Promise<Conversation> {
    const existing = this.conversations.get(id);
    if (existing) return existing;
    const created: Conversation = { id, userId, handoffStatus: 'bot', messages: [] };
    this.conversations.set(id, created);
    return created;
  }

  async appendMessage(message: Message): Promise<void> {
    const conversation = await this.ensureConversation(message.conversationId, 'unknown');
    if (!conversation.messages.some(item => item.eventId === message.eventId)) {
      conversation.messages.push(message);
    }
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    return conversation ? structuredClone(conversation) : undefined;
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    return [...this.conversations.values()]
      .filter(item => item.userId === userId)
      .map(item => structuredClone(item));
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  async updateConversation(id: string, patch: Partial<Pick<Conversation, 'language' | 'difyConversationId' | 'summary' | 'handoffStatus' | 'handoffReason'>>): Promise<void> {
    const conversation = this.conversations.get(id);
    if (!conversation) throw new Error('conversation_not_found');
    Object.assign(conversation, patch);
  }
}
