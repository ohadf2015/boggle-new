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

### word-tower — readiness: 79% — status: AUDIT IN PROGRESS
- **Why first:** closest to release (deep: 30 components + 69 lib files), admin/beta-gated, no public exposure yet.
- **Reach for QA:** `https://www.lexiclash.live/en/word-tower?word-tower=1` (the `?word-tower=1` override force-enables the gated mode for non-admins — see `lib/wordTower/flags.ts`). Hebrew RTL: `/he/word-tower?word-tower=1`. Local dev (NODE_ENV=development) needs no override.
- **Key files:** `components/wordTower/*`, `lib/wordTower/*`, `app/[locale]/word-tower/{page,PageClient}.tsx`, `app/api/word-tower/*`.
- **Last audited:** 2026-07-02

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
- [x] **Clarity of use** — AUDITED 2026-07-02: No FTUE tutorial or onboarding overlay exists. Only affordance: collapsible "Clue" button (WordTowerHud.tsx:215-248) showing N-possible-words + sample word. No "tap a tile to start", no 3-letter minimum hint on first load, no rules summary. Experienced puzzle players learn by doing; true beginners get dropped cold. Logged as MINOR open issue.
- [x] **Dead props** — AUDITED 2026-07-02: `nearMissKey` on WordTowerScene intentionally dead (comment: "accepted here so the producer in WordTowerPlay type-checks" — forward-reserved). `errorKey` passed to Scene but Scene ignores it — intended shake-on-reject animation appears unimplemented in the Scene; haptics+sound handled in Play useEffect instead. Logged as MINOR open issue.
- [x] **State restore telemetry** — FIXED 2026-07-02: `restoreWordTowerState` silently discarded player progress on version mismatch with zero output. Added `console.warn` when `saved` exists but version mismatches (null/undefined = first visit, no warn). `lib/wordTower/wordTowerManager.ts:566`.
- [x] **Clutch banner a11y** — FIXED 2026-07-02: Hard-coded `⚠` emoji rendered directly in JSX banner (`WordTowerPlay.tsx:1093`), read aloud by screen readers. Wrapped in `<span aria-hidden="true">`. The banner already had `aria-live="assertive"` so the translated text is properly announced.
- [ ] **Visual QA** — not captured (code-audit only; mode is admin-gated on prod)

### Open issues (severity → owner)
**BLOCKERS (must fix before release)**
1. **Daily leaderboard backend missing** — no `word_tower_daily` table, no daily-score API, no global "who won today?" — Layer A (client) is complete; Layer B is a design decision (spec: `docs/specs/word-tower-daily-seed.md`). Primary retention lever (NYT Spelling Bee model). **Design call needed: 1 scored attempt/day or unlimited? Hazards in daily?** — owner: review-by-eod

**MINOR / DEFER**
- **No FTUE for new players** — no tutorial/onboarding overlay; only a collapsible hint button. Experienced puzzle players self-onboard; true beginners get dropped cold. Consider a one-time "how to play" overlay on first visit. — owner: review-by-eod
- **`errorKey` dead in Scene** — passed to `WordTowerScene` but Scene ignores it; intended shake-on-reject animation unimplemented at the Scene/Pixi layer. Haptics+sound work. Visual reject-shake in the tile stack may be missing. — owner: review-by-eod
- ~~`wordTowerManager.ts` — state restore version mismatch silent discard (no telemetry)~~ FIXED 2026-07-02 (console.warn added)
- ~~`WordTowerPlay.tsx` — emoji `⚠` inline (not i18n-critical but a11y gap)~~ FIXED 2026-07-02 (aria-hidden)
- `WordTowerPlay.tsx` — emoji `⚠` inline (not i18n-critical but inconsistent style)
- `WordTowerPlay.tsx` — inline callbacks on render; `useCallback` would help perf
- `StateSchema.passthrough()` — unknown client fields persist in state JSONB; acceptable for forward-compat but marginally increases storage footprint
- Daily hazard policy unresolved (spec: disable hazards in daily for fair global comparison?) — design defer
- Daily streak device-local — localStorage, not server-synced; resets on device switch — design decision tied to daily backend

## Queue (audit order — closest-to-release first)

1. **word-tower** ← current (77%, needs daily leaderboard design call to approach 90%)
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
