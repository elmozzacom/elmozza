-- Public honor board. Additive only.

CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quiz_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('path_step','checkpoint','daily_questionnaire','practice')),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  percentage REAL NOT NULL,
  duration_seconds REAL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, quiz_id, completed_at)
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_done ON quiz_results (user_id, completed_at);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES ('show_telegram_card', '1');
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('show_leaderboard_teaser', '1');

-- Nickname is opt-in and separate from the account display name.
ALTER TABLE users ADD COLUMN board_nickname TEXT;
ALTER TABLE users ADD COLUMN board_nickname_set_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_board_nick
  ON users (lower(board_nickname))
  WHERE board_nickname IS NOT NULL;
