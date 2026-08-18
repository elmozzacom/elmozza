-- Gamified learning path, habit loop, SRS, and push.
-- Additive only. Existing users, progress, and questionnaires stay intact.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS path_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  sort INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS path_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  intro_sentence TEXT NOT NULL,
  sort INTEGER NOT NULL,
  FOREIGN KEY (section_id) REFERENCES path_sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS path_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL,
  sort INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'vocab_match','listening','fill_gap','sentence_builder',
    'speaking','story_dialogue','checkpoint','review'
  )),
  title TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 10,
  payload TEXT NOT NULL,
  srs_item_key TEXT,
  FOREIGN KEY (unit_id) REFERENCES path_units(id) ON DELETE CASCADE,
  UNIQUE (unit_id, sort)
);

CREATE TABLE IF NOT EXISTS user_step_progress (
  user_id INTEGER NOT NULL,
  step_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  score INTEGER NOT NULL DEFAULT 0,
  perfect INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, step_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES path_steps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_game (
  user_id INTEGER PRIMARY KEY,
  gems INTEGER NOT NULL DEFAULT 0,
  hearts INTEGER NOT NULL DEFAULT 5,
  hearts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  daily_goal INTEGER NOT NULL DEFAULT 20,
  age_band TEXT NOT NULL DEFAULT 'adults' CHECK (age_band IN ('kids','teens','adults')),
  parental_email TEXT,
  onboarded_at TEXT,
  freeze_bank INTEGER NOT NULL DEFAULT 1,
  freeze_week TEXT,
  last_repair_at TEXT,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  week_key TEXT,
  league_tier INTEGER NOT NULL DEFAULT 0,
  league_opt_out INTEGER NOT NULL DEFAULT 0,
  reminder_hour INTEGER NOT NULL DEFAULT 19,
  last_xp_on TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_quests (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  quest_key TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, quest_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id INTEGER NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS srs_items (
  item_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('vocab','grammar')),
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_item_strength (
  user_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at TEXT NOT NULL,
  PRIMARY KEY (user_id, item_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_key) REFERENCES srs_items(item_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id INTEGER PRIMARY KEY,
  daily_reminder INTEGER NOT NULL DEFAULT 1,
  streak_risk INTEGER NOT NULL DEFAULT 1,
  league_result INTEGER NOT NULL DEFAULT 1,
  review_digest INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_turns (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  turns INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_steps_unit ON path_steps(unit_id, sort);
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_step_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_srs_due ON user_item_strength(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_log ON notification_log(created_at);
