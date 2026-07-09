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

### word-tower — readiness: 89% — status: AUDIT IN PROGRESS
- **Why first:** closest to release (deep: 30 components + 69 lib files), admin/beta-gated, no public exposure yet.
- **Reach for QA:** `https://www.lexiclash.live/en/word-tower?word-tower=1` (the `?word-tower=1` override force-enables the gated mode for non-admins — see `lib/wordTower/flags.ts`). Hebrew RTL: `/he/word-tower?word-tower=1`. Local dev (NODE_ENV=development) needs no override.
- **Key files:** `components/wordTower/*`, `lib/wordTower/*`, `app/[locale]/word-tower/{page,PageClient}.tsx`, `app/api/word-tower/*`.
- **Last audited:** 2026-07-09

### Audit areas covered
- [x] **Bugs / correctness** — null guards, unguarded Record access, double-scaling score (VERIFIED NOT A BUG 2026-06-29 — `placementMultiplier × appliedHeightMult` is intentional multiplicative compounding: crane quality × updraft bonus), damageTower combo reset
- [x] **Edge cases** — empty dictionary, network drop, double-submit, async wreck on unmount
- [x] **i18n** — wordTower section exists in all 5 langs (en/he/sv/ja/es confirmed); hard-coded `'Rival'` FIXED 2026-06-27; hard-coded `'Word Tower'` in navigator.share FIXED 2026-06-28 (`wordTower.share.title` × 5 langs); all strings in WordTowerGame.tsx use `t()` — CLEAN; `wordTower.loadError` + `wordTower.loading` + `wordTower.retry` present in all 5 langs — CLEAN
- [x] **Perf** — per-frame allocations in wind tick (Scene.tsx:461-466); inline callbacks in Play.tsx — noted; PixiJS rAF destroy-race FIXED (towerSprites.ts try-catch, staged 2026-06-29)
- [x] **versusMatch.ts** — server-authoritative pure functions; well-guarded; clean
- [x] **Notifications** — rewardFx missing from hard-clear list (fixed 2026-06-26: `setRewardFx(null)` added)
- [x] **HUD overlap** — skin picker hidden on <400px viewports (fixed 2026-06-26)
- [x] **Tower sway speed** — SWAY_PERIOD_CALM_MS 2600→4500, FRANTIC 1650→2800, SWAY_MAX_DEG 3.4→2.2 (fixed 2026-06-26 per founder: "not too fast, look real")
- [x] **Tower lean recovery** — RECENT_WEIGHT_DECAY 0.70→0.50 for faster centering after good drops (fixed 2026-06-26 per founder: "stays on the side")
- [x] **Upgrades wiring audit** — ALL 9 upgrades confirmed wired to crane/manager/scene; not a code bug
- [x] **Crash guards** — FIXED 2026-06-27: (a) `TOWER_SURPRISE_META[s.event]` in useEffect (Play.tsx:538); (b) `TOWER_SURPRISE_META[surpriseFx.s.event]` in render (Play.tsx:1120-1121); (c) `PERKS[id]` in owned-perk map (Play.tsx:1163-1166)
- [x] **t-prop safety** — `WordTowerScene.tsx` `t` is optional; all 3 usage sites fallback to `?? ((k) => k)` identity — no raw key leak; NOT a bug
- [x] **Wind animation cleanup** — `WordTowerScene.tsx` wind useEffect has `return () => cancelAnimationFrame(raf)` — properly cleaned; NOT a leak
- [x] **setTimeout leak** — resonance-schedule `window.setTimeout` at `WordTowerScene.tsx` checks `tile.destroyed` before bumpScale; partial safety is ADEQUATE (post-unmount callback = no-op). CLOSED.
- [x] **Daily challenge architecture** — FULLY AUDITED 2026-06-28: Layer A (client-side) complete; Layer B (daily leaderboard backend) is a design-decision gap — spec `docs/specs/word-tower-daily-seed.md` awaiting greenlight.
- [x] **a11y** — WordTowerRewardReveal: `role="status"` + `aria-live="polite"` — clean; WordTowerUpgradePanel: `role="dialog"` + `aria-modal="true"` + `useFocusTrap` (Tab containment + Escape-to-close + focus restore) — CONFIRMED CLEAN 2026-07-01
- [x] **WordTowerUpgradePanel UX** — neo-brutalist modal; role/aria clean; buy flow correct; coin balance live; max-level pips correct; focus trap using `useFocusTrap` at line 44 — WCAG 2.1 AA SATISFIED
- [x] **WordTowerGame wrapper** — dict load, progress restore, daily/endless toggle, leaderboard gate all audited; dict error state confirmed with proper `.catch(() => setDictError(true))` at line 61-64 + error UI with `t('wordTower.loadError')` + retry button — CONFIRMED CLEAN 2026-07-01
- [x] **Network error handling** — fetch calls in WordTowerPlay.tsx use intentional best-effort pattern (`.catch(() => { /* best-effort */ })`); progress/wreck are designed fire-and-forget — ACCEPTABLE for this mode
- [x] **Game-over / topple results screen** — N/A CONFIRMED 2026-07-01: Word Tower is fully ENDLESS. Topple events remove floors (no terminal state in `WordTowerPlayerState`); the game never ends. No game-over screen exists by design.
- [x] **API routes (ALL)** — AUDITED CLEAN 2026-07-01:
  - `/api/word-tower/progress` GET: auth-gated, Sentry-captured, clean
  - `/api/word-tower/progress` POST: rate-limited (60/60s), auth-gated, Zod-validated (BodySchema + StateSchema), monotonic upsert via DB trigger — CLEAN. NOTE: `StateSchema.passthrough()` is intentional forward-compat design; unknown fields can persist in state JSONB blob (acceptable; critical fields height/floors/combo are separately validated in BodySchema)
  - `/api/word-tower/wreck` GET: auth-gated, atomic claim (update…returning, applied_at guard) — no double-claim race — CLEAN
  - `/api/word-tower/wreck` POST: per-USER rate limit (keyed on `user.id`, not just IP), Zod-validated, server-recomputes damage from authoritative DB heights (client can't inflate), attacker name server-derived, 23505 handled idempotently, push notifications fire-and-forget — EXCELLENT security pattern
  - `/api/word-tower/leaderboard` GET: rate-limited (30/60s), auth-gated, top-50 by best_height_m, profiles joined, error-captured — CLEAN
- [x] **Clarity of use / FTUE** — FIXED 2026-07-03: `wordTower.howTo` translations existed in all 5 langs (en/he/sv/ja/es) but were never rendered. Added FTUE overlay to `WordTowerGame.tsx` using `useDismissedFlag('wt-ftue-v1')` — shows on first visit only, bottom-sheet with 3 steps + "Got it!" dismiss. SHIPPED.
- [x] **WordTowerWheel.tsx** — AUDITED CLEAN 2026-07-04: pointer events (down/move/up/cancel/leave) all gated on `placing`; letter buttons have `aria-pressed`+`aria-label` via `t()`; `dir` prop threaded through for RTL; drag de-dupe via `addedDuringDragRef`; no hardcoded strings; golden-letter tray visual (`🌟` aria-hidden); placing morph hides letters with `opacity-0 scale-50` (disabled, not removed from DOM — acceptable). CLEAN.
- [x] **WordTowerSabotageBay.tsx** — AUDITED 2026-07-04: all strings via `t()`; `role="dialog"` + `aria-modal` + `aria-label` on picker overlay; `role="status"` + `aria-live="polite"` on toasts; `useCallback` on handlers; `useEffect` cleanup on all auto-dismiss timers. ONE A11Y BUG FIXED: picker close button `✕` had no `aria-label` — screen readers announced raw multiplication sign. Fixed with `aria-label={t('wordTower.sabotage.cancel')}` + `<span aria-hidden>✕</span>`.
- [x] **WordTowerShareCard.tsx** — AUDITED 2026-07-04: SSR-only SVG component (params-driven, no hooks). Hardcoded English strings are intentional pattern for OG share images — English-only share cards are industry norm. NOTE: `'s tower` possessive suffix at line 104 is grammatically awkward for Hebrew names (`יונתן's tower`). Non-blocking for release (share card is an enhancement, not core gameplay). Logged as MINOR/DEFER.
- [x] **errorKey dead in Scene** — VERIFIED INTENTIONAL 2026-07-03: `WordTowerScene.tsx:438-441` comment explicitly states "A rejected WORD is an INPUT mistake, not tower damage — so the error feel lives on the word-builder (HUD: red shake + message + haptic/sound), NOT on the building. Shaking the whole tower for a typo read as 'the building shakes for no reason' (founder feel report 2026-06-07)." HUD shakes on `animate-neo-shake` at `WordTowerHud.tsx:285`. CLOSED — not a bug.
- [x] **State restore telemetry** — FIXED 2026-07-02: `restoreWordTowerState` silently discarded player progress on version mismatch with zero output. Added `console.warn` when `saved` exists but version mismatches. `lib/wordTower/wordTowerManager.ts:566`.
- [x] **Clutch banner a11y** — FIXED 2026-07-02: Hard-coded `⚠` emoji wrapped in `<span aria-hidden="true">`. `WordTowerPlay.tsx:1093`.
- [x] **WordTowerPlay.tsx pagehide leak** — FIXED 2026-07-05: anonymous handler passed to `window.addEventListener('pagehide')` could never be removed (no reference kept), accumulated on every mount. Named to `onPageHide`, added to useEffect cleanup. (`WordTowerPlay.tsx:784`)
- [x] **WordTowerSmashScene.tsx / WordTowerVersus.tsx / WordTowerStatHud.tsx / WordTowerMutatorBanner.tsx / WordTowerNextRivalChip.tsx / WordTowerPerkDraft.tsx / WordTowerMascot.tsx / WordTowerFlowFrame.tsx** — AUDITED CLEAN 2026-07-05: hardcoded unit symbols (`m`, `s`, `x`, `·`) are international symbols, ACCEPTABLE. `PERKS[id]` in PerkDraft type-safe. GSAP `repeat:-1` swing in SmashScene acceptable (GSAP handles null refs). All a11y and cleanup patterns CLEAN.
- [x] **WordTowerLeaderboard.tsx** — AUDITED CLEAN 2026-07-06: `highestBiome` null-safe (API route has `?? 'city'` guard); no hardcoded strings; loading/error/empty states present.
- [x] **WordTowerLandmarkRail.tsx** — AUDITED CLEAN 2026-07-06: decorative/inert rail, `aria-hidden` correct; unit symbol `m` is international — acceptable.
- [x] **WordTowerRivalRail.tsx** — AUDITED CLEAN 2026-07-06: non-null assertion `!` on line 50 is safe (inside `crossed.length > 0` guard); ResizeObserver cleanup present; auto-dismiss in own effect — no cancellation race.
- [x] **WordTowerVersusRail.tsx** — AUDITED CLEAN 2026-07-06.
- [x] **WordTowerSkinPicker.tsx** — AUDITED CLEAN 2026-07-06: portal guard via `mounted` state; no hardcoded strings.
- [x] **WordTowerNoticeColumn.tsx** — AUDITED CLEAN 2026-07-06: `TOWER_SURPRISE_META[event]` guarded by `meta ?` on render; `gainText !== '+0m'` is internal data comparison (not user-facing); wreck `names[0] ?? fallback` safe.
- [x] **WordTowerBackdrop.tsx / TowerNotice.tsx / WordTowerSighting.tsx** — AUDITED CLEAN 2026-07-06.
- [x] **useDailyStreak.ts** — AUDITED CLEAN 2026-07-09: localStorage deferred to useEffect (no SSR mismatch), idempotent recordPlay (today-guard), proper error handling.
- [x] **useRunStreakPerk.ts** — AUDITED CLEAN 2026-07-09: milestone re-award on state restore is acceptable (perks ephemeral, non-economy-touching). `totalHeightMult` correctly memoized.
- [x] **useWordTowerRivals.ts** — AUDITED CLEAN 2026-07-09: alive flag prevents post-unmount state updates, graceful empty array fallback on failure.
- [x] **BiomeEventEmitter (WordTowerParallaxProps.tsx)** — BUG FIXED 2026-07-09: was creating raw imperative divs with no animation; BackgroundEvent (GSAP) was never rendered. Converted to React state + onDone callback. Background sky events now visible.
- [x] **WordTowerCrane.tsx** — AUDITED CLEAN 2026-07-06: `+{hiddenCount}` badge is `aria-hidden` (decorative) — acceptable.
- [x] **WordTowerCraneBits.tsx** — AUDITED CLEAN 2026-07-08: CraneStabilityMeter (aria-label+aria-hidden dots, all t()), CraneSparkBurst (decorative aria-hidden), CraneFooter (role=status+aria-live=assertive, t(), data-testid, disabled state) — all clean.
- [x] **WordTowerMinimap.tsx** — AUDITED CLEAN 2026-07-08: aria-label via t(), RTL via end-2 logical prop, decorative elements aria-hidden, m unit international — acceptable. tap=scroll-to-top affordance clear.
- [x] **WordTowerParallaxProps.tsx** — AUDITED 2026-07-08: FloatingProp (GSAP idle motion, proper cleanup via tween.kill, aria-hidden) CLEAN. BiomeEventEmitter has MINOR BUG: creates empty unstyled raw divs via imperative appendChild — no GSAP applied; BackgroundEvent component (has full GSAP animation) is never rendered. Background events invisible in prod. Decorative only, mode fully playable. Fix = React state-driven BackgroundEvent rendering. Logged MINOR/DEFER.
- [x] **WordTowerHud.tsx perk badge** — FIXED 2026-07-06: hardcoded `+50%` replaced with `+${Math.round((pk.heightMult - 1) * 100)}%` — derives from `ActiveRunPerk.heightMult` so display auto-updates if constant changes. (`WordTowerHud.tsx:158`)
- [x] **safeToLocaleString integration (WordTowerRewardReveal + WordTowerUpgradePanel)** — AUDITED CLEAN 2026-07-07: language prop correctly threaded from WordTowerPlay → WordTowerNoticeColumn → WordTowerRewardReveal and WordTowerPlay → WordTowerUpgradePanel. Missing `language` prop call site FIXED (`WordTowerPlay.tsx:1070`).
- [x] **WordTowerSmashScene.tsx Pixi ticker null guard** — REGRESSION RESTORED 2026-07-07: `engine.app.ticker?.remove(tick)` null guard (Sentry JAVASCRIPT-NEXTJS-1R6/1R7) was removed in uncommitted modifications; restored. Regression test suite also restored in `__tests__/WordTowerSmashScene.test.tsx`.
- [ ] **Visual QA** — not captured (code-audit only; mode is admin-gated on prod)

### Open issues (severity → owner)
**BLOCKERS (must fix before release)**
_(none — daily leaderboard reclassified below; mode fully playable without it)_

**MINOR / DEFER**
- **Daily leaderboard backend missing** — no `word_tower_daily` table, no daily-score API — Layer A (client) complete; Layer B is a design decision (`docs/specs/word-tower-daily-seed.md`). Mode is fully functional endless without it. **Design call needed: 1 attempt/day or unlimited? Hazards in daily?** — owner: review-by-eod
- `WordTowerPlay.tsx` — inline callbacks on render; `useCallback` would help perf (minor, non-blocking)
- `StateSchema.passthrough()` — unknown client fields persist in state JSONB; acceptable for forward-compat
- Daily hazard policy unresolved — design defer
- Daily streak device-local — localStorage, not server-synced; resets on device switch — tied to daily backend
- `WordTowerShareCard.tsx` line 104: `'s tower` possessive suffix awkward for Hebrew names — minor, share card non-core
- ~~**BiomeEventEmitter background events invisible**~~ — FIXED 2026-07-09: React state-driven rendering; BackgroundEvent now wired via onDone callback.

## Queue (audit order — closest-to-release first)

1. **word-tower** ← current (86%, no blockers; design call on daily leaderboard backend to reach 90%)
2. **crossword** — standalone route `/crossword`, recently made endless; verify generator + newspaper UX.
3. **shiritori** — MP-wired recently; verify chain rules + bot-exclusion.
4. **sealed-bid** — MP bidding mode; verify ≥2-player clash scoring.
5. **wheel-rush** — canonical MP mode.
6. **blast** — standalone `/blast`; recent 0-score + memo fixes — verify they held.
7. **word-hunt** — public daily mode; lower priority (already shipped) but audit for regressions.
8. **adventure** — campaign `/adventure`, beta-gated (guest→/); large surface, audit last.

> Excluded: `word-alchemy` (hollow per prior assessment). `classic` is the baseline mode (stable);
> audit only if a regression surfaces.

## Released (≥90% — production-ready)

_(none yet)_
