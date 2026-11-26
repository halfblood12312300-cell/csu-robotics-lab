-- Additive migration. Never edit the deployed content/media migrations.
-- Only SHA-256 digests of random session tokens are stored here.
CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  key_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX admin_sessions_expires_idx ON admin_sessions (expires_at);
