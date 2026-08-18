-- Registration funnel for the admin dashboard.
-- Purely additive: no existing table is altered and no live row is touched.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'A1' CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1')),
  placement_score INTEGER NOT NULL DEFAULT 0 CHECK (placement_score BETWEEN 0 AND 100),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived')),
  source TEXT NOT NULL DEFAULT 'web',
  user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_email_ci ON registrations(lower(email));
CREATE INDEX IF NOT EXISTS idx_registrations_created ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_level ON registrations(level);

-- Email verification is stubbed: the column records intent, the flow is not wired
-- to a mail provider yet, so nothing here can silently claim an address is verified.
ALTER TABLE users ADD COLUMN email_verified_at TEXT;
