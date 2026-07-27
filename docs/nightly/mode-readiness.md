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

### sealed-bid — readiness: 70% — status: IN PROGRESS
- **Why next:** MP bidding mode; verify ≥2-player clash scoring.
- **Key files:** components/multiplayer/sealedBid/*, backend/handlers/sealedBidHandler.ts, backend/modules/sealedBidManager.ts, app/[locale]/sealed-bid/*.
- **Last audited:** 2026-07-27
- **Covered (2026-07-24):** backend wiring (gameStartHandler, index.ts), sealedBidManager pure state machine, sealedBidHandler (bid validation, deadline timers, finalize), useSealedBidGame hook, SealedBidVersus MP UI, solo page.tsx, sbMpEngine resolver, i18n ×6 locales (both sealedBid + sealedBidMp namespaces), a11y review, perf review, gate/visibility, tests (5 files, 572 lines), host+player view wiring, lock-gate, rackPool.
- **Covered (2026-07-26):** countdown timer render (roundDeadline→secsLeft hook wired + UI badge in standings sidebar), sealedBidMp.autoResolve i18n ×6 locales, neo-orange/red urgency color scheme.
- **Covered (2026-07-27):** topScorer tie-breaking fixed (alphabetical), picks-reset-in-render validated as React-blessed pattern (not a bug), TDD tests added: countdown timer badge (×2 tests: renders + urgency color), tie-breaking integration test.

**Open issues:**
- ~~**MAJOR** No countdown timer in `SealedBidVersus` MP view~~ — **FIXED 2026-07-26**: `secsLeft` state + `useEffect` interval wired from `game.roundDeadline`; badge renders orange→red (≤5s) in standings sidebar with `role="timer"` a11y. `SealedBidVersus.tsx`.
- ~~**MINOR** `topScorer` in `sealedBidHandler.ts:157` resolves ties by JS object insertion order~~ — **FIXED 2026-07-27**: alphabetical tiebreak added; TDD integration test added.
- ~~**MINOR** `SealedBidVersus.tsx:44-49` — picks reset during render body~~ — **VALIDATED as correct**: React 18 explicitly blesses this "adjusting state while rendering" pattern (documented in React docs). Moving to `useEffect` would be worse — picks would flash for one frame. Not a bug.
- **OPEN** Visual QA not captured — need to verify timer badge renders correctly and RTL (Hebrew) doesn't break layout. **owner: next night**
- **OPEN** RTL audit: `SealedBidVersus` uses `dir={dir}` but has no Hebrew-specific layout tests. ExitRoomButton + back arrow need DirectionalIcon check. **owner: next night**

## Queue (audit order — closest-to-release first)

1. **wheel-rush** — canonical MP mode.
2. **blast** — standalone `/blast`; recent 0-score + memo fixes — verify they held.
3. **word-hunt** — public daily mode; lower priority (already shipped) but audit for regressions.
4. **adventure** — campaign `/adventure`, beta-gated (guest→/); large surface, audit last.

> Excluded: `word-alchemy` (hollow per prior assessment). `classic` is the baseline mode (stable);
> audit only if a regression surfaces.

## Released (≥90% — production-ready)

### shiritori — 90% — RELEASED 2026-07-23
- **Coverage:** ALL areas over 6 nights (07-18→07-23): chain engine, backend manager+handler, MP hook+view (useShiritoriGame+ShiritoriVersus+ShiritoriView), solo engine+page, landing page, i18n ×6 locales (en/he/sv/ja/es/ru), turn timer (countdown bar + role="timer"), dictCheckJa network/HTTP error path, TDD tests (9 tests across useShiritoriGame.test.ts + ShiritoriView.test.tsx), a11y (RTL DirectionalIcon, aria-labels, keyboard), perf (no memo issues), score arithmetic, edge cases (confirmNewGame ×6, backend idempotency), backend handler (rate-limit/finalization/state-transition), visual QA (6 screenshots: landing ×3 locales, page ×3 locales).
- **Fixes shipped:** turn-timer UI (07-19), dictCheckJa DictNetworkError throw + shiritori.solo.err.network i18n ×6 (07-21), 9 TDD countdown tests (07-21), RTL DirectionalIcon in solo/page.tsx (07-22), final loser eliminated-on-gameOver (07-18).
- **Remaining minor (non-blocking):** he/sv/es landing h1 uses English copy (design intent — ja is primary indexed locale); solo mode admin-gated (founder go-live call).
- **Visual QA:** 6 screenshots captured 2026-07-23 in docs/nightly/mode-qa/2026-07-23/. Pages render correctly; RTL Hebrew confirmed; Japanese kana renders cleanly.
- **Public exposure:** JA MP bypasses admin gate (live); solo is admin-preview; landing publicly accessible. "Released" = QA-complete — go-live = founder flag flip.

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
