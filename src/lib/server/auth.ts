import { dev } from '$app/environment';
import { error, redirect, type Cookies } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

export const SESSION_COOKIE = 'elmozza_session';
const SESSION_DAYS = 14;

export type AuthUser = {
	id: number;
	username: string;
	email: string;
	role: 'superadmin' | 'owner' | 'admin' | 'editor' | 'reviewer' | 'learner';
	total_xp: number;
	current_streak: number;
};

const ROLES: AuthUser['role'][] = ['superadmin', 'owner', 'admin', 'editor', 'reviewer', 'learner'];
const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array) => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string) => new Uint8Array(value.match(/.{1,2}/g)?.map((item) => Number.parseInt(item, 16)) ?? []);

export async function hashPassword(password: string, salt?: Uint8Array) {
	const resolvedSalt = salt ?? crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
	const saltBuffer = new Uint8Array(resolvedSalt).buffer as ArrayBuffer;
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
		key,
		256
	);
	return `${toHex(resolvedSalt)}:${toHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
	if (!storedHash || !storedHash.includes(':')) return false;
	const [saltHex, expected] = storedHash.split(':');
	const actual = await hashPassword(password, fromHex(saltHex));
	const actualHash = actual.split(':')[1];
	if (actualHash.length !== expected.length) return false;
	let comparison = 0;
	for (let i = 0; i < actualHash.length; i += 1) comparison |= actualHash.charCodeAt(i) ^ expected.charCodeAt(i);
	return comparison === 0;
}

export function validateCredentials(username: string, email: string, password: string) {
	const errors: Record<string, string> = {};
	if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) errors.username = 'Username 3–32 karakter: huruf, angka, garis bawah, atau tanda hubung.';
	if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Masukkan alamat email yang valid.';
	if (password.length < 10) errors.password = 'Password minimal 10 karakter.';
	return errors;
}

export function safeUser(row: unknown): AuthUser | null {
	if (!row || typeof row !== 'object') return null;
	const value = row as Record<string, unknown>;
	if (typeof value.id !== 'number' || typeof value.username !== 'string' || typeof value.email !== 'string') return null;
	return {
		id: value.id,
		username: value.username,
		email: value.email,
		role: ROLES.includes(value.role as AuthUser['role']) ? (value.role as AuthUser['role']) : 'learner',
		total_xp: Number(value.total_xp ?? 0),
		current_streak: Number(value.current_streak ?? 0)
	};
}

export async function createSession(db: D1Database, userId: number, cookies: Cookies) {
	const id = crypto.randomUUID();
	const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
	await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(id, userId, expires.toISOString()).run();
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires
	});
}

export async function destroySession(db: D1Database, cookies: Cookies) {
	const id = cookies.get(SESSION_COOKIE);
	if (id) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function requireUser(user: AuthUser | null) {
	if (!user) throw redirect(303, '/login');
	return user;
}

export function requireAdmin(user: AuthUser | null) {
	const member = requireUser(user);
	if (!['superadmin', 'owner', 'admin'].includes(member.role)) throw error(403, 'Akses admin diperlukan.');
	return member;
}

export const normalize = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '');
export const rawFormValue = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '');
export async function rateLimitKey(scope: string, ...parts: string[]) {
	const digest = await crypto.subtle.digest('SHA-256', encoder.encode([scope, ...parts].join(':')));
	return toHex(new Uint8Array(digest));
}
export const safeRedirect = (value: FormDataEntryValue | null, fallback = '/dashboard') => {
	const target = normalize(value);
	return target.startsWith('/') && !target.startsWith('//') && !target.includes('\\') ? target : fallback;
};
export const dbOrError = (db: D1Database | undefined) => {
	if (!db) throw error(500, 'Database belum terhubung.');
	return db;
};
