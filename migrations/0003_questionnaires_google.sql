-- The 14-day questionnaire programme and Google account linking.
-- Purely additive: no existing table is altered beyond one nullable column,
-- and no live row is rewritten.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS questionnaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_number INTEGER NOT NULL UNIQUE CHECK (day_number BETWEEN 1 AND 14),
  title TEXT NOT NULL,
  focus TEXT NOT NULL DEFAULT 'comfort' CHECK (focus IN ('comfort', 'grammar', 'fluency')),
  questions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 14),
  answers TEXT NOT NULL,
  self_rating INTEGER CHECK (self_rating IS NULL OR self_rating BETWEEN 1 AND 5),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- One response per user per day. This is the rule the unlock logic depends on,
-- so it is enforced by the database and not only by application code.
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_user_day ON questionnaire_responses(user_id, day_number);
CREATE INDEX IF NOT EXISTS idx_qr_completed ON questionnaire_responses(completed_at);
CREATE INDEX IF NOT EXISTS idx_qr_day ON questionnaire_responses(day_number);

-- Google sign-in links to an existing account rather than duplicating it.
-- Nullable: password accounts that never use Google keep a NULL here, and
-- SQLite allows many NULLs under a unique index.
ALTER TABLE users ADD COLUMN google_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
