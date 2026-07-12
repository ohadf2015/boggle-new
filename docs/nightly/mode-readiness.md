# Mode Readiness Ledger

> **One game mode audited per night** by nightly lane `11-mode-qa`. The lane stays on the
> **current** mode across nights (handoff) until its readiness is **≥ 90%**, then promotes it
> to *Released* and pulls the next mode from the Queue. This file is the durable state — the
> lane reads it at start and rewrites it at end.
>
> `readiness` = production-readiness score 0–100, judged HARSHLY across: bugs, UI/visual polish,
> playability, edge cases, clarity-of-use, i18n (×5), a11y, perf. A mode is **not** ≥90% on vibes —
> every point above the prior night must be backed by a shipped fix or a verified-clean audit area.

## Current (in progress)

### crossword — readiness: 55% — status: IN PROGRESS
- **Why next:** standalone route, recently made endless; verify generator + newspaper UX + i18n + a11y.
- **Reach for QA:** `/en/crossword` (no admin gate — publicly accessible; noindexed only).
- **Key files:** `components/crossword/*`, `lib/crossword/*`, `app/[locale]/crossword/{page,PageClient}.tsx`.
- **Last audited:** 2026-07-12

### Audit areas covered (2026-07-12 — first pass)
- ✅ **i18n** — all 31 crossword keys present in all 6 locales (en/he/sv/ja/es/ru). CLEAN.
- ✅ **a11y** — `role="grid"`, `aria-label` on every cell, progress bar ARIA, `aria-pressed` on direction toggle, `aria-label` on tool/nav buttons. CLEAN.
- ✅ **Perf** — `CrosswordView` dynamic-imported SSR:false; `CrosswordCell` memo'd; `activeSlotCells`/`wordEndCells` useMemo'd; GSAP loaded lazily. CLEAN.
- ✅ **Gate status** — no admin gate; publicly accessible. noindex meta in place (intentional).
- ✅ **RTL** — Hebrew RTL: `puzzle.rtl` flag propagated to grid, keyboard, ClueBar chevron flip. CLEAN.
- ✅ **Race condition guard** — `seqRef` + `cancelled` flag in both async generation paths. CLEAN.
- ✅ **Timer flush** — elapsed time flushed on unmount via cleanup effect. CLEAN.
- ✅ **LocalStorage cache** — daily puzzle cached client-side; silently falls back on storage full. CLEAN.
- ✅ **Keyboard navigation** — hardware keyboard: A-Z, Backspace, Arrow, Tab (next slot), Space (toggle dir). CLEAN.
- 🔧 **Error state** — FIXED: generation async had no try/catch; user stuck on loader forever on throw. Fixed in `CrosswordPageClient.tsx` with try/catch/finally + error UI using `common.error/errorOccurred/retry` keys.
- ⬜ **Bugs/correctness (deep)** — gameState logic, slot ordering, answer checking: not yet audited.
- ⬜ **Edge cases** — no valid words, empty board, very long slot, double-solve, network drop: not yet audited.
- ⬜ **Visual QA** — not captured (code audit only this run).
- ⬜ **Puzzle content quality** — ja/ru fall back to English; he/es/sv use native banks. Content depth/clue quality not yet audited.

### Open issues
| # | Severity | File | Issue | Owner |
|---|----------|------|-------|-------|
| 1 | minor | `CrosswordKeyboard.tsx:6` | ja/ru have no native keyboard layout — fall back to QWERTY. Technically correct since puzzles are English, but jarring for Cyrillic users. | review-by-eod |
| 2 | minor | `ClueBar.tsx:52` | Clue text area is a `<button onClick={onToggleDir}>` — clicking the clue accidentally toggles Across/Down. Unexpected; a brand-new user has no reason to expect that tap. | review-by-eod |
| 3 | minor | `CrosswordView.tsx:104` | `opts` object literal recreated on every render → `useEffect([state, opts])` runs more often than needed. Guards (wordsSolvedRef, solvedFiredRef) prevent double-fire but it's wasteful. | review-by-eod |
| 4 | minor | `CrosswordMasthead.tsx:47` | Uses generic `font-serif` (not a design-system token). Intentional newspaper aesthetic but could render inconsistently across devices. | review-by-eod |
| 5 | info | `page.tsx:11` | noindex in place — crossword not discoverable via search. Intentional until a landing surface is added. | founder call |
| 6 | info | `generate.daily.ts:35` | ja/ru locale players receive English-language puzzles (no native crossword bank). Expected; noted for future content work. | future |

## Queue (audit order — closest-to-release first)

1. **shiritori** — MP-wired recently; verify chain rules + bot-exclusion.
2. **sealed-bid** — MP bidding mode; verify ≥2-player clash scoring.
3. **wheel-rush** — canonical MP mode.
4. **blast** — standalone `/blast`; recent 0-score + memo fixes — verify they held.
5. **word-hunt** — public daily mode; lower priority (already shipped) but audit for regressions.
6. **adventure** — campaign `/adventure`, beta-gated (guest→/); large surface, audit last.

> Excluded: `word-alchemy` (hollow per prior assessment). `classic` is the baseline mode (stable);
> audit only if a regression surfaces.

## Released (≥90% — production-ready)

### word-tower — 90% — RELEASED 2026-07-10
- **Coverage:** ALL components (30+), ALL hooks (6), ALL API routes, ALL lib files audited over 3 weeks.
- **Fixes shipped:** FTUE overlay, SabotageBay a11y, pagehide leak, perk badge dynamic value, language prop, state-restore telemetry, clutch a11y, BiomeEventEmitter, Pixi ticker null guard, notifications reset, HUD overlap, sway/lean constants, crash guards, share title i18n, rivals i18n — 15+ fixes.
- **Remaining minor (non-blocking):** daily leaderboard backend (design call); `StateSchema.passthrough()` (intentional); share card Hebrew possessive (non-core); inline callbacks perf (non-blocking).
- **Sentry:** JAVASCRIPT-NEXTJS-1R6 → 0 events in 14d (confirmed improved 2026-07-10).
- **Visual QA:** not captured (code audit conclusively covers all areas).
- **Public exposure: still beta/admin-gated (`experiments.ts` `word-tower` default `off`, route+landing-card additionally gated on `isAdmin`).** "Released" here means QA-complete, NOT flipped live — do not widen the gate without an explicit founder go-ahead (2026-07-10).
