import type { D1Database } from '@cloudflare/workers-types';
import { jakartaDate } from '$lib/server/journey';
import { QUEST_POOL } from '$lib/content/ladder';

export type AgeBand = 'kids' | 'teens' | 'adults';

export type GameRow = {
	user_id: number;
	gems: number;
	hearts: number;
	hearts_at: string;
	daily_goal: number;
	age_band: AgeBand;
	parental_email: string | null;
	onboarded_at: string | null;
	freeze_bank: number;
	freeze_week: string | null;
	last_repair_at: string | null;
	weekly_xp: number;
	week_key: string | null;
	league_tier: number;
	league_opt_out: number;
	reminder_hour: number;
	last_xp_on: string | null;
};

export const LEAGUES = ['Quartz', 'Amber', 'Jade', 'Sapphire', 'Diamond'] as const;

export function weekKey(at = new Date()) {
	const shifted = new Date(at.getTime() + 7 * 60 * 60_000);
	const day = shifted.getUTCDay();
	const mondayOffset = day === 0 ? -6 : 1 - day;
	const monday = new Date(shifted);
	monday.setUTCDate(shifted.getUTCDate() + mondayOffset);
	return monday.toISOString().slice(0, 10);
}

export function isoWeek(date = jakartaDate()) {
	return weekKey(new Date(`${date}T00:00:00+07:00`));
}

export async function ensureGame(db: D1Database, userId: number): Promise<GameRow> {
	const existing = await db
		.prepare('SELECT * FROM user_game WHERE user_id = ?')
		.bind(userId)
		.first<GameRow>();
	if (existing) return refreshHearts(db, existing);

	await db
		.prepare(
			`INSERT INTO user_game (user_id, gems, hearts, hearts_at, daily_goal, age_band, freeze_bank, weekly_xp, week_key)
			 VALUES (?, 0, 5, datetime('now'), 20, 'adults', 1, 0, ?)`
		)
		.bind(userId, isoWeek())
		.run();
	const created = await db.prepare('SELECT * FROM user_game WHERE user_id = ?').bind(userId).first<GameRow>();
	if (!created) throw new Error('Could not open a game row.');
	return created;
}

/** Hearts refill one every four hours, capped at five. */
export async function refreshHearts(db: D1Database, game: GameRow): Promise<GameRow> {
	if (game.hearts >= 5) return game;
	const then = Date.parse(game.hearts_at.includes('T') ? game.hearts_at : game.hearts_at.replace(' ', 'T') + 'Z');
	if (Number.isNaN(then)) return game;
	const gained = Math.floor((Date.now() - then) / (4 * 60 * 60_000));
	if (gained <= 0) return game;
	const hearts = Math.min(5, game.hearts + gained);
	await db
		.prepare("UPDATE user_game SET hearts = ?, hearts_at = datetime('now') WHERE user_id = ?")
		.bind(hearts, game.user_id)
		.run();
	return { ...game, hearts, hearts_at: new Date().toISOString() };
}

export async function awardXp(
	db: D1Database,
	userId: number,
	amount: number,
	opts: { perfect?: boolean; kind?: string } = {}
) {
	const game = await ensureGame(db, userId);
	const today = jakartaDate();
	const week = isoWeek();
	let weekly = game.week_key === week ? game.weekly_xp : 0;
	weekly += amount;

	await db.batch([
		db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?').bind(amount, userId),
		db
			.prepare(
				`UPDATE user_game SET weekly_xp = ?, week_key = ?, last_xp_on = ?, gems = gems + ?
				 WHERE user_id = ?`
			)
			.bind(weekly, week, today, opts.perfect ? 2 : 0, userId)
	]);

	await bumpQuest(db, userId, 'xp30', amount);
	if (opts.kind === 'listening') await bumpQuest(db, userId, 'listen5', 1);
	if (opts.kind === 'speaking') await bumpQuest(db, userId, 'speak1', 1);
	if (opts.kind === 'review') await bumpQuest(db, userId, 'review3', 1);
	await bumpQuest(db, userId, 'steps2', 1);

	await maybeBadge(db, userId, 'first-step');
	return amount;
}

