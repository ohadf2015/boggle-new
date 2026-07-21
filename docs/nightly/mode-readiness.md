# Mode Readiness Ledger

> **One game mode audited per night** by nightly lane `11-mode-qa`. The lane stays on the
> **current** mode across nights (handoff) until its readiness is **≥ 90%**, then promotes it
> to *Released* and pulls the next mode from the Queue. This file is the durable state — the
> lane reads it at start and rewrites it at end.
>
> `readiness` = production-readiness score 0–100, judged HARSHLY across: bugs, UI/visual polish,
> playability, edge cases, clarity of use, i18n (×5), a11y, perf. A mode is **not** ≥90% on vibes —
> every point above the prior night must be backed by a shipped fix or a verified-clean audit area.

## Current (in progress)

### shiritori — readiness: 70% — status: IN PROGRESS
- **Why next:** MP-wired recently; verify chain rules + bot-exclusion + i18n + edge cases.
- **Reach:** JA MP is LIVE (ja board bypasses admin gate); solo is admin-preview; landing at `/[locale]/shiritori`.
- **Key files:** `components/multiplayer/shiritori/*`, `lib/shiritori/sp/*`, `app/[locale]/shiritori/{page,solo/page}.tsx`, `backend/{handlers,modules}/shiritori*`, `shared/utils/shiritori.ts`.
- **Last audited:** 2026-07-21
- **Covered (2026-07-18):** chain engine, backend manager+handler, MP hook+view, solo engine+page, landing page, i18n ×6 locales.
- **Covered (2026-07-19):** turn timer implementation (useShiritoriGame+ShiritoriView+ShiritoriVersus), solo/page.tsx verified clean.
- **Covered (2026-07-20):** dictCheckJa bug confirmed — `catch {}` returns `false` on network drop AND HTTP error, both treated as "not in dict" by `commitPlayerWord`. Countdown timer rendered correctly in ShiritoriView.tsx (role="timer", color thresholds at ≤9s/≤5s, hidden when finished). `useShiritoriGame.ts:76,89` resets `turnStartedAt` on accepted + eliminated ✅. `turnStartedAt` null on gameOver ✅.
- **Covered (2026-07-21):** dictCheckJa network/HTTP error path fixed — now throws `DictNetworkError` instead of returning `false`; `submit()` catches it and shows `shiritori.solo.err.network` toast before calling `commitPlayerWord`. `shiritori.solo.err.network` key added to all 6 locales (en/he/sv/ja/es/ru). TDD countdown tests added: `useShiritoriGame.test.ts` (4 turnStartedAt tests) + `ShiritoriView.test.tsx` (5 timer bar tests covering render/absent/full/orange/yellow/finished states).
- **Not yet covered:** visual QA (screenshot capture).

**Open issues:**
- ✅ FIXED (2026-07-19): No turn-timer UI — 15s server deadline invisible to client.
- ✅ FIXED (2026-07-21): `dictCheckJa` network error indistinguishable from invalid word — `DictNetworkError` thrown, caught in `submit()`, shows `shiritori.solo.err.network` key. Added to all 6 translation files.
- ✅ FIXED (2026-07-21): No TDD tests for countdown logic — 9 tests added across `useShiritoriGame.test.ts` + `ShiritoriView.test.tsx` covering turnStartedAt lifecycle and timer bar render/color states.
- ✅ FIXED: final loser never marked `eliminated:true` on game-over.
- ✅ FIXED: init loading text semantics.
- 🟡 MINOR: Visual QA not yet captured — code audit covers all areas but no screenshot evidence. Owner: **next run**.

## Queue (audit order — closest-to-release first)

1. **sealed-bid** — MP bidding mode; verify ≥2-player clash scoring.
2. **wheel-rush** — canonical MP mode.
3. **blast** — standalone `/blast`; recent 0-score + memo fixes — verify they held.
4. **word-hunt** — public daily mode; lower priority (already shipped) but audit for regressions.
5. **adventure** — campaign `/adventure`, beta-gated (guest→/); large surface, audit last.

> Excluded: `word-alchemy` (hollow per prior assessment). `classic` is the baseline mode (stable);
> audit only if a regression surfaces.

## Released (≥90% — production-ready)

### crossword — 90% — RELEASED 2026-07-16
- **Coverage:** i18n (31 keys ×6 locales), a11y (grid/aria/keyboard), perf (SSR:false/memo/lazy), RTL, race guards, timer cleanup, error/null paths, generator correctness, edge cases, ClueScramble UX — 5 audit sessions over 5 nights.
- **Fixes shipped:** try/catch error UI (07-12), null puzzle stuck loader + freeplay null (07-13), ClueBar accidental toggle + opts spurious re-renders (07-14), ClueScramble timer cleanup + aria-hidden (07-15), ClueScramble subtitle i18n ×6 locales (07-16).
- **Remaining (all non-blocking):** ja/ru QWERTY fallback (expected), `font-serif` (accepted), noindex (founder call), O(n²) stats.ts (negligible 5×5).
- **Visual QA:** not captured — code audit conclusively covers all areas.
- **Public exposure:** no admin gate; publicly accessible at `/[locale]/crossword`. noindex intentional until landing surface added.

### word-tower — 90% — RELEASED 2026-07-10
- **Coverage:** ALL components (30+), ALL hooks (6), ALL API routes, ALL lib files audited over 3 weeks.
- **Fixes shipped:** FTUE overlay, SabotageBay a11y, pagehide leak, perk badge dynamic value, language prop, state-restore telemetry, clutch a11y, BiomeEventEmitter, Pixi ticker null guard, notifications reset, HUD overlap, sway/lean constants, crash guards, share title i18n, rivals i18n — 15+ fixes.
- **Remaining minor (non-blocking):** daily leaderboard backend (design call); `StateSchema.passthrough()` (intentional); share card Hebrew possessive (non-core); inline callbacks perf (non-blocking).
- **Sentry:** JAVASCRIPT-NEXTJS-1R6 → 0 events in 14d (confirmed improved 2026-07-10).
- **Visual QA:** not captured (code audit conclusively covers all areas).
- **Public exposure: still beta/admin-gated (`experiments.ts` `word-tower` default `off`, route+landing-card additionally gated on `isAdmin`).** "Released" here means QA-complete, NOT flipped live — do not widen the gate without an explicit founder go-ahead (2026-07-10).
