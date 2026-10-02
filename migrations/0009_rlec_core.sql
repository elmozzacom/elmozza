-- Real-Life English Coach (RLEC) Phase 1 "Master Core".
-- Additive only: new rlec_* tables and indexes. No ALTER or DROP of existing
-- tables. Safe to run twice (IF NOT EXISTS + INSERT OR IGNORE).
-- Plan: HERMES-REAL-LIFE-ENGLISH-COACH-IMPLEMENTATION-PLAN-v0.1.md sections 3-6.

PRAGMA foreign_keys = ON;

-- Cross-channel identity (Telegram, web, Google) -> users.id
CREATE TABLE IF NOT EXISTS rlec_identity_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('telegram','web','google')),
  external_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (channel, external_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rlec_identity_links_user ON rlec_identity_links(user_id);

CREATE TABLE IF NOT EXISTS rlec_learner_profiles (
  user_id INTEGER PRIMARY KEY,
  cefr_self TEXT CHECK (cefr_self IS NULL OR cefr_self IN ('A1','A2','B1','B2','C1','C2')),
  cefr_estimated TEXT CHECK (cefr_estimated IS NULL OR cefr_estimated IN ('A1','A2','B1','B2','C1','C2')),
  native_lang TEXT NOT NULL DEFAULT 'id',
  goals_json TEXT NOT NULL DEFAULT '[]',
  domains_json TEXT NOT NULL DEFAULT '[]',
  preferred_mode TEXT NOT NULL DEFAULT 'guided' CHECK (preferred_mode IN ('guided','free')),
  correction_style TEXT NOT NULL DEFAULT 'beginner' CHECK (correction_style IN ('beginner','intermediate','advanced')),
  session_minutes_default INTEGER NOT NULL DEFAULT 10 CHECK (session_minutes_default BETWEEN 3 AND 60),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','basic','coach','immersion')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- One scenario shape for every entry point. Content is referenced, not copied.
CREATE TABLE IF NOT EXISTS rlec_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('ecw','gcw','ecc','pcr_chapter','comic_page','tomorrow','manual')),
  source_ref TEXT,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  subdomain TEXT,
  place TEXT,
  situation TEXT,
  cefr TEXT CHECK (cefr IS NULL OR cefr IN ('A1','A2','B1','B2','C1','C2')),
  difficulty INTEGER CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5),
  role_a TEXT,
  role_b TEXT,
  learner_role_default TEXT,
  goal TEXT,
  context_brief TEXT,
  expected_vocab_json TEXT NOT NULL DEFAULT '[]',
  useful_phrases_json TEXT NOT NULL DEFAULT '[]',
  grammar_targets_json TEXT NOT NULL DEFAULT '[]',
  likely_questions_json TEXT NOT NULL DEFAULT '[]',
  likely_problems_json TEXT NOT NULL DEFAULT '[]',
  unexpected_challenge TEXT,
  branches_json TEXT,
  cultural_notes TEXT,
  safety_notes TEXT,
  model_instructions TEXT,
  correction_policy TEXT NOT NULL DEFAULT 'beginner' CHECK (correction_policy IN ('beginner','intermediate','advanced')),
  audio_refs_json TEXT NOT NULL DEFAULT '[]',
  quiz_refs_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','qc_passed','active','archived')),
  qc_report_json TEXT,
  created_by TEXT NOT NULL DEFAULT 'human' CHECK (created_by IN ('warehouse','llm','human')),
  owner_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rlec_scenarios_source ON rlec_scenarios(source_kind, source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rlec_scenarios_browse ON rlec_scenarios(status, domain, cefr);
CREATE INDEX IF NOT EXISTS idx_rlec_scenarios_owner ON rlec_scenarios(owner_user_id);

-- Learning sessions (all modes share one table), with cost tracking.
CREATE TABLE IF NOT EXISTS rlec_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('tomorrow','guided','free','comic','novel','byo','quiz')),
  scenario_id INTEGER,
  level TEXT CHECK (level IS NULL OR level IN ('A1','A2','B1','B2','C1','C2')),
  planned_minutes INTEGER NOT NULL DEFAULT 10 CHECK (planned_minutes BETWEEN 1 AND 120),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
  confidence_before INTEGER CHECK (confidence_before IS NULL OR confidence_before BETWEEN 1 AND 5),
  confidence_after INTEGER CHECK (confidence_after IS NULL OR confidence_after BETWEEN 1 AND 5),
  want_continue INTEGER CHECK (want_continue IS NULL OR want_continue IN (0,1)),
  notes TEXT,
  real_world_outcome TEXT,
  model_route TEXT,
  cost_estimate_usd REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES rlec_scenarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_rlec_sessions_user ON rlec_sessions(user_id, started_at);