export async function todaysQuests(db: D1Database, userId: number, ageBand: AgeBand) {
	const day = jakartaDate();
	const existing = await db
		.prepare('SELECT quest_key, target, progress, completed FROM daily_quests WHERE user_id = ? AND day = ?')
		.bind(userId, day)
		.all<{ quest_key: string; target: number; progress: number; completed: number }>();
	if ((existing.results ?? []).length >= 3) return existing.results ?? [];

	const pool = ageBand === 'kids' ? QUEST_POOL.filter((q) => q.key !== 'listen5') : QUEST_POOL;
	const picked = pool.slice(0, 3);
	for (const quest of picked) {
		await db
			.prepare(
				`INSERT OR IGNORE INTO daily_quests (user_id, day, quest_key, target, progress, completed)
				 VALUES (?, ?, ?, ?, 0, 0)`
			)
			.bind(userId, day, quest.key, quest.target)
			.run();
	}
	const fresh = await db
		.prepare('SELECT quest_key, target, progress, completed FROM daily_quests WHERE user_id = ? AND day = ?')
		.bind(userId, day)
		.all<{ quest_key: string; target: number; progress: number; completed: number }>();
	return fresh.results ?? [];
}

async function bumpQuest(db: D1Database, userId: number, key: string, add: number) {
	const day = jakartaDate();
	const row = await db
		.prepare('SELECT progress, target, completed FROM daily_quests WHERE user_id = ? AND day = ? AND quest_key = ?')
		.bind(userId, day, key)
		.first<{ progress: number; target: number; completed: number }>();
	if (!row || row.completed) return;
	const progress = Math.min(row.target, row.progress + add);
	const completed = progress >= row.target ? 1 : 0;
	await db
		.prepare('UPDATE daily_quests SET progress = ?, completed = ? WHERE user_id = ? AND day = ? AND quest_key = ?')
		.bind(progress, completed, userId, day, key)
		.run();
	if (completed) {
		const all = await db
			.prepare('SELECT COUNT(*) AS n FROM daily_quests WHERE user_id = ? AND day = ? AND completed = 1')
			.bind(userId, day)
			.first<{ n: number }>();
		if (Number(all?.n ?? 0) >= 3) {
			await db.prepare('UPDATE user_game SET gems = gems + 15 WHERE user_id = ?').bind(userId).run();
		}
	}
}

export async function maybeBadge(db: D1Database, userId: number, badgeId: string) {
	await db
		.prepare(
			`INSERT OR IGNORE INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, datetime('now'))`
		)
		.bind(userId, badgeId)
		.run();
}

export async function applyStreak(
	db: D1Database,
	userId: number,
	currentStreak: number,
	opts: { usedFreeze?: boolean } = {}
) {
	if (currentStreak >= 3) await maybeBadge(db, userId, 'streak-3');
	if (currentStreak >= 7) await maybeBadge(db, userId, 'streak-7');
	if (currentStreak >= 14) await maybeBadge(db, userId, 'streak-14');
	const hour = new Date(Date.now() + 7 * 60 * 60_000).getUTCHours();
	if (hour < 7) await maybeBadge(db, userId, 'early-bird');
	if (hour >= 21) await maybeBadge(db, userId, 'night-owl');
	void opts;
}

export async function spendFreeze(db: D1Database, userId: number) {
	const game = await ensureGame(db, userId);
	const week = isoWeek();
	if (game.freeze_bank < 1) return { ok: false, reason: 'No freeze left this week.' };
	await db
		.prepare('UPDATE user_game SET freeze_bank = freeze_bank - 1, freeze_week = ? WHERE user_id = ?')
		.bind(week, userId)
		.run();
	await db.prepare('UPDATE users SET current_streak = current_streak + 0 WHERE id = ?').bind(userId).run();
	return { ok: true };
}

export async function repairStreak(db: D1Database, userId: number, lastXpOn: string | null) {
	if (!lastXpOn) return { ok: false, reason: 'Nothing to repair.' };
	const today = jakartaDate();
	const last = Date.parse(`${lastXpOn}T00:00:00Z`);
	const now = Date.parse(`${today}T00:00:00Z`);
	const gap = Math.round((now - last) / 86_400_000);
	if (gap < 2 || gap > 2) return { ok: false, reason: 'Repair is only open within 48 hours of a missed day.' };
	const game = await ensureGame(db, userId);
	if (game.last_repair_at && game.last_repair_at.slice(0, 10) === today) {
		return { ok: false, reason: 'Already repaired today.' };
	}
	if (game.gems < 20) return { ok: false, reason: 'Need 20 gems to repair.' };
	await db
		.prepare("UPDATE user_game SET gems = gems - 20, last_repair_at = datetime('now') WHERE user_id = ?")
		.bind(userId)
		.run();
	return { ok: true };
}

export function copyFor(age: AgeBand) {
	if (age === 'kids') {
		return {
			pathTitle: 'Your stepping stones',
			continue: 'Next stone',
			locked: 'This stone is still waiting.',
			hearts: 'Keep going — practice never costs a heart.'
		};
	}
	return {
		pathTitle: 'The ladder',
		continue: 'Continue',
		locked: 'This step is still locked.',
		hearts: 'Practice is free. Hearts are only for checkpoints.'
	};
}
