-- Superadmin role, audit trail, and one-day mercy unlocks.
-- Additive: no existing row is rewritten except a trigger replace
-- and a single email promotion that is idempotent.

PRAGMA foreign_keys = ON;

DROP TRIGGER IF EXISTS validate_user_role_insert;
DROP TRIGGER IF EXISTS validate_user_role_update;

CREATE TRIGGER validate_user_role_insert
BEFORE INSERT ON users WHEN NEW.role NOT IN ('superadmin', 'owner', 'admin', 'editor', 'reviewer', 'learner')
BEGIN SELECT RAISE(ABORT, 'invalid user role'); END;

CREATE TRIGGER validate_user_role_update
BEFORE UPDATE OF role ON users WHEN NEW.role NOT IN ('superadmin', 'owner', 'admin', 'editor', 'reviewer', 'learner')
BEGIN SELECT RAISE(ABORT, 'invalid user role'); END;

-- Bound mailbox: promote if the account already exists. Creating a dummy
-- password user for this address would collide with the real Google login.
UPDATE users
SET role = 'superadmin'
WHERE lower(email) = 'hendrychristiono2022@gmail.com'
  AND role != 'superadmin';

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  target_id INTEGER,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS mercy_unlocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 14),
  actor_id INTEGER,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (user_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_mercy_user ON mercy_unlocks(user_id);
