# Elmozza English — Design Plan

**Surface:** english.elmozza.com
**Date:** 2026-08-18
**Status:** plan → critique → build

---

## 0. Constraints discovered before designing

These are facts checked against the running system, not assumptions.

| Fact | Evidence | Consequence for design |
|---|---|---|
| The site is **live with real users** | Remote D1 `elmozza-db`: 2 rows in `users`, 3 rows in `lesson_progress` | No destructive migration. New tables only. Seed writes to **local** D1 by default. |
| Auth already exists and works | `src/lib/server/auth.ts`: PBKDF2-SHA256 (100k), `sessions` table, httpOnly cookie, login rate-limit table | Rebuild the *shell*, not the session core. |
| **Lucia v3 is deprecated** | lucia-auth.com/lucia-v3/migrate — v3 EOL March 2025; upstream now tells users to copy the session code into their own project | See §6. |
| No web fonts installed, no chromium | `ls node_modules`, `which chromium` → empty | Type system must use a system stack. Lighthouse cannot be measured locally; see §8. |
| Cloudflare Pages project = `elmozza`, D1 binding `DB` | `wrangler.toml` | Deploy path unchanged. |

---

## 1. Palette — commit to one accent

The brief allows deep ultramarine *or* persimmon. **Ultramarine wins.**

Reason: the subject is patient, quiet study — "she has been learning quietly." Persimmon is an *extroverted* accent; it argues with the sentence. Ultramarine is ink. On warm paper it reads as a fountain pen on good stock: studious, editorial, expensive. Persimmon would have been the safer crowd-pleaser and the more generic choice.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FBFAF7` | page base |
| `--paper-raised` | `#FFFFFF` | cards, lifted surfaces |
| `--ink` | `#1C1B18` | body + headline text |
| `--ink-muted` | `#6B6659` | secondary text, captions |
| `--rule` | `#E3E0D8` | hairlines — the structural device |
| `--accent` | `#1B36C4` | THE accent. Links, focus, active state, leader lines |
| `--accent-deep` | `#132894` | accent text on tint (contrast safety) |
| `--accent-tint` | `#EDF0FE` | accent surfaces, quiz correct-state wash |
| `--warn-tint` | `#FBEDE7` | quiz incorrect-state wash only |

Rules: no gradient as decoration. No glassmorphism. No dark section anywhere. The only gradient permitted is the A1→C1 spectrum, where brightness *is* the information.

Contrast check (target AA): ink on paper ≈ 15.9:1. ink-muted on paper ≈ 5.3:1. accent on paper ≈ 8.1:1. White on accent ≈ 8.1:1.

---

## 2. Type — system stack, deliberately

No web fonts. Not a compromise — a decision. Zero font requests means no FOUT, no render-blocking, no layout shift, and it protects the Lighthouse target. The stack is chosen so the *shapes* are right on the devices that matter.

| Role | Stack | Why |
|---|---|---|
| Display | `'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif` | High-contrast old-style serif present on macOS/iOS/Windows. Georgia is the floor, not the target. |
| Body | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Humanist, neutral, already hinted for the OS. |
| Utility / labels | `ui-monospace, 'SF Mono', 'Cascadia Mono', 'Roboto Mono', Menlo, Consolas, monospace` | Grammar labels and leader-line annotations only. Uppercase, tracked +0.14em, 11–12px. |

Type scale — base 17px, ratio 1.25 mobile / 1.333 desktop:

```
--step--1  0.833rem   captions
--step-0   1rem       body (17px)
--step-1   1.333rem   lead
--step-2   1.777rem   section heading
--step-3   2.369rem   page heading
--step-4   3.157rem   hero (mobile clamp floor)
--step-5   4.209rem   hero (desktop)
```

Measure capped at 62ch for prose, 15ch for hero headline.

---

## 3. Layout — hairlines encode structure

An editorial grid, not a card soup.

