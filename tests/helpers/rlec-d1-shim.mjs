// Minimal D1 (prepare/bind/first/all/run/batch) over node:sqlite, for RLEC tests.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

export function migratedDb(root) {
	const db = new DatabaseSync(':memory:');
	db.exec('PRAGMA foreign_keys = ON');
	db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, current_streak INTEGER DEFAULT 0, total_xp INTEGER DEFAULT 0, last_login TEXT);');
	const dir = new URL('migrations/', root);
	for (const f of fs.readdirSync(dir).filter((n) => /^\d{4}_.*\.sql$/.test(n)).sort()) db.exec(fs.readFileSync(new URL(f, dir), 'utf8'));
	return db;
}

export function d1(db) {
	const stmt = (sql, params = []) => ({
		sql,
		params,
		bind: (...p) => stmt(sql, p),
		first: async () => db.prepare(sql).get(...params) ?? null,
		all: async () => ({ results: db.prepare(sql).all(...params) }),
		run: async () => {
			const r = db.prepare(sql).run(...params);
			return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
		}
	});
	return {
		prepare: (sql) => stmt(sql),
		batch: async (list) => {
			db.exec('BEGIN');
			try {
				const out = [];
				for (const s of list) out.push(await s.run());
				db.exec('COMMIT');
				return out;
			} catch (e) {
				db.exec('ROLLBACK');
				throw e;
			}
		}
	};
}
