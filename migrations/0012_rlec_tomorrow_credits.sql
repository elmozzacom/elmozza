-- Real-Life English Coach — Tomorrow Mode (Level 0) credits + cards.
-- Additive only (CREATE ... IF NOT EXISTS, INSERT OR IGNORE). No ALTER/DROP/UPDATE/DELETE.
-- Safe to run twice. 0011 is reserved for another workstream.
-- Credit rule: bank hits are free; 1 credit is spent only when the LLM is actually
-- called; the free daily quota is consumed first; a failed generation is refunded.

PRAGMA foreign_keys = ON;

-- Key/value config. Prices are placeholders until Pak Dokter sets them.
CREATE TABLE IF NOT EXISTS rlec_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO rlec_config (key, value, description) VALUES
  ('free_daily_tomorrow', '1', 'Free AI Tomorrow Packs per user per day (WIB). Bank hits never count.'),
  ('tomorrow_model', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Workers AI model id for Tomorrow generation.'),
  ('tomorrow_llm_enabled', '1', 'Kill switch: 0 = bank-only.'),
  ('usd_idr', '16500', 'Rate used to convert Workers AI USD cost into rlec_ai_usage.cost_idr.'),
  ('price_in_usd_per_m', '0.293', 'llama-3.3-70b fp8-fast input price (26668 neurons per M).'),
  ('price_out_usd_per_m', '2.253', 'llama-3.3-70b fp8-fast output price (204805 neurons per M).'),
  ('credit_pack_5_price_idr', '0', 'PLACEHOLDER — price of 5 Tomorrow credits, not on sale yet.'),
  ('credit_pack_20_price_idr', '0', 'PLACEHOLDER — price of 20 Tomorrow credits, not on sale yet.');

CREATE TABLE IF NOT EXISTS rlec_credit_balance (
  user_id INTEGER PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Append-only ledger. amount is always positive; kind gives the sign.
-- source 'free_daily' rows never touch rlec_credit_balance.
CREATE TABLE IF NOT EXISTS rlec_credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('grant','spend','refund')),
  source TEXT NOT NULL CHECK (source IN ('free_daily','paid','admin','promo')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  ref TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rlec_credit_ledger_user ON rlec_credit_ledger(user_id, created_at);
-- One spend and at most one refund per reference (no double charge / double refund).
CREATE UNIQUE INDEX IF NOT EXISTS idx_rlec_credit_ledger_ref ON rlec_credit_ledger(user_id, kind, ref) WHERE ref IS NOT NULL AND kind IN ('spend','refund');

-- Tomorrow Cards (validated). The learner's raw text is NOT stored here; it stays
-- only in the learner's own rlec_tomorrow_notes. Nothing is written to the ECW warehouse.
CREATE TABLE IF NOT EXISTS rlec_tomorrow_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  note_id INTEGER,
  scenario_id INTEGER,
  session_id INTEGER,
  source TEXT NOT NULL CHECK (source IN ('bank','own','llm')),
  coverage TEXT NOT NULL CHECK (coverage IN ('FULL','PARTIAL','NONE')),
  domain_id TEXT,
  place TEXT,
  situation TEXT,
  level TEXT CHECK (level IS NULL OR level IN ('A1','A2','B1','B2','C1')),
  card_json TEXT NOT NULL,
  qc_json TEXT,
  anchors_json TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (note_id) REFERENCES rlec_tomorrow_notes(id) ON DELETE SET NULL,
  FOREIGN KEY (scenario_id) REFERENCES rlec_scenarios(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES rlec_sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_rlec_tomorrow_cards_user ON rlec_tomorrow_cards(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rlec_tomorrow_cards_reuse ON rlec_tomorrow_cards(user_id, domain_id, place, situation, level);
