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

### word-tower — readiness: 45% — status: AUDIT IN PROGRESS
- **Why first:** closest to release (deep: 30 components + 69 lib files), admin/beta-gated, no public exposure yet.
- **Reach for QA:** `https://www.lexiclash.live/en/word-tower?word-tower=1` (the `?word-tower=1` override force-enables the gated mode for non-admins — see `lib/wordTower/flags.ts`). Hebrew RTL: `/he/word-tower?word-tower=1`. Local dev (NODE_ENV=development) needs no override.
- **Key files:** `components/wordTower/*`, `lib/wordTower/*`, `app/[locale]/word-tower/{page,PageClient}.tsx`, `app/api/word-tower/*`.
- **Last audited:** 2026-06-26

### Audit areas covered
- [x] **Bugs / correctness** — null guards, unguarded Record access, double-scaling score bug, damageTower combo reset
- [x] **Edge cases** — empty dictionary, network drop, double-submit, async wreck on unmount
- [x] **i18n** — wordTower section exists in all 5 langs (en/he/sv/ja/es confirmed); hard-coded English fallback `'Rival'` at WordTowerPlay.tsx:855
- [x] **Perf** — per-frame allocations in wind tick (Scene.tsx:461-466); inline callbacks in Play.tsx:1135/1143/1164
- [x] **versusMatch.ts** — server-authoritative pure functions; well-guarded; clean
- [x] **Notifications** — rewardFx missing from hard-clear list (fixed 2026-06-26: `setRewardFx(null)` added)
- [x] **HUD overlap** — skin picker hidden on <400px viewports (fixed 2026-06-26)
- [x] **Tower sway speed** — SWAY_PERIOD_CALM_MS 2600→4500, FRANTIC 1650→2800, SWAY_MAX_DEG 3.4→2.2 (fixed 2026-06-26 per founder: "not too fast, look real")
- [x] **Tower lean recovery** — RECENT_WEIGHT_DECAY 0.70→0.50 for faster centering after good drops (fixed 2026-06-26 per founder: "stays on the side")
- [x] **Upgrades wiring audit** — ALL 9 upgrades confirmed wired to crane/manager/scene; not a code bug
- [ ] **Visual QA** — not captured (no local dev server; code-audit only)
- [ ] **a11y** — partial (aria-labels confirmed present on HUD; contrast + keyboard nav not verified)
- [ ] **Daily challenge integration** — not yet audited (founder directive: "focus more on daily challenge, less MP")
- [ ] **Crash guards** — TOWER_SURPRISE_META unguarded (Play.tsx:509, 1076), TOWER_TIER_KEY[tier] (Play.tsx:998), PERKS[id] (Play.tsx:1119) — still open

### Open issues (severity → owner)
**BLOCKERS (must fix before release)**
1. `WordTowerPlay.tsx:509` — `TOWER_SURPRISE_META[s.event].sound` crashes if server sends unknown event type. Fix: `const meta = TOWER_SURPRISE_META[s.event]; if (meta) surpriseSoundFns[meta.sound]?.();` — owner: lane-11 tomorrow
2. `WordTowerPlay.tsx:998` — `TOWER_TIER_KEY[tier]` crashes if tier is not in Record keys. Fix: add `&& TOWER_TIER_KEY[tower.state.lastResult.tier]` guard to condition — owner: lane-11 tomorrow
3. `WordTowerPlay.tsx:1076-1077` — `TOWER_SURPRISE_META[surpriseFx.s.event]` unguarded (same pattern as #1) — owner: lane-11 tomorrow
4. `WordTowerPlay.tsx:1119-1122` — `PERKS[id]` crashes if id not a valid perk key. Fix: `const perk = PERKS[id]; if (!perk) return null;` inside map — owner: lane-11 tomorrow
5. `wordTowerManager.ts:159` — double-scaling: `baseMeters * placementMultiplier * appliedHeightMult` (both multipliers applied when both non-1) — corrupts leaderboard scores — owner: review-by-eod (complex logic)
6. ~~`wordTowerManager.ts:213` — `damageTower()` does not reset `combo` in returned state~~ — moved to review-by-eod; combo handled by callers
7. `wordTowerManager.ts:179` — scramble earning: `WORD_TOWER_SCRAMBLE_EARN_EVERY_M` could be 0 → silent fail — owner: lane-11 tomorrow

**MAJORS (blocker for release quality)**
8. `WordTowerScene.tsx:724` — `t` prop fallback `(k) => k` renders raw i18n key as button label when caller omits `t`; `WordTowerVersus` confirmed to omit it — owner: lane-11 tomorrow
9. `WordTowerScene.tsx:358` — `window.setTimeout` not tracked/cleared on unmount; fires post-unmount — owner: lane-11 tomorrow
10. `WordTowerPlay.tsx:855` — fallback string `'Rival'` is hard-coded English — owner: lane-11 tomorrow
11. Network errors silently swallowed across 3 fetch calls in Play.tsx — no user feedback on critical save failure — owner: lane-11 (minor UX)
12. Daily challenge integration unaudited — founder directive to make word-tower a good daily challenge — owner: lane-11 tomorrow

**MINOR / DEFER**
- `WordTowerScene.tsx:50,83` — `errorKey` / `nearMissKey` props declared but unused; dead API surface
- `wordTowerManager.ts:247` — state restore version mismatch silent discard (no telemetry)
- `WordTowerPlay.tsx:1031` — emoji `⚠` inline (not i18n-critical but inconsistent style)
- `WordTowerPlay.tsx:1135/1143/1164` — inline callbacks on render; `useCallback` would help perf

## Queue (audit order — closest-to-release first)

1. **word-tower** ← current (45%, target 65%+ next night fixing crash blockers)
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
