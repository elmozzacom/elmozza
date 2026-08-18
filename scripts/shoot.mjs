import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788';
const OUT = '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/** Desktop pass. */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/01-hero-assembled.png` });

// Drive the signature moment. The sticky stage sits inside a 300vh track, so
// the diagram is fully exploded at roughly 55-65% of the track — past that the
// stage scrolls away and the shot catches the next section instead.
const track = await page.evaluate(() => document.querySelector('.track')?.clientHeight ?? 0);
const vh = 900;
const span = track - vh;
for (const [name, fraction] of [
	['02-hero-mid', 0.35],
	['03-hero-exploded', 0.95]
]) {
	await page.evaluate((y) => window.scrollTo(0, y), Math.round(span * fraction));
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${OUT}/${name}.png` });
}

// Read the live value of --p to prove the mechanism actually drives.
const p = await page.evaluate(() => {
	const el = document.querySelector('.exploded-stage');
	return el ? getComputedStyle(el).getPropertyValue('--p').trim() : 'none';
});
console.log('--p at 92% of track:', p);

const shifted = await page.evaluate(() => {
	const el = document.querySelector('.frag');
	return el ? getComputedStyle(el).transform : 'none';
});
console.log('first fragment transform:', shifted);

// Sections further down.
await page.evaluate(() => document.querySelector('#curriculum')?.scrollIntoView());
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}/04-curriculum.png` });

await page.evaluate(() => document.querySelector('#placement')?.scrollIntoView());
await page.waitForTimeout(300);
await page.click('#placement .option');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/05-placement.png` });

await page.evaluate(() => document.querySelector('#pricing')?.scrollIntoView());
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}/06-pricing.png` });

// Demo lesson, with the micro-interaction opened.
await page.goto(`${BASE}/demo`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/07-demo-top.png` });
await page.evaluate(() => document.querySelector('.hover-wrap')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(500);
await page.click('.opener');
// The hover diagram measures on open, then eases for 620ms.
await page.waitForTimeout(1400);
const openP = await page.evaluate(() => {
	const el = document.querySelector('.hover-wrap .exploded-stage');
	return el ? getComputedStyle(el).getPropertyValue('--p').trim() : 'none';
});
console.log('demo micro-interaction --p (should be 1):', openP);
await page.screenshot({ path: `${OUT}/08-demo-grammar-open.png` });

// Auth.
await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/09-register.png` });

/** Signed-in pass. */
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[name="identifier"]', 'admin@english.elmozza.com');
await page.fill('input[name="password"]', 'ElmozzaAdmin2026!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/10-dashboard.png` });

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/11-admin.png`, fullPage: true });

/** Mobile pass. */
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mp = await mobile.newPage();
await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await mp.screenshot({ path: `${OUT}/12-mobile-hero.png` });
const mtrack = await mp.evaluate(() => document.querySelector('.track')?.clientHeight ?? 0);
await mp.evaluate((y) => window.scrollTo(0, y), Math.round((mtrack - 844) * 0.95));
await mp.waitForTimeout(500);
await mp.screenshot({ path: `${OUT}/13-mobile-exploded.png` });

// Horizontal overflow check on mobile — a real failure mode, worth measuring.
const overflow = await mp.evaluate(
	() => document.documentElement.scrollWidth - document.documentElement.clientWidth
);
console.log('mobile horizontal overflow (px):', overflow);

/** Reduced motion pass: must show the finished labeled diagram, not a blank. */
const reduced = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	reducedMotion: 'reduce'
});
const rp = await reduced.newPage();
await rp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await rp.waitForTimeout(500);
await rp.screenshot({ path: `${OUT}/14-reduced-motion.png` });
const rp_p = await rp.evaluate(() => {
	const el = document.querySelector('.exploded-stage');
	return el ? getComputedStyle(el).getPropertyValue('--p').trim() : 'none';
});
console.log('reduced-motion --p (should be 1):', rp_p);

await browser.close();
console.log('\nScreenshots in', OUT);
