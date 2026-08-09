PRAGMA foreign_keys = ON;

-- Abort before any schema change when legacy identities collide case-insensitively.
-- Resolve the reported collision manually, then rerun this migration.
CREATE TEMP TABLE migration_identity_guard (identity TEXT PRIMARY KEY);
INSERT INTO migration_identity_guard(identity) SELECT 'username:' || lower(trim(username)) FROM users;
INSERT INTO migration_identity_guard(identity) SELECT 'email:' || lower(trim(email)) FROM users;
DROP TABLE migration_identity_guard;
UPDATE users SET username = trim(username), email = lower(trim(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_ci ON users(lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci ON users(lower(email));

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'learner';
ALTER TABLE users ADD COLUMN created_at TEXT;
UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

CREATE TRIGGER IF NOT EXISTS set_user_created_at
AFTER INSERT ON users WHEN NEW.created_at IS NULL
BEGIN UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS validate_user_role_insert
BEFORE INSERT ON users WHEN NEW.role NOT IN ('owner', 'admin', 'editor', 'reviewer', 'learner')
BEGIN SELECT RAISE(ABORT, 'invalid user role'); END;

CREATE TRIGGER IF NOT EXISTS validate_user_role_update
BEFORE UPDATE OF role ON users WHEN NEW.role NOT IN ('owner', 'admin', 'editor', 'reviewer', 'learner')
BEGIN SELECT RAISE(ABORT, 'invalid user role'); END;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, lesson_code)
);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);

CREATE TABLE IF NOT EXISTS content_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Existing users must set a password through controlled recovery; plaintext passwords are never stored.
