-- Shared five-question sessions for Hermes cron, Telegram native Quiz Polls, and web.
-- Additive only; existing lessons, quiz_results, and leaderboard remain unchanged.

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE,
  package_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  package_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'failed')),
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status
  ON quiz_sessions (status, opened_at DESC);

CREATE TABLE IF NOT EXISTS quiz_publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  publication_key TEXT NOT NULL UNIQUE,
  question_id TEXT NOT NULL,
  question_index INTEGER NOT NULL CHECK (question_index BETWEEN 0 AND 4),
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'web')),
  status TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  external_poll_id TEXT UNIQUE,
  external_message_id TEXT,
  error_code TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, channel, question_index),
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_publications_poll ON quiz_publications (external_poll_id);
CREATE INDEX IF NOT EXISTS idx_quiz_publications_session ON quiz_publications (session_id, channel, status);

CREATE TABLE IF NOT EXISTS quiz_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'web')),
  external_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  leaderboard_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (leaderboard_opt_in IN (0, 1)),
  linked_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (platform, external_user_id),
  FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_players_linked_user ON quiz_players (linked_user_id);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  selected_option INTEGER NOT NULL CHECK (selected_option >= 0),
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (publication_id, player_id),
  FOREIGN KEY (publication_id) REFERENCES quiz_publications(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES quiz_players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_player ON quiz_answers (player_id, answered_at);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_publication ON quiz_answers (publication_id, answered_at);
