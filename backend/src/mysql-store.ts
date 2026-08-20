import type { Pool } from 'mysql2/promise';
import type { Conversation, ConversationStore, Message } from './store.js';

export class MysqlConversationStore implements ConversationStore {
  constructor(private readonly pool: Pool) {}

  async ensureConversation(id: string, userId: string): Promise<Conversation> {
    await this.pool.execute('INSERT IGNORE INTO conversations (id, user_id) VALUES (?, ?)', [id, userId]);
    const conversation = await this.getConversation(id);
    if (!conversation) throw new Error('conversation_create_failed');
    return conversation;
  }

  async appendMessage(message: Message): Promise<void> {
    await this.pool.execute('INSERT IGNORE INTO messages (event_id, conversation_id, role, content) VALUES (?, ?, ?, ?)', [message.eventId, message.conversationId, message.role, message.content]);
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversationRows] = await this.pool.query<any[]>('SELECT * FROM conversations WHERE id = ?', [id]);
    const row = conversationRows[0];
    if (!row) return undefined;
    const [messageRows] = await this.pool.query<any[]>('SELECT event_id AS eventId, conversation_id AS conversationId, role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [id]);
    return { id: row.id, userId: row.user_id, language: row.language ?? undefined, difyConversationId: row.dify_conversation_id ?? undefined, summary: row.summary ?? undefined, handoffStatus: row.handoff_status, handoffReason: row.handoff_reason ?? undefined, messages: messageRows };
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    const [rows] = await this.pool.query<any[]>('SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
    const conversations: Conversation[] = [];
    for (const row of rows) {
      const conversation = await this.getConversation(row.id);
      if (conversation) conversations.push(conversation);
    }
    return conversations;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [conversationRows] = await connection.query<any[]>('SELECT id FROM conversations WHERE id = ? FOR UPDATE', [id]);
      if (!conversationRows.length) {
        await connection.rollback();
        return false;
      }
      await connection.execute('DELETE FROM messages WHERE conversation_id = ?', [id]);
      await connection.execute('DELETE FROM handoff_events WHERE conversation_id = ?', [id]);
      await connection.execute('DELETE FROM conversations WHERE id = ?', [id]);
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateConversation(id: string, patch: Partial<Pick<Conversation, 'language' | 'difyConversationId' | 'summary' | 'handoffStatus' | 'handoffReason'>>): Promise<void> {
    const fields: string[] = []; const values: any[] = [];
    const mapping: Record<string, string> = { language: 'language', difyConversationId: 'dify_conversation_id', summary: 'summary', handoffStatus: 'handoff_status', handoffReason: 'handoff_reason' };
    for (const [key, column] of Object.entries(mapping)) if (key in patch) { fields.push(`${column} = ?`); values.push((patch as Record<string, unknown>)[key]); }
    if (!fields.length) return;
    values.push(id);
    await this.pool.execute(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}
