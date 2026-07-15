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

### crossword — readiness: 88% — status: IN PROGRESS
- **Why next:** standalone route, recently made endless; verify generator + newspaper UX + i18n + a11y.
- **Reach for QA:** `/en/crossword` (no admin gate — publicly accessible; noindexed only).
- **Key files:** `components/crossword/*`, `lib/crossword/*`, `app/[locale]/crossword/{page,PageClient}.tsx`.
- **Last audited:** 2026-07-15

### Audit areas covered

**2026-07-12 — first pass**
- ✅ **i18n** — all 31 crossword keys present in all 6 locales (en/he/sv/ja/es/ru). CLEAN.
- ✅ **a11y** — `role="grid"`, `aria-label` on every cell, progress bar ARIA, `aria-pressed` on direction toggle, `aria-label` on tool/nav buttons. CLEAN.
- ✅ **Perf** — `CrosswordView` dynamic-imported SSR:false; `CrosswordCell` memo'd; `activeSlotCells`/`wordEndCells` useMemo'd; GSAP loaded lazily. CLEAN.
- ✅ **Gate status** — no admin gate; publicly accessible. noindex meta in place (intentional).
- ✅ **RTL** — Hebrew RTL: `puzzle.rtl` flag propagated to grid, keyboard, ClueBar chevron flip. CLEAN.
- ✅ **Race condition guard** — `seqRef` + `cancelled` flag in both async generation paths. CLEAN.
- ✅ **Timer flush** — elapsed time flushed on unmount via cleanup effect. CLEAN.
- ✅ **LocalStorage cache** — daily puzzle cached client-side; silently falls back on storage full. CLEAN.
- ✅ **Keyboard navigation** — hardware keyboard: A-Z, Backspace, Arrow, Tab (next slot), Space (toggle dir). CLEAN.
- 🔧 **Error state (partial)** — FIXED: generation async had no try/catch; user stuck on loader forever on throw. Fixed in `CrosswordPageClient.tsx` with try/catch/finally + error UI using `common.error/errorOccurred/retry` keys.

**2026-07-14 — third pass**
- 🔧 **ClueBar accidental toggle** — FIXED: clue text area was `<button onClick={onToggleDir}>` — tapping to read fired direction flip. Changed to `<div>`. Added failing-first test to pin behavior.
- 🔧 **useCrosswordGame opts spurious effect runs** — FIXED: inline `opts` object in CrosswordView.tsx:63 caused `[state, opts]`/`[state.status, opts, puzzle]` deps to fire extra times each render. Added `onSolvedRef`/`onWordSolvedRef` stable refs; removed `opts` from both deps arrays.
- ✅ **Open issue review** — remaining 5 items all non-blocking: QWERTY fallback (expected), font-serif (intentional), noindex (founder call), ja/ru English puzzles (expected), O(n²) stats.ts (negligible at 5×5).

**2026-07-15 — fourth pass**
- 🔧 **ClueScramble 380ms timer cleanup** — FIXED: inline `setTimeout(() => onResultRef.current(true), 380)` in `handleChange` had no cleanup. Refactored to `useEffect` watching `success` state with `return () => clearTimeout(id)` — prevents stale `onResult(true)` call if component unmounts during the success delay.
- 🔧 **ClueScramble scrambled-tiles aria-hidden** — FIXED: the display-only letter tiles div had no `aria-hidden`; screen readers would narrate scrambled chars (confusing). Added `aria-hidden="true"` on the tiles container. Input already has `aria-label`.
- ✅ **ClueScramble i18n** — all 3 keys (`title`/`skip`/`streakAria`) verified in all 6 locales (en/he/sv/ja/es/ru). CLEAN.
- ✅ **ClueScramble integration** — `handleScrambleResult` wiring, `pendingSlot` ref safety, `scrambleAttempted` Set (once-per-slot guard) — CLEAN.
- ✅ **TDD** — added failing test `does NOT call onResult(true) if unmounted before the 380ms success delay` (RED before fix, GREEN after).

**2026-07-13 — second pass**
- ✅ **Bugs/correctness (deep)** — `gameState.ts` pure state machine audited: cursor advance, backspace, reveal, check, warmth hint — all correct. `answer.ts`: locale-aware normalization, Hebrew sofit, Spanish accent fold — clean. `progress.ts`: SSR-safe, quota-tolerant — clean.
- ✅ **Generator correctness** — `generate.core.ts`: CSP backtracking filler with MRV heuristic, de-dup set, bounded steps — no infinite loop. `generate.daily.ts`: deterministic seeding, fallback chain. `generate.runtime.ts`: 60-retry × 5000-step cap, prefer-set difficulty lever — clean.
- ✅ **CrosswordView.tsx** — double-solve guarded (`solvedFiredRef`), all cleanup correct, `crosswordScore` always returns number, solved state renders buttons, no hard-coded strings (decorative emoji/separators only).
- ✅ **Edge cases** — null generation caught + shows error UI (fixed tonight); backtracking cap prevents hangs; pool-too-thin guard (`fillPool.length < 50`); all-blocks / no-templates returns null immediately.
- 🔧 **Null puzzle stuck loader** — FIXED: `generateDailyPuzzle` returning null (all retries + no static fallback) fell through to `setPuzzle(null)` without setting `genError` → user stuck on loader with no retry. Added `if (!p) throw new Error(...)` to trigger catch → error UI. Also: freeplay null now sets `genError` so retry button re-appears.

### Open issues
| # | Severity | File | Issue | Owner |
|---|----------|------|-------|-------|
| 1 | minor | `CrosswordKeyboard.tsx:6` | ja/ru fall back to QWERTY — expected since puzzles are English. | expected |
| 2 | minor | `CrosswordMasthead.tsx:47` | `font-serif` is generic browser default, not a design-system token. Intentional newspaper aesthetic — accepted design decision. | accepted |
| 3 | info | `page.tsx:11` | noindex in place — intentional until a landing surface is added. | founder call |
| 4 | info | `generate.daily.ts:35` | ja/ru locale players receive English-language puzzles (no native crossword bank). Expected. | future |
| 5 | negligible | `stats.ts:43` | O(n²) `puzzle.cells.find(...)` inside per-slot loop. Trivial at 5×5 scale. | future |
| 6 | minor | `CrosswordView.tsx:350` | No UX explanation of what ClueScramble overlay is or what solving/skipping does — new players may be confused. Design call. | review-by-eod |
| 7 | negligible | `ClueScramble.test.tsx:60` | Countdown test simplified from per-tick `act()` loop to single sync `advanceTimersByTime`. Works in React 18 auto-batching but less robust. | future |

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
