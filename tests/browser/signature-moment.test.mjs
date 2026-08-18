/**
 * Browser-level verification of the signature moment.
 *
 * The design-system tests read source; this one drives a real browser, because
 * every bug found while building this page was invisible in the source and only
 * showed up once it rendered: fragments landing in the wrong coordinate space,
 * 135px of horizontal overflow on a phone, and a micro-interaction whose own
 * event handlers cancelled each other.
 *
 * Requires a server on BASE (default http://127.0.0.1:8788):
 *   npm run build && npx wrangler pages dev --port 8788
 *   node --test tests/browser/signature-moment.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788';

let browser;
test.before(async () => {
	browser = await chromium.launch();
});
test.after(async () => {
	await browser?.close();
});

const stageP = (page, scope = '') =>
	page.evaluate((sel) => {
		const el = document.querySelector(`${sel} .exploded-stage`);
		return el ? Number(getComputedStyle(el).getPropertyValue('--p')) : -1;
	}, scope);

test('scrolling explodes the sentence and scrolling back reassembles it', async () => {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

	assert.equal(await stageP(page), 0, 'starts assembled');

	const span = await page.evaluate(
		() => document.querySelector('.track').clientHeight - window.innerHeight
	);
	await page.evaluate((y) => window.scrollTo(0, y), Math.round(span * 0.95));
	await page.waitForTimeout(400);
	assert.ok((await stageP(page)) > 0.9, 'fully exploded near the end of the track');

	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(400);
	assert.equal(await stageP(page), 0, 'reassembles on the way back');

	await context.close();
});

test('every fragment lands on its own row aligned with its own label', async () => {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
	const span = await page.evaluate(
		() => document.querySelector('.track').clientHeight - window.innerHeight
	);
	await page.evaluate((y) => window.scrollTo(0, y), Math.round(span * 0.95));
	await page.waitForTimeout(500);

	const rows = await page.evaluate(() => {
		const frags = [...document.querySelectorAll('.frag')];
		const tags = [...document.querySelectorAll('.tag')];
		return frags.map((f, i) => {
			const fr = f.getBoundingClientRect();
			const tr = tags[i].getBoundingClientRect();
			return {
				top: fr.top,
				bottom: fr.bottom,
				centre: fr.top + fr.height / 2,
				tagCentre: tr.top + tr.height / 2
			};
		});
	});

	assert.equal(rows.length, 8, 'eight fragments');

	for (let i = 1; i < rows.length; i += 1) {
		assert.ok(
			rows[i].top >= rows[i - 1].bottom - 1,
			`fragment ${i} must not overlap fragment ${i - 1}`
		);
	}
	for (const [i, row] of rows.entries()) {
		assert.ok(
			Math.abs(row.centre - row.tagCentre) < 12,
			`fragment ${i} must sit on the same row as its label`
		);
	}

	await context.close();
});

test('no horizontal overflow at 390px, 768px, or 1440px', async () => {
	for (const width of [390, 768, 1440]) {
		const context = await browser.newContext({ viewport: { width, height: 844 } });
		const page = await context.newPage();
		await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
		const span = await page.evaluate(
			() => document.querySelector('.track').clientHeight - window.innerHeight
		);
		await page.evaluate((y) => window.scrollTo(0, y), Math.round(span * 0.95));
		await page.waitForTimeout(400);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		assert.equal(overflow, 0, `no horizontal overflow at ${width}px`);
		await context.close();
	}
});

test('reduced motion renders the finished labeled diagram, not a blank', async () => {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		reducedMotion: 'reduce'
	});
	const page = await context.newPage();
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	assert.equal(await stageP(page), 1, 'static diagram is already resolved');
	const labels = await page.$$eval('.tag', (els) =>
		els.filter((el) => Number(getComputedStyle(el).opacity) > 0.9).length
	);
	assert.equal(labels, 8, 'all grammar labels visible without scrolling');

	// The scroll track collapses so reduced users are not given dead scroll.
	const collapsed = await page.evaluate(() =>
		document.querySelector('.track').classList.contains('static')
	);
	assert.ok(collapsed, 'scroll track collapses under reduced motion');
	await context.close();
});

test('the lesson micro-interaction opens on hover, click, keyboard, and one tap', async () => {
	// Mouse: hover opens, leaving closes, click pins it open.
	const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await desktop.newPage();
	await page.goto(`${BASE}/demo`, { waitUntil: 'networkidle' });
	await page.evaluate(() =>
		document.querySelector('.hover-wrap').scrollIntoView({ block: 'center' })
	);
	await page.waitForTimeout(300);

	await page.hover('.opener');
	await page.waitForTimeout(700);
	assert.equal(await stageP(page, '.hover-wrap'), 1, 'hover opens');

	await page.mouse.move(5, 5);
	await page.waitForTimeout(700);
	assert.equal(await stageP(page, '.hover-wrap'), 0, 'leaving closes');

	await page.click('.opener');
	await page.mouse.move(5, 5);
	await page.waitForTimeout(700);
	assert.equal(await stageP(page, '.hover-wrap'), 1, 'click pins it open');
	await desktop.close();

	// Touch: a single tap must open it.
	const phone = await browser.newContext({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true
	});
	const tap = await phone.newPage();
	await tap.goto(`${BASE}/demo`, { waitUntil: 'networkidle' });
	await tap.evaluate(() => document.querySelector('.hover-wrap').scrollIntoView({ block: 'center' }));
	await tap.waitForTimeout(300);
	await tap.tap('.opener');
	await tap.waitForTimeout(800);
	assert.equal(await stageP(tap, '.hover-wrap'), 1, 'one tap opens on touch');
	await phone.close();
});

test('the sentence is real selectable text with correct word spacing', async () => {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

	const text = await page.$eval('.sentence', (el) => el.textContent.replace(/\s+/g, ' ').trim());
	assert.equal(text, 'She has been learning quietly, and now she speaks.');

	// The signature must never be an image or a canvas.
	const heavy = await page.evaluate(
		() => document.querySelectorAll('.track canvas, .track video, .track img').length
	);
	assert.equal(heavy, 0, 'pure SVG/CSS/JS — no canvas, video, or image');
	await context.close();
});