```
┌─────────────────────────────────────────────┐
│  Elmozza English            Demo  Sign in ▸ │  ← 1px rule under header
├─────────────────────────────────────────────┤
│                                             │
│   THE SIGNATURE MOMENT (sticky, 300vh)      │
│   "She has been learning quietly,           │
│    and now she speaks."                     │
│         ↓ scroll: fragments drift apart     │
│         ↓ hairline leaders + mono labels    │
│         ↓ scroll back: reassembles          │
│                                             │
├──────────────── hairline ───────────────────┤
│   CURRICULUM — spectrum of light            │
│   A1 ▁▂▃▄▅▆▇ C1   (brightens with level)   │
├──────────────── hairline ───────────────────┤
│   PLACEMENT TEASER — 3 questions inline     │
├──────────────── hairline ───────────────────┤
│   TESTIMONIALS (quiet, 2-up, no photos)     │
├──────────────── hairline ───────────────────┤
│   PRICING (3 tiers, one recommended)        │
├──────────────── hairline ───────────────────┤
│   CTA "Start free"                          │
├─────────────────────────────────────────────┤
│   english.elmozza.com                       │
└─────────────────────────────────────────────┘
```

Whitespace budget: section padding `clamp(5rem, 12vh, 9rem)` block. Nothing fills its container edge-to-edge except rules.

---

## 4. The signature moment — engineering

**What it is:** the sentence *is real text in normal flow* — selectable, indexable, screen-readable. It is never an image and never canvas.

**Decomposition** (8 fragments, 8 depth layers):

| Fragment | Label (mono) | Layer |
|---|---|---|
| She | SUBJECT · PRONOUN | 1 |
| has | AUX 1 · PRESENT | 3 |
| been | AUX 2 · PERFECT | 4 |
| learning | MAIN VERB · ‑ING | 5 |
| quietly | ADVERB · MANNER | 2 |
| and | CONJUNCTION · COORD | 6 |
| now she | SUBJECT · CLAUSE 2 | 7 |
| speaks | MAIN VERB · SIMPLE PRESENT | 8 |

**Mechanism:**

1. A `position: sticky` stage inside a `300vh` scroll track.
2. One scroll listener, rAF-throttled, writes a single custom property `--p` (0→1) on the stage. No per-frame layout reads.
3. Each fragment carries static per-fragment offsets `--dx --dy --dz` in CSS. Its transform is `translate3d(calc(var(--dx) * var(--p)), calc(var(--dy) * var(--p)), 0)` — the browser interpolates; JS only moves one number.
4. `p` is passed through a smoothstep (`p*p*(3-2p)`) so the ends are damped. Easing is ease-out with **no overshoot** — a bounce would make it a toy.
5. Leader lines are one SVG overlay. Endpoints come from `getBoundingClientRect()` measured **once per resize** via `ResizeObserver`, not per frame, then scaled by `--p`.
6. Labels fade in staggered on `--p` between 0.35 and 0.8.
7. Scrolling up runs the same math backwards — reassembly is free.

**Reduced motion:** `prefers-reduced-motion: reduce` → no listener attached, stage renders statically at `p = 1` (the fully labeled diagram) and the scroll track collapses to one viewport. Reduced users get the *information*, not a frozen blank.

**Reuse as micro-interaction:** the same component in `mode="hover"` — any example sentence in a lesson opens into its parts on hover, tap, or keyboard focus, at ~40% of the displacement. This is what makes it a design *system* rather than a stunt.

---

## 5. Pages

| Route | Access | Notes |
|---|---|---|
| `/` | public | landing, signature moment |
| `/demo` | public, no login | listening snippet, tap-to-reveal vocab, exploded grammar, 5-question quiz |
| `/register`, `/login` | public | email + password, verification stubbed |
| `/dashboard` | student | magazine spread: profile, level, streak, 4 skill rings, resume card, schedule |
| `/admin` | admin/owner | registrants table, search, filter, CSV export, stats row |

---

## 6. Auth — the honest deviation

The brief asks for **Lucia Auth v3**. Lucia v3 was deprecated in March 2025; its own migration guide now instructs projects to own the session code directly.

`src/lib/server/auth.ts` already implements exactly that recommended pattern: opaque session id → `sessions` table → httpOnly `SameSite=Lax` cookie, PBKDF2-SHA256 at 100k iterations, constant-time comparison, expiry sweep, login throttling.

**Decision: keep it, and say so.** Installing a deprecated library on top of working session code on a live site would add risk and remove none. Roles requested were `student`/`admin`; the live schema uses `learner`/`admin` plus `owner`, `editor`, `reviewer`. Mapping `student → learner` in UI copy avoids a destructive migration on production rows.

---

## 7. Data

New table only — nothing existing is altered:

```
registrations
  id, full_name, email, level, placement_score,
  payment_status ∈ (pending|paid|refunded|waived),
  source, user_id → users.id (nullable), created_at
```

