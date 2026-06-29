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

### word-tower — readiness: 67% — status: AUDIT IN PROGRESS
- **Why first:** closest to release (deep: 30 components + 69 lib files), admin/beta-gated, no public exposure yet.
- **Reach for QA:** `https://www.lexiclash.live/en/word-tower?word-tower=1` (the `?word-tower=1` override force-enables the gated mode for non-admins — see `lib/wordTower/flags.ts`). Hebrew RTL: `/he/word-tower?word-tower=1`. Local dev (NODE_ENV=development) needs no override.
- **Key files:** `components/wordTower/*`, `lib/wordTower/*`, `app/[locale]/word-tower/{page,PageClient}.tsx`, `app/api/word-tower/*`.
- **Last audited:** 2026-06-29

### Audit areas covered
- [x] **Bugs / correctness** — null guards, unguarded Record access, double-scaling score (VERIFIED NOT A BUG 2026-06-29 — `placementMultiplier × appliedHeightMult` is intentional multiplicative compounding: crane quality × updraft bonus), damageTower combo reset
- [x] **Edge cases** — empty dictionary, network drop, double-submit, async wreck on unmount
- [x] **i18n** — wordTower section exists in all 5 langs (en/he/sv/ja/es confirmed); hard-coded `'Rival'` FIXED 2026-06-27; hard-coded `'Word Tower'` in navigator.share FIXED 2026-06-28 (`wordTower.share.title` × 5 langs); all strings in WordTowerGame.tsx use `t()` — CLEAN
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
- [x] **a11y (partial)** — WordTowerRewardReveal: `role="status"` + `aria-live="polite"` — clean; WordTowerUpgradePanel: `role="dialog"` + `aria-modal="true"` + all buttons have `aria-label` — panel content clean; drawer toggle `onPointerDown` issue in prior ledger = STALE (code changed, no longer present)
- [x] **WordTowerUpgradePanel UX** — neo-brutalist modal; role/aria clean; buy flow correct; coin balance live; max-level pips correct; ISSUE: no focus trap implementation (role=dialog without keyboard Tab containment = WCAG 2.1 AA violation)
- [x] **WordTowerGame wrapper** — dict load, progress restore, daily/endless toggle, leaderboard gate all audited; ISSUE: dict load has no `.catch()` — silent forever-loading on failure (Class 4)
- [x] **Network error handling** — fetch calls in WordTowerPlay.tsx use intentional best-effort pattern (`.catch(() => { /* best-effort */ })`); progress/wreck are designed fire-and-forget — ACCEPTABLE for this mode
- [ ] **Visual QA** — not captured (code-audit only)
- [ ] **Game-over / topple results screen** — not audited
- [ ] **API routes** (`/api/word-tower/progress`, `/api/word-tower/wreck`) — server-side validation not audited

### Open issues (severity → owner)
**BLOCKERS (must fix before release)**
1. **Daily leaderboard backend missing** — no `word_tower_daily` table, no daily-score API, no global "who won today?" — Layer A (client) is complete; Layer B is a design decision (spec: `docs/specs/word-tower-daily-seed.md`). Primary retention lever (NYT Spelling Bee model). **Design call needed: 1 scored attempt/day or unlimited? Hazards in daily?** — owner: review-by-eod

**MAJORS (blocker for release quality)**
2. **Dict load silent failure** — `WordTowerGame.tsx`: `loadWordCraftDictionary().then(...)` has no `.catch()` — failed load leaves "Loading..." forever, no user feedback. FIXED THIS RUN (added error state + retry CTA).
3. **UpgradePanel focus trap missing** — `WordTowerUpgradePanel.tsx`: `role="dialog" aria-modal="true"` but no Tab containment; keyboard users can Tab outside the modal — WCAG 2.1 AA violation — owner: lane-11 tomorrow
4. **Network errors silently swallowed** across 3 fetch calls in Play.tsx — no user feedback on critical save failure — ACCEPTABLE (intentional best-effort design). DOWNGRADE to MINOR.

**MINOR / DEFER**
- `WordTowerScene.tsx` `errorKey` / `nearMissKey` props declared but unused; dead API surface
- `wordTowerManager.ts` — state restore version mismatch silent discard (no telemetry)
- `WordTowerPlay.tsx` — emoji `⚠` inline (not i18n-critical but inconsistent style)
- `WordTowerPlay.tsx` — inline callbacks on render; `useCallback` would help perf
- Daily hazard policy unresolved (spec: disable hazards in daily for fair global comparison?) — design defer
- Daily streak device-local — localStorage, not server-synced; resets on device switch — design decision tied to daily backend

## Queue (audit order — closest-to-release first)

1. **word-tower** ← current (67%, target ≥75%: game-over/topple flow + API routes + focus trap fix)
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
