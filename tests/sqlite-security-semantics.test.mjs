import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const migrationPath = new URL('migrations/0001_auth_dashboard.sql', root).pathname;

const runPython = (script) => {
  const result = spawnSync('python3', ['-c', script, migrationPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

test('identity migration normalizes clean data and rejects case-insensitive legacy collisions', () => {
  const output = runPython(String.raw`
import sqlite3, sys
sql=open(sys.argv[1], encoding='utf8').read()
def legacy():
 c=sqlite3.connect(':memory:')
 c.executescript('CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, current_streak INTEGER DEFAULT 0, total_xp INTEGER DEFAULT 0, last_login TEXT);')
 return c
clean=legacy(); clean.execute("INSERT INTO users(username,email) VALUES(' Alice ',' ALICE@Example.COM ')"); clean.executescript(sql)
assert clean.execute('SELECT username,email FROM users').fetchone()==('Alice','alice@example.com')
for statement in ["INSERT INTO users(username,email) VALUES('alice','other@example.com')", "INSERT INTO users(username,email) VALUES('other','ALICE@EXAMPLE.COM')"]:
 try: clean.execute(statement); raise AssertionError('case-insensitive duplicate accepted')
 except sqlite3.IntegrityError: pass
collision=legacy(); collision.executemany('INSERT INTO users(username,email) VALUES(?,?)',[('Alice','one@example.com'),(' alice ','two@example.com')])
try: collision.executescript(sql); raise AssertionError('legacy collision was not rejected')
except sqlite3.IntegrityError: pass
print('migration-clean-and-collision-ok')
`);
  assert.equal(output, 'migration-clean-and-collision-ok');
});

test('progress transaction rolls back partial failure and replay cannot double-award XP', () => {
  const output = runPython(String.raw`
import sqlite3, sys
c=sqlite3.connect(':memory:')
c.executescript('''
CREATE TABLE users(id INTEGER PRIMARY KEY, total_xp INTEGER NOT NULL DEFAULT 0, current_streak INTEGER NOT NULL DEFAULT 0, last_login TEXT);
CREATE TABLE lesson_progress(user_id INTEGER, lesson_code TEXT, status TEXT, xp_awarded INTEGER, completed_at TEXT, UNIQUE(user_id,lesson_code));
INSERT INTO users(id) VALUES(1);
''')
insert="INSERT INTO lesson_progress VALUES(1,'ENG-A1-D01','completed',10,'2026-08-09 10:00:00') ON CONFLICT(user_id,lesson_code) DO NOTHING"
reconcile="UPDATE users SET total_xp=COALESCE((SELECT SUM(xp_awarded) FROM lesson_progress WHERE user_id=1 AND status='completed'),0), current_streak=(SELECT COUNT(DISTINCT date(completed_at)) FROM lesson_progress WHERE user_id=1 AND status='completed') WHERE id=1"
try:
 with c:
  c.execute(insert); c.execute('UPDATE missing_table SET x=1')
except sqlite3.OperationalError: pass
assert c.execute('SELECT COUNT(*) FROM lesson_progress').fetchone()[0]==0
for _ in range(2):
 with c: c.execute(insert); c.execute(reconcile)
assert c.execute('SELECT total_xp,current_streak FROM users').fetchone()==(10,1)
assert c.execute('SELECT COUNT(*) FROM lesson_progress').fetchone()[0]==1
print('atomic-rollback-and-replay-ok')
`);
  assert.equal(output, 'atomic-rollback-and-replay-ok');
});
