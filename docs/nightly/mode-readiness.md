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

### word-tower — readiness: 38% — status: AUDIT IN PROGRESS
- **Why first:** closest to release (deep: 30 components + 69 lib files), admin/beta-gated, no public exposure yet.
- **Reach for QA:** `https://www.lexiclash.live/en/word-tower?word-tower=1` (the `?word-tower=1` override force-enables the gated mode for non-admins — see `lib/wordTower/flags.ts`). Hebrew RTL: `/he/word-tower?word-tower=1`. Local dev (NODE_ENV=development) needs no override.
- **Key files:** `components/wordTower/*`, `lib/wordTower/*`, `app/[locale]/word-tower/{page,PageClient}.tsx`, `app/api/word-tower/*`.
- **Last audited:** 2026-06-25

### Audit areas covered
- [x] **Bugs / correctness** — null guards, unguarded Record access, double-scaling score bug, damageTower combo reset
- [x] **Edge cases** — empty dictionary, network drop, double-submit, async wreck on unmount
- [x] **i18n** — wordTower section exists in all 5 langs (en/he/sv/ja/es confirmed); hard-coded English fallback `'Rival'` at WordTowerPlay.tsx:855
- [x] **Perf** — per-frame allocations in wind tick (Scene.tsx:461-466); inline callbacks in Play.tsx:1135/1143/1164
- [x] **versusMatch.ts** — server-authoritative pure functions; well-guarded; clean
- [ ] **Visual QA** — not captured (no local dev server started; production URL audited by code only)
- [ ] **a11y** — partial (aria-labels confirmed present on HUD; contrast + keyboard nav not verified)
- [ ] **Daily challenge integration** — not yet audited (founder directive: "focus more on daily challenge, less MP")
- [ ] **Manager double-scaling fix** — wordTowerManager.ts:159 (baseMeters * placementMultiplier * appliedHeightMult — double application)
- [ ] **damageTower combo reset** — wordTowerManager.ts:213 (combo not reset inside returned state)

### Open issues (severity → owner)
**BLOCKERS (must fix before release)**
1. `WordTowerPlay.tsx:509` — `TOWER_SURPRISE_META[s.event].sound` crashes if server sends unknown event type. Fix: `const meta = TOWER_SURPRISE_META[s.event]; if (meta) surpriseSoundFns[meta.sound]?.();` — owner: lane-11 tomorrow
2. `WordTowerPlay.tsx:998` — `TOWER_TIER_KEY[tier]` crashes if tier is not in Record keys. Fix: add `&& TOWER_TIER_KEY[tower.state.lastResult.tier]` guard to condition — owner: lane-11 tomorrow
3. `WordTowerPlay.tsx:1076-1077` — `TOWER_SURPRISE_META[surpriseFx.s.event]` unguarded (same pattern as #1) — owner: lane-11 tomorrow
4. `WordTowerPlay.tsx:1119-1122` — `PERKS[id]` crashes if id not a valid perk key. Fix: `const perk = PERKS[id]; if (!perk) return null;` inside map — owner: lane-11 tomorrow
5. `wordTowerManager.ts:159` — double-scaling: `baseMeters * placementMultiplier * appliedHeightMult` (both multipliers applied when both non-1) — corrupts leaderboard scores — owner: review-by-eod (complex logic)
6. `wordTowerManager.ts:213` — `damageTower()` does not reset `combo` in returned state, only in DamageResult; callers must apply separately — owner: lane-11 tomorrow
7. `wordTowerManager.ts:179` — scramble earning: `WORD_TOWER_SCRAMBLE_EARN_EVERY_M` could be 0 → division by Infinity silently (not crash, but logic fails) — owner: lane-11 tomorrow
8. `wordTowerManager.ts:198-210` — `applyTowerWord` has race condition on `usedWords` Set if two calls arrive before state commits — owner: review-by-eod (server concern)

**MAJORS (blocker for release quality)**
9. `WordTowerScene.tsx:724` — `t` prop fallback `(k) => k` renders raw i18n key as button label when caller omits `t`; `WordTowerVersus` confirmed to omit it — owner: lane-11 tomorrow
10. `WordTowerScene.tsx:358` — `window.setTimeout` not tracked/cleared on unmount; `!tile.destroyed` guard prevents crash but fires post-unmount — owner: lane-11 tomorrow
11. `WordTowerPlay.tsx:855` — fallback string `'Rival'` is hard-coded English; should be `t('wordTower.wreck.defaultRival')` (key doesn't exist yet) — owner: lane-11 tomorrow
12. Network errors silently swallowed across 3 fetch calls in Play.tsx (wreck on mount, wreck on action, progress save) — no user feedback on critical save failure — owner: lane-11 (minor UX)
13. `WordTowerPlay.tsx:1135/1143/1164` — inline arrow functions on every render passed to child components; should be `useCallback` — owner: minor, can defer

**DAILY CHALLENGE (founder directive)**
14. Audit daily challenge integration — is word-tower surfaced in the daily hub? Is it the PRIMARY mode in daily? Founder directive: "focus more to make it good fit to the daily challenge and less for the mp mode etc" — owner: lane-11 tomorrow
15. Versus/MP UI visible to solo daily players? If so, de-emphasize — owner: lane-11 tomorrow

**MINOR / DEFER**
- `WordTowerScene.tsx:50,83` — `errorKey` / `nearMissKey` props declared but unused; dead API surface
- `wordTowerManager.ts:247` — state restore version mismatch silent discard (no telemetry)
- `wordTowerManager.ts:260` — `rerollStart` retry loop: no timeout if `isViable` callback is slow
- `WordTowerPlay.tsx:1031` — emoji `⚠` inline (not i18n-critical but inconsistent style)

## Queue (audit order — closest-to-release first)

1. **word-tower** ← current (38%, aiming for 60%+ next night with blocker fixes)
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