CREATE TABLE IF NOT EXISTS rlec_session_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  turn_no INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('learner','tutor','system')),
  input_source TEXT NOT NULL DEFAULT 'text' CHECK (input_source IN ('text','voice','button')),
  text TEXT NOT NULL,
  normalized_text TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, turn_no, speaker),
  FOREIGN KEY (session_id) REFERENCES rlec_sessions(id) ON DELETE CASCADE
);

-- Error memory: fixed pattern catalogue, per-learner state, and event log.
CREATE TABLE IF NOT EXISTS rlec_error_patterns (
  code TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('meaning','grammar','vocabulary','fluency','pronunciation','naturalness')),
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  default_severity INTEGER NOT NULL DEFAULT 2 CHECK (default_severity BETWEEN 1 AND 3)
);

INSERT OR IGNORE INTO rlec_error_patterns (code, category, label, description, default_severity) VALUES
  ('PAST_TENSE_OMISSION',   'grammar',       'Past tense omitted',          'Uses base verb for a finished past action ("Yesterday I go").', 2),
  ('ARTICLE_OMISSION',      'grammar',       'Article omitted',             'Drops a/an/the before a singular countable noun ("I need doctor").', 1),
  ('SV_AGREEMENT',          'grammar',       'Subject-verb agreement',      'Verb does not agree with subject ("She have", "He go").', 2),
  ('PREPOSITION_CONFUSION', 'grammar',       'Preposition confusion',       'Wrong preposition for time/place/verb pattern ("in Monday", "discuss about").', 1),
  ('PLURAL_S_OMISSION',     'grammar',       'Plural -s omitted',           'Drops plural marker after a number or plural quantifier ("two ticket").', 1),
  ('WORD_ORDER_QUESTION',   'grammar',       'Question word order',         'Question keeps statement order or lacks auxiliary ("Where you go?").', 2),
  ('TRANSLATION_STYLE',     'meaning',       'Literal translation',         'Indonesian structure translated word by word, meaning unclear to a listener.', 3),
  ('LIMITED_VOCAB',         'vocabulary',    'Limited vocabulary',          'Cannot find a needed word; long workaround or switches to Indonesian.', 3),
  ('OVERUSE_VERY',          'naturalness',   'Overuse of "very"',           'Relies on "very + adjective" instead of a stronger word ("very tired" -> "exhausted").', 1),
  ('HESITATION_LONG_PAUSE', 'fluency',       'Long hesitation',             'Pauses long enough to break the conversation; no filler or repair phrase.', 2),
  ('PRON_TH',               'pronunciation', 'TH sound',                    'Pronounces /th/ as /t/ or /d/ ("tink" for "think").', 1),
  ('PRON_FINAL_CONSONANT',  'pronunciation', 'Final consonant dropped',     'Drops or merges final consonants (-s, -ed, -t, -k), changing meaning.', 2),
  ('WORD_STRESS',           'pronunciation', 'Word stress',                 'Stress on the wrong syllable makes the word hard to recognise.', 2),
  ('REGISTER_TOO_CASUAL',   'naturalness',   'Register too casual',         'Too informal for the situation (staff, doctor, officer, client).', 2);

CREATE TABLE IF NOT EXISTS rlec_learner_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pattern_code TEXT NOT NULL,
  example_wrong TEXT,
  example_fixed TEXT,
  frequency INTEGER NOT NULL DEFAULT 0,
  severity INTEGER NOT NULL DEFAULT 2 CHECK (severity BETWEEN 1 AND 3),
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_practiced TEXT,
  mastery_score REAL NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 1),
  -- SM-2 state (same algorithm as src/lib/server/srs.ts)
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, pattern_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pattern_code) REFERENCES rlec_error_patterns(code)
);
CREATE INDEX IF NOT EXISTS idx_rlec_learner_errors_due ON rlec_learner_errors(user_id, next_review_at);

CREATE TABLE IF NOT EXISTS rlec_error_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id INTEGER,
  turn_id INTEGER,
  pattern_code TEXT NOT NULL,
  wrong_text TEXT,
  fixed_text TEXT,
  corrected_at_turn INTEGER,
  retry_success INTEGER NOT NULL DEFAULT 0 CHECK (retry_success IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES rlec_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (turn_id) REFERENCES rlec_session_turns(id) ON DELETE SET NULL,
  FOREIGN KEY (pattern_code) REFERENCES rlec_error_patterns(code)
);
CREATE INDEX IF NOT EXISTS idx_rlec_error_events_user ON rlec_error_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rlec_error_events_session ON rlec_error_events(session_id);

-- AI spend ledger (Rupiah). Budget alerts at Rp2/5/8 juta of the Rp10 juta cap
-- are computed from SUM(cost_idr); see src/lib/server/rlec/budget.ts.
CREATE TABLE IF NOT EXISTS rlec_ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id INTEGER,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cost_idr REAL NOT NULL DEFAULT 0 CHECK (cost_idr >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES rlec_sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_rlec_ai_usage_created ON rlec_ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_rlec_ai_usage_user ON rlec_ai_usage(user_id, created_at);
