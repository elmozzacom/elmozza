import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

/* -------------------------------------------------------------------------
 * Google OAuth
 * ---------------------------------------------------------------------- */

test('google sign-in uses state and PKCE, and clears them single-use', () => {
	const start = read('src/routes/login/google/+server.ts');
	const callback = read('src/routes/login/google/callback/+server.ts');

	assert.match(start, /generateState/);
	assert.match(start, /generateCodeVerifier/);
	assert.match(start, /httpOnly: true/);
	assert.match(start, /sameSite: 'lax'/);
	assert.match(start, /secure: !dev/);

	// The state must be compared, not merely read.
	assert.match(callback, /state !== storedState/);
	// And the cookies must be destroyed before any branch can return early.
	assert.match(callback, /cookies\.delete\(name, \{ path: '\/' \}\)/);
});

test('an unverified Google email can never link to an existing account', () => {
	const callback = read('src/routes/login/google/callback/+server.ts');
	// Google may hold an address the person has not proven they own; linking on
	// it would hand over someone else's password account.
	assert.match(callback, /if \(!profile\.email_verified\)/);
	const guardIndex = callback.indexOf('email_verified');
	const linkIndex = callback.indexOf('lower(email) = ?');
	assert.ok(guardIndex > -1 && linkIndex > guardIndex, 'the guard must precede the email lookup');
});

test('google linking updates the existing row instead of creating a duplicate', () => {
	const callback = read('src/routes/login/google/callback/+server.ts');
	assert.match(callback, /UPDATE users SET google_id = \?/);
	assert.match(callback, /google=conflict/);
	// A new account is only reached after both lookups fail.
	assert.match(callback, /INSERT INTO users/);
});

test('google credentials come from the platform env, never from the bundle', () => {
	const google = read('src/lib/server/google.ts');
	assert.match(google, /platform\?\.env/);
	assert.match(google, /\$env\/dynamic\/private/);
	// Match a real static import, not the word inside the comment that explains why.
	assert.doesNotMatch(google, /^import .*\$env\/static/m);
	// Absent credentials hide the button rather than offering a broken journey.
	assert.match(google, /export function googleConfigured/);
});

