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

### word-tower — readiness: 65% — status: AUDIT IN PROGRESS
- **Why first:** closest to release (deep: 30 components + 69 lib files), admin/beta-gated, no public exposure yet.
- **Reach for QA:** `https://www.lexiclash.live/en/word-tower?word-tower=1` (the `?word-tower=1` override force-enables the gated mode for non-admins — see `lib/wordTower/flags.ts`). Hebrew RTL: `/he/word-tower?word-tower=1`. Local dev (NODE_ENV=development) needs no override.
- **Key files:** `components/wordTower/*`, `lib/wordTower/*`, `app/[locale]/word-tower/{page,PageClient}.tsx`, `app/api/word-tower/*`.
- **Last audited:** 2026-06-28

### Audit areas covered
- [x] **Bugs / correctness** — null guards, unguarded Record access, double-scaling score bug, damageTower combo reset
- [x] **Edge cases** — empty dictionary, network drop, double-submit, async wreck on unmount
- [x] **i18n** — wordTower section exists in all 5 langs (en/he/sv/ja/es confirmed); hard-coded `'Rival'` FIXED 2026-06-27; hard-coded `'Word Tower'` in navigator.share FIXED 2026-06-28 (`wordTower.share.title` × 5 langs)
- [x] **Perf** — per-frame allocations in wind tick (Scene.tsx:461-466); inline callbacks in Play.tsx:1135/1143/1164
- [x] **versusMatch.ts** — server-authoritative pure functions; well-guarded; clean
- [x] **Notifications** — rewardFx missing from hard-clear list (fixed 2026-06-26: `setRewardFx(null)` added)
- [x] **HUD overlap** — skin picker hidden on <400px viewports (fixed 2026-06-26)
- [x] **Tower sway speed** — SWAY_PERIOD_CALM_MS 2600→4500, FRANTIC 1650→2800, SWAY_MAX_DEG 3.4→2.2 (fixed 2026-06-26 per founder: "not too fast, look real")
- [x] **Tower lean recovery** — RECENT_WEIGHT_DECAY 0.70→0.50 for faster centering after good drops (fixed 2026-06-26 per founder: "stays on the side")
- [x] **Upgrades wiring audit** — ALL 9 upgrades confirmed wired to crane/manager/scene; not a code bug
- [x] **Crash guards** — FIXED 2026-06-27: (a) `TOWER_SURPRISE_META[s.event]` in useEffect (Play.tsx:538); (b) `TOWER_SURPRISE_META[surpriseFx.s.event]` in render (Play.tsx:1120-1121); (c) `PERKS[id]` in owned-perk map (Play.tsx:1163-1166)
- [x] **t-prop safety** — `WordTowerScene.tsx:68` `t` is optional; verified all 3 usage sites fallback to `?? ((k) => k)` identity — no raw key leak; NOT a bug
- [x] **Wind animation cleanup** — `WordTowerScene.tsx` wind useEffect verified to have `return () => cancelAnimationFrame(raf)` — properly cleaned; NOT a leak
- [x] **Daily challenge architecture** — FULLY AUDITED 2026-06-28: Layer A (client-side) is complete: deterministic seeding (FNV-1a hash + mulberry32 RNG via `dailySeed.ts`), 6 rotating daily mutators (`dailyMutators.ts`), perk draft, streak tracking, best-height localStorage. Layer B (server-side) is a design-decision gap: no daily leaderboard table, no daily score API endpoint, no cross-device streak sync — spec `docs/specs/word-tower-daily-seed.md` awaiting greenlight. This is the **#1 blocker for social retention** (the mode is a single-player puzzle; the "who won today?" hook is absent).
- [x] **a11y** — top-level + HUD buttons: all aria-labelled; keyboard handler: Enter/Backspace/Escape/letter fully wired; weakness: drawer toggle (`WordTowerPlay.tsx:184`) uses `onPointerDown` only — no keyboard equivalent → focus trap risk for keyboard users when drawer is collapsed
- [ ] **Visual QA** — not captured (code-audit only)
- [ ] **window.setTimeout leak** — `WordTowerScene.tsx:372` resonance-schedule setTimeouts not tracked; fires post-unmount (partial safety: `tile.destroyed` check)

### Open issues (severity → owner)
**BLOCKERS (must fix before release)**
1. ~~`WordTowerPlay.tsx:509` — `TOWER_SURPRISE_META[s.event].sound` crashes~~ — FIXED 2026-06-27
2. ~~`WordTowerPlay.tsx:1076-1077` — `TOWER_SURPRISE_META[surpriseFx.s.event]` unguarded~~ — FIXED 2026-06-27
3. ~~`WordTowerPlay.tsx:1119-1122` — `PERKS[id]` crashes if id not a valid perk key~~ — FIXED 2026-06-27
4. `wordTowerManager.ts:159` — double-scaling: `baseMeters * placementMultiplier * appliedHeightMult` (both multipliers applied when both non-1) — corrupts leaderboard scores — owner: review-by-eod (complex logic)
5. **Daily leaderboard backend missing** — no `word_tower_daily` table, no daily-score API, no global "who won today?" — Layer A (client) is complete; Layer B is a design decision (spec: `docs/specs/word-tower-daily-seed.md`). This is the primary retention lever (NYT Spelling Bee model). **Design call needed: 1 scored attempt/day or unlimited? Hazards in daily?** — owner: review-by-eod

**MAJORS (blocker for release quality)**
6. ~~`WordTowerScene.tsx` — `t` prop renders raw i18n keys when omitted~~ — VERIFIED NOT A BUG 2026-06-28 (fallback `?? ((k) => k)` at all 3 usage sites)
7. `WordTowerScene.tsx:372` — resonance-schedule `window.setTimeout` not tracked/cleared on unmount; fires post-unmount (partial safety: `tile.destroyed` check) — owner: lane-11 tomorrow
8. ~~`WordTowerPlay.tsx:855` — fallback string `'Rival'` is hard-coded English~~ — FIXED 2026-06-27
9. ~~`WordTowerPlay.tsx:818` — `navigator.share({ title: 'Word Tower' })` hard-coded~~ — FIXED 2026-06-28 (`wordTower.share.title` × 5 langs)
10. Network errors silently swallowed across 3 fetch calls in Play.tsx — no user feedback on critical save failure — owner: lane-11 (minor UX, next night)
11. `WordTowerPlay.tsx:184` — drawer toggle pointer-only (`onPointerDown`); no keyboard equivalent → focus trap risk — a11y — owner: lane-11 tomorrow
12. **Daily streak device-local** — localStorage, not server-synced; resets on device switch — design decision — owner: review-by-eod (tied to daily backend decision)

**MINOR / DEFER**
- `WordTowerScene.tsx:50,83` — `errorKey` / `nearMissKey` props declared but unused; dead API surface
- `wordTowerManager.ts:247` — state restore version mismatch silent discard (no telemetry)
- `WordTowerPlay.tsx:1031` — emoji `⚠` inline (not i18n-critical but inconsistent style)
- `WordTowerPlay.tsx:1135/1143/1164` — inline callbacks on render; `useCallback` would help perf
- Daily hazard policy unresolved (spec: disable hazards in daily for fair global comparison?) — design defer

## Queue (audit order — closest-to-release first)

1. **word-tower** ← current (58%, target 70%+ next night: daily-challenge audit + setTimeout fix + silent-error fix)
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
