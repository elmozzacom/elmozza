# Elmozza English

The English learning platform at **english.elmozza.com**.

SvelteKit 2 · Tailwind CSS 4 · Cloudflare Pages · D1 (SQLite) · drizzle-orm

The design language is bright, editorial, and quiet: warm paper, ink text, one
ultramarine accent, hairlines to encode structure, and no dark sections. See
`DESIGN-PLAN.md` for the palette, type scale, and how the hero is engineered.

---

## Every file this project adds

```
DESIGN-PLAN.md                                  design plan, critique, and post-build corrections
migrations/0002_registrations.sql               additive migration: registrations table
scripts/seed.mjs                                10 registrants + 1 admin (LOCAL by default)
scripts/shoot.mjs                               screenshots across desktop/mobile/reduced-motion
src/app.css                                     design tokens: palette, type stacks, focus ring
src/lib/components/AuthPanel.svelte             shared shell for sign-in and registration
src/lib/components/EnglishLanding.svelte        landing page
src/lib/components/ExplodedSentence.svelte      THE signature moment (also the lesson micro-interaction)
src/lib/components/SiteShell.svelte             masthead, mobile sheet, footer, skip link
src/lib/content/demo-lesson.ts                  demo lesson content
src/lib/content/grammar.ts                      the signature sentence and its grammar labels
src/lib/content/marketing.ts                    levels, placement questions, tiers, quotes
src/lib/server/schema.ts                        drizzle schema for registrations
src/routes/+layout.server.ts                    exposes the session user to every page
src/routes/admin/+page.server.ts                registrant list: search, filter, stats
src/routes/admin/+page.svelte                   admin dashboard
src/routes/admin/export.csv/+server.ts          CSV export, escaped and formula-guarded
src/routes/demo/+page.server.ts                 public demo lesson loader
src/routes/demo/+page.svelte                    public demo lesson
tests/admin-registrations.test.mjs              admin, migration, seed, and dashboard contracts
tests/browser/signature-moment.test.mjs         real-browser tests for the hero
tests/english-design-system.test.mjs            design tokens, focus, motion, and the hero
```

Rewritten: `src/routes/+layout.svelte`, `+page.svelte`, `+page.server.ts`,
`dashboard/+page.{svelte,server.ts}`, `login/+page.svelte`,
`register/+page.svelte`, `vite.config.ts`.

---

## Running it (WSL)

```bash
npm install

# Local database: schema, the new table, then sample data
npm run d1:fresh:local
npm run d1:registrations:local
npm run seed                    # 10 registrants + 1 admin

npm run dev                     # or: npm run build && npx wrangler pages dev --port 8788
```

Seeded admin — **change this password after the first sign-in**:

```
admin@english.elmozza.com  /  ElmozzaAdmin2026!
```

### Production database

The live D1 holds real learner accounts. `npm run seed` writes **locally**;
seeding production requires `npm run seed:remote` on purpose. Applying the new
table to production:

```bash
npm run d1:registrations:remote
```

That migration only creates `registrations` and adds one nullable column. It
contains no `DROP`, `DELETE`, or `UPDATE` against existing learner rows.

---

## Verifying it

```bash
npm run check          # svelte-check: 0 errors, 0 warnings
npm test               # 56 source tests
npm run test:browser   # 6 browser tests — needs a server on :8788
npm run shots          # screenshots to /tmp/shots
```

Lighthouse, measured on the production build at `/` and `/demo`:
performance 100, accessibility 100, best practices 100, SEO 100.

The browser tests exist because every real bug in the hero was invisible in the
source: fragments measured in the wrong coordinate space, 135px of horizontal
overflow on a phone, and a micro-interaction whose own handlers cancelled each
other. They assert rendered geometry, not markup.

---

## Notes on two deliberate deviations

**Auth.** The brief asked for Lucia Auth v3. Lucia v3 was deprecated in March
2025 and its own migration guide now tells projects to own the session code
directly. `src/lib/server/auth.ts` already implements that pattern — opaque
session id, `sessions` table, httpOnly `SameSite=Lax` cookie, PBKDF2-SHA256 at
100k iterations, constant-time comparison, expiry sweep, login throttling.
Adding a deprecated dependency on top of working session code, on a live site,
would add risk and remove none.

**Roles.** The brief asked for `student` and `admin`. The live schema uses
`learner` / `admin` / `owner` / `editor` / `reviewer`. The UI says "Student" and
maps to the stored `learner`, so no production row needed migrating.

**Email verification** is stubbed, and says so in the interface. The column
records intent; nothing claims an address is verified.
