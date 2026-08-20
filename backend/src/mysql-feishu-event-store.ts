import type { Pool } from 'mysql2/promise';
import type { FeishuEventStore } from './integrations/feishu.js';

export class MysqlFeishuEventStore implements FeishuEventStore {
  constructor(private readonly pool: Pool) {}

  async claim(eventId: string): Promise<boolean> {
    const [result] = await this.pool.execute<any>(
      'INSERT IGNORE INTO feishu_events (event_id) VALUES (?)',
      [eventId]
    );
    return Number(result.affectedRows) === 1;
  }
}