test('the google button is hidden when the deployment is not configured', () => {
	const login = read('src/routes/login/+page.svelte');
	const register = read('src/routes/register/+page.svelte');
	assert.match(login, /\{#if data\.googleEnabled\}/);
	assert.match(register, /\{#if data\.googleEnabled\}/);
	// Email and password stay fully available alongside it.
	assert.match(login, /name="password"/);
	assert.match(register, /name="password"/);
});

test('the google mark is the official four-colour G with no gradient', () => {
	const button = read('src/lib/components/GoogleButton.svelte');
	for (const hex of ['#4285F4', '#34A853', '#FBBC05', '#EA4335']) {
		assert.ok(button.includes(hex), `missing ${hex}`);
	}
	// A CSS gradient, not the word in the comment describing its absence.
	assert.doesNotMatch(button, /linear-gradient|radial-gradient|conic-gradient/);
	assert.match(button, /background: #fff/);
});

/* -------------------------------------------------------------------------
 * AOS
 * ---------------------------------------------------------------------- */

test('AOS initialises once and is disabled entirely for reduced motion', () => {
	const layout = read('src/routes/+layout.svelte');
	assert.match(layout, /once: true/);
	assert.match(layout, /disable: reduced/);
	assert.match(layout, /prefers-reduced-motion: reduce/);
	assert.match(layout, /AOS\.init/);
	// Exactly one initialisation in the whole app.
	assert.equal((layout.match(/AOS\.init/g) ?? []).length, 1);
});

test('content is visible without JavaScript and AOS travel is short', () => {
	const layout = read('src/routes/+layout.svelte');
	// If the script never runs, nothing may stay hidden.
	assert.match(layout, /\[data-aos\]:not\(\.aos-init\)/);
	assert.match(layout, /opacity: 1;/);
	// AOS ships 100px by default; this design settles rather than swoops.
	assert.match(layout, /translate3d\(0, 20px, 0\)/);
});

test('the signature moment is not converted to AOS', () => {
	const exploded = read('src/lib/components/ExplodedSentence.svelte');
	// It is scroll-linked and reversible, which AOS cannot express.
	assert.doesNotMatch(exploded, /data-aos/);
	assert.match(exploded, /requestAnimationFrame/);
});

test('no second animation library was added', () => {
	const pkg = JSON.parse(read('package.json'));
	const deps = { ...pkg.dependencies, ...pkg.devDependencies };
	for (const banned of ['gsap', 'framer-motion', 'animejs', 'lottie-web', 'motion']) {
		assert.ok(!deps[banned], `${banned} should not be installed`);
	}
	assert.ok(deps.aos, 'aos should be installed');
	assert.ok(deps.arctic, 'arctic should be installed');
});

/* -------------------------------------------------------------------------
 * Questionnaire programme
 * ---------------------------------------------------------------------- */

test('all fourteen days exist, each with five questions of mixed type', async () => {
	const { QUESTIONNAIRES } = await import('./helpers/load-questionnaires.mjs');
	assert.equal(QUESTIONNAIRES.length, 14);

	const seen = new Set();
	for (const day of QUESTIONNAIRES) {
		assert.equal(day.questions.length, 5, `day ${day.day} must have five questions`);
		assert.ok(!seen.has(day.day), `day ${day.day} duplicated`);
		seen.add(day.day);

		const types = new Set(day.questions.map((q) => q.type));
		assert.ok(types.has('rating'), `day ${day.day} needs a self-rating`);
		assert.ok(types.has('choice'), `day ${day.day} needs vocabulary recall`);
		assert.ok(types.has('text'), `day ${day.day} needs a written reflection`);

		// Question ids must be unique within a day or answers overwrite each other.
		const ids = day.questions.map((q) => q.id);
		assert.equal(new Set(ids).size, 5, `day ${day.day} has duplicate question ids`);

		for (const question of day.questions) {
			if (question.type === 'choice') {
				assert.ok(question.options.length >= 3, `day ${day.day}: too few options`);
				assert.ok(
					question.answer >= 0 && question.answer < question.options.length,
					`day ${day.day}: answer index out of range`
				);
			}
		}
	}
});

test('difficulty ramps across the three phases as specified', async () => {
	const { QUESTIONNAIRES } = await import('./helpers/load-questionnaires.mjs');
	const focusOf = (day) => QUESTIONNAIRES.find((item) => item.day === day).focus;
	for (const day of [1, 2, 3, 4]) assert.equal(focusOf(day), 'comfort');
	for (const day of [5, 6, 7, 8, 9]) assert.equal(focusOf(day), 'grammar');
	for (const day of [10, 11, 12, 13, 14]) assert.equal(focusOf(day), 'fluency');
});

test('one response per user per day is enforced by the database', () => {
	const migration = read('migrations/0003_questionnaires_google.sql');
	assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_user_day/);
	assert.match(migration, /questionnaire_responses\(user_id, day_number\)/);
	// Additive only: the live learner rows must not be rewritten.
	assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test('the unlock rule is re-checked on submit, not only on load', () => {
	const server = read('src/routes/dashboard/check-in/[day]/+page.server.ts');
	// A form left open overnight, or a replayed POST, must not slip through.
	assert.match(server, /journey\.currentDay !== day/);
	const actionIndex = server.indexOf('export const actions');
	assert.ok(
		server.indexOf('journey.currentDay !== day', actionIndex) > actionIndex,
		'the action must re-verify the unlock'
	);
});

test('the completion moment reuses the signature pattern and stays quiet', () => {
	const card = read('src/lib/components/JourneyCard.svelte');
	const grammar = read('src/lib/content/grammar.ts');
	assert.match(card, /ExplodedSentence/);
	assert.match(card, /COMPLETION/);
	assert.match(grammar, /You made it\./);
	// No confetti component or library — the word appears only in the comment
	// recording the instruction, so match markup rather than prose.
	assert.doesNotMatch(card, /<Confetti|from '[^']*confetti/i);
});

test('the journey strip pulses the current day and staggers in', () => {
	const card = read('src/lib/components/JourneyCard.svelte');
	assert.match(card, /animation: pulse/);
	assert.match(card, /data-aos="zoom-in"/);
	assert.match(card, /data-aos-delay=\{index \* 40\}/);
	assert.match(card, /prefers-reduced-motion/);
});

test('admin questionnaire views are behind the admin guard', () => {
	const page = read('src/routes/admin/questionnaires/+page.server.ts');
	const csv = read('src/routes/admin/questionnaires/export.csv/+server.ts');
	assert.match(page, /requireAdmin/);
	assert.match(csv, /requireAdmin/);
	// CSV must resist spreadsheet formula injection.
	assert.match(csv, /\^\[=\+\\-@/);
});

test('the landing page card grids actually carry AOS with a stagger', () => {
	const landing = read('src/lib/components/EnglishLanding.svelte');
	// Instructed surfaces: curriculum spectrum, placement, testimonials, pricing.
	assert.ok((landing.match(/data-aos="fade-up"/g) ?? []).length >= 4);
	assert.match(landing, /data-aos-delay=\{index \* 70\}/);
	assert.match(landing, /data-aos-delay=\{index \* 90\}/);
});
