CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  language VARCHAR(16) NULL,
  dify_conversation_id VARCHAR(128) NULL,
  summary TEXT NULL,
  handoff_status VARCHAR(32) NOT NULL DEFAULT 'bot',
  handoff_reason VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_conversations_user_updated (user_id, updated_at)
);

CREATE TABLE IF NOT EXISTS messages (
  event_id VARCHAR(128) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE IF NOT EXISTS handoff_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  reason VARCHAR(128) NOT NULL,
  summary TEXT NULL,
  source_event_id VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_handoff_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
