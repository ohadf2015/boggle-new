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

### wheel-rush — readiness: unaudited — status: IN PROGRESS
- **Why next:** promoted from Queue #1 2026-08-02 after sealed-bid reached 90%. Canonical MP mode — no prior audit session.
- **Last audited:** never (first night pending).

## Queue (audit order — closest-to-release first)

1. **blast** — standalone `/blast`; recent 0-score + memo fixes — verify they held.
2. **word-hunt** — public daily mode; lower priority (already shipped) but audit for regressions.
3. **adventure** — campaign `/adventure`, beta-gated (guest→/); large surface, audit last.

> Excluded: `word-alchemy` (hollow per prior assessment). `classic` is the baseline mode (stable);
> audit only if a regression surfaces.

## Released (≥90% — production-ready)

### sealed-bid — 90% — RELEASED 2026-08-02
- **Coverage:** all areas from 2026-07-24→08-01 (see history below) plus tonight's close-out: RTL sign-order fix + error-handling re-verify (all `catch` blocks in sealedBidHandler/sealedBidManager log via `logger.error`, no silent swallowing — Class 4 clean).
- **Key files:** components/multiplayer/sealedBid/*, backend/handlers/sealedBidHandler.ts, backend/modules/sealedBidManager.ts, app/[locale]/sealed-bid/*.
- **Last audited:** 2026-08-02
- **Covered (2026-07-24):** backend wiring (gameStartHandler, index.ts), sealedBidManager pure state machine, sealedBidHandler (bid validation, deadline timers, finalize), useSealedBidGame hook, SealedBidVersus MP UI, solo page.tsx, sbMpEngine resolver, i18n ×6 locales (both sealedBid + sealedBidMp namespaces), a11y review, perf review, gate/visibility, tests (5 files, 572 lines), host+player view wiring, lock-gate, rackPool.
- **Covered (2026-07-26):** countdown timer render (roundDeadline→secsLeft hook wired + UI badge in standings sidebar), sealedBidMp.autoResolve i18n ×6 locales, neo-orange/red urgency color scheme.
- **Covered (2026-07-27):** topScorer tie-breaking fixed (alphabetical), picks-reset-in-render validated as React-blessed pattern (not a bug), TDD tests added: countdown timer badge (×2 tests: renders + urgency color), tie-breaking integration test.
- **Covered (2026-07-28):** RTL audit — ExitRoomButton (DoorOpen icon, non-directional, OK), solo page.tsx back arrow (DirectionalIcon already correct). **Fixed**: exit button overlay `left-3`→`start-3` (logical property, RTL-safe); backspace `Delete` icon → `DirectionalIcon mirror` (flips in RTL). TDD: 2 new tests (start-3 assertion, rtl:scale-x-[-1] assertion). Also confirmed solo page: already uses `DirectionalIcon` correctly (line 239), `dir={dir}` on root div. Code audit complete for all navigation/directional elements.
- **Covered (2026-07-30):** double-submit guard (`sealedBidHandler.ts:205` rejects a second lock via `already-locked`, verified clean) and disconnect/timeout resolution (round deadline timer force-resolves independent of `allActiveLocked`, verified clean — a disconnecting player can't wedge the room). Visual QA attempted via agent-browser, blocked by an undismissable cookie-consent overlay outside the app's a11y tree (3 dismiss strategies failed) — **not captured**, tooling gap not a product bug.
- **Covered (2026-07-31):** Visual QA UNBLOCKED — pre-seeding `localStorage['cookie-consent-v2']` (`utils/cookieConsent.ts` key) via `agent-browser storage local set` before reload skips the overlay entirely; 2 screenshots captured (en solo entry, he/RTL solo entry) in `docs/nightly/mode-qa/2026-07-31/`. **Found + FIXED a blocker**: the raw i18n key `sealedBid.needWord` rendered literally on-screen (visible to every player any time their word is <3 letters or they have no stake — i.e. the default state on entry, confirmed on BOTH en and he prod screenshots) instead of translated hint text. Root cause: `SealedBidTable.tsx:54-63` looks up flat keys `sealedBid.needWord`/`sealedBid.needStake`, but those keys never existed in any of the 5 locale translation files (only `sealedBid.error.needStake`/`error.tooShort` existed, at a different path) — the component's own unit test fully mocks `t()` so this never failed CI (Class 4: silent, since the string still "rendered," it just rendered the key). Fixed by adding `needWord`/`needStake` to the `sealedBid` namespace in en/es/he/ja/sv (`translations/*.js`), matching value used by the pre-existing test mock. RTL layout otherwise verified correct from the he screenshot (letter wheel, buttons, board all mirror correctly; no clipping).
- **Covered (2026-08-01):** MP ≥2-player clash scoring — the explicit "why next" carry-over — **verified clean end-to-end, no bug found**. `sbMpEngine.resolveSbMpRound` (pure fn) is unit-tested for the exact 3-player case (2 clash + 1 unique), case-insensitive dup detection, invalid-bid-doesn't-poison-clash. `sealedBidManager.resolveRound` correctly banks `floor(base/2)` for clashes / `base*2` for unique into `state.scores` across all `state.players` (never-locked treated as pass, matches doc comment). `sealedBidHandler.resolveAndBroadcast` broadcasts the FULL `results[]` array to the whole room (not per-socket), so every client sees every player's outcome — no asymmetric-payload risk (Class 3). `SealedBidVersus.tsx:217-243` renders all entries sorted by points with clash=orange/unique=lime color coding. Also checked reconnect path (`useSealedBidGame.ts:98,106` emits `requestSealedBidState` on `connect`): this is a supplementary snapshot fetch layered on top of `SocketContext`'s existing `join` re-emit-on-reconnect (see `useMultiplayerJoin.ts:292-326`, `setRejoinIntent`) — same dual-layer pattern already used by the RELEASED shiritori mode (hook docstring confirms "Mirrors useShiritoriGame"), not a fresh unguarded `requestX`-only path — did not touch, consistent with an already-validated pattern. Checked series-end: `topScorer` (tie-fixed 07-27) reused for the final winner, `finalizeSealedBidGame` errors are logged not swallowed.

**Open issues:** none — all resolved.
- ~~**MAJOR** No countdown timer in `SealedBidVersus` MP view~~ — **FIXED 2026-07-26**: `secsLeft` state + `useEffect` interval wired from `game.roundDeadline`; badge renders orange→red (≤5s) in standings sidebar with `role="timer"` a11y. `SealedBidVersus.tsx`.
- ~~**MINOR** `topScorer` in `sealedBidHandler.ts:157` resolves ties by JS object insertion order~~ — **FIXED 2026-07-27**: alphabetical tiebreak added; TDD integration test added.
- ~~**MINOR** `SealedBidVersus.tsx:44-49` — picks reset during render body~~ — **VALIDATED as correct**: React 18 explicitly blesses this "adjusting state while rendering" pattern.
- ~~**OPEN** RTL audit: `SealedBidVersus` exit button `left-3` + backspace icon not mirrored~~ — **FIXED 2026-07-28**: `start-3` logical property + `DirectionalIcon mirror`. TDD tests added.
- ~~**OPEN** Visual QA not captured — cookie-consent overlay~~ — **FIXED 2026-07-31 (tooling)**: pre-seed `localStorage['cookie-consent-v2']` via `agent-browser storage local set` before reload. Also unblocks lane 02's Layout-Shifts capture — same overlay was blocking it.
- ~~**MAJOR** `sealedBid.needWord`/`sealedBid.needStake` i18n keys missing~~ — **FIXED 2026-07-31**: raw key was rendering on-screen on entry in all locales (component test mocks `t()` so CI never caught it); added both keys ×5 locales.
- ~~**MINOR** Results row hardcodes `+{r.points}` sign~~ — **FIXED 2026-08-02**: `SealedBidVersus.tsx:236-239` now branches on `dir === 'rtl'` → `${r.points}+` (RTL) vs `+${r.points}` (LTR).
- **Public exposure:** admin-gated (per `LandingChallengeCards.gates.test.tsx`). "Released" = QA-complete, NOT flipped live — founder go-ahead required to widen the gate.

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
