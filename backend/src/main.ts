import { createApp } from './server.js';
import { loadConfig } from './config.js';
import mysql from 'mysql2/promise';
import { MysqlConversationStore } from './mysql-store.js';
import { buildHandoffWebhookPayload, sendFeishuWebhook } from './integrations/feishu.js';
import { MysqlFeishuEventStore } from './mysql-feishu-event-store.js';

const config = loadConfig();
const pool = mysql.createPool(config.mysqlUrl);
await pool.query('SELECT 1');
const handoffNotifier = config.feishuWebhookUrl
  ? async (input: { conversationId: string; reason: string; summary?: string }) => {
      await sendFeishuWebhook(config.feishuWebhookUrl!, buildHandoffWebhookPayload(input));
    }
  : undefined;
const app = await createApp({
  config,
  store: new MysqlConversationStore(pool),
  feishuEventStore: new MysqlFeishuEventStore(pool),
  feishuEncryptKey: config.feishuEncryptKey,
  handoffNotifier
});
await app.listen({ host: '0.0.0.0', port: config.port });