`drizzle-orm` supplies the typed schema for this new table (`src/lib/server/schema.ts`). Existing hot paths keep their proven prepared SQL — rewriting live queries into a new ORM buys types and costs reliability.

Seed: 10 registrants + 1 admin, idempotent (`INSERT ... WHERE NOT EXISTS`), **local D1 by default**.

---

## 8. Quality bar and what can actually be proven

| Requirement | Verification |
|---|---|
| Mobile-first responsive | build + live fetch |
| Visible keyboard focus everywhere | `:focus-visible` ring token, audited in CSS |
| Reduced motion | static diagram path present in component |
| Lighthouse ≥ 95 | **Cannot be measured here** — no Chrome binary in this WSL environment. Design decisions that protect it (zero web fonts, no WebGL, no hero video, single rAF listener, SVG only) are listed above. This will be reported as unmeasured, not as passed. |

---

## 9. Critique of the plan above — one honest pass

Reviewing the plan as if someone else wrote it:

**C1. The spectrum was decorative, not informational.** "A1→C1 that brightens with level" is a gradient wearing a lab coat — exactly the gradient-as-decoration the brief forbids. *Revision:* each level band shows real content (band label, can-do statement, lesson count). Brightness carries the axis, but the band is a readable table row. If the color were removed the section still informs.

**C2. Testimonials were on autopilot.** Cards with photos and five stars is the template answer. *Revision:* no avatars, no stars. Set as pulled quotes in the display serif with a hairline above and a mono attribution — an editorial pull quote. Two only. Three would dilute.

**C3. The signature moment risked being decoration too.** Fragments drifting prettily is a screensaver. *Revision:* the labels must be *correct grammar teaching* — "AUX 2 · PERFECT" on *been* is the actual reason the tense is what it is. Someone who scrolls learns why "has been learning" is present perfect continuous. The stunt has to teach or it does not earn the hero.

**C4. Pricing "3 tiers with one recommended" is the most generic thing in the plan.** *Revision:* keep three, but drop the popularity badge and the checkmark lists. Each tier gets one sentence describing who it is *for*, and the tiers are separated by hairlines in a single row — a rate card, not a pricing wall.

**C5. The dashboard "magazine spread" was an adjective, not a specification.** *Revision:* concrete rules — one dominant element (the resume card at ~2/3 width), a running head with the student name in display serif, skill rings set as a four-column measure with mono numerals, and the schedule as a hairline-ruled list. No boxes inside boxes.

**C6. Unmeasurable claims.** The original draft implied Lighthouse would be verified. It cannot be, here. Corrected in §8 — stated as unmeasured.

Items C1–C6 are folded into the build.

---

## 10. What the build actually changed about this plan

Written after the site was built and driven in a real browser.

**§8 was wrong about Lighthouse.** The plan claimed it could not be measured because no Chrome binary was present. That was a fact about the machine at the time, not a permanent limit — installing Playwright's chromium and pointing Lighthouse's CLI at it took one command. Measured on the production build:

| Route | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 |
| `/demo` | 100 | 100 | 100 | 100 |

The lesson: "cannot be verified" deserves one real attempt before it is written down.

**The signature moment's geometry was rebuilt.** The plan specified hand-tuned per-fragment `--dx/--dy` offsets. In a browser those collided on desktop and pushed 135px off the right edge of a 390px phone. Replaced with measured layout: each fragment is assigned an exclusive row derived from the stage height, and its displacement is computed as the delta from its real position. Rows cannot overlap at any width, by construction rather than by tuning.

**Three real bugs only a browser could show:**

1. *Wrong coordinate space.* Targets were read from `offsetLeft/offsetTop`, which are relative to the sentence paragraph, not the stage. Every fragment landed away from its own label. Fixed by walking the `offsetParent` chain.
2. *Dead tap on touch.* `pointerenter` fires immediately before `click` on touch, so hover opened the panel and the click closed it again — one tap did nothing.
3. *Click cancelling itself.* `focus` fires before `click`, so a mouse click opened the panel on focus and then toggled it shut. Fixed by splitting one flag into three independent inputs (hover / keyboard focus / pinned) and gating focus on `:focus-visible`.

All three are now locked in `tests/browser/signature-moment.test.mjs`, which drives a real browser rather than reading source.

**Verification totals:** 56 source tests, 6 browser tests, Lighthouse 100×4 on both public routes, and an end-to-end pass over register → login → dashboard → admin → CSV, including a student receiving 403 on every admin route.

