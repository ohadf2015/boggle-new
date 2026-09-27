# Word Tower — Tangible Rewards + Wrecking Ball + Polish

**Date:** 2026-06-19
**Status:** Approved (autonomy directive — no gate). Admin-gated mode; ships dark.
**Goal:** Make Word Tower rewards tangible (player actually receives coins), add an earned **Wrecking Ball** triggerable against another player, and raise UI/playability/fun.

## Inputs
- **Council (Grok):** persisted async pending-attack queue applied on defender's *next session* + immediate local simulation for attacker; server-authoritative reward grants with drop-table + pity + reveal ceremony; juice the crane-drop loop.
- **Advisor corrections:** (1) build the wreck queue but **strip large-population anti-grief frosting** (per-pair cooldowns/daily caps/targeting bands/shields/revenge) — the live pool is ~5 admins; invest in attacker-side felt experience instead. (2) **Reuse the existing sabotage groundwork** — don't build a third system. (3) Economy is already client-side localStorage — match that pattern; just be idempotent.
- **Web research:** variable-ratio rewards + rare reveal = engagement; async sabotage works, especially when the attacker *gains* and the defender is compensated, not just punished.

## Current state (grounded)
- `utils/coinManager.ts` → `addCoins(amount, reason, details?)` client-side localStorage; idempotency by caller breadcrumb (see `awardDailyCoins`). Coins are the sole currency (no shards). **Not wired into Word Tower.**
- `lib/wordTower/sabotage.ts` + `components/wordTower/useSabotage.ts` + `WordTowerSabotageBay.tsx` — full wrecking-ball UI (token chip, rival picker, CSS arc animation, toasts). **Built but UNMOUNTED.** Earns tokens on perfect-drop streaks only; hits are local-only (localStorage breadcrumb).
- `lib/wordTower/versus.ts` / `versusMatch.ts` (`bombDamage`, `applyBomb`, `damageTower`) — reusable damage math. Realtime versus is dormant groundwork.
- `app/api/word-tower/progress` (GET/POST upsert, monotonic trigger protects `best_*`), `leaderboard` (returns rival `playerId` + avatar + `bestHeightM`).
- No run-end modal; mode is **endless**. Zone detection: `biomeForHeight(heightM)`; achievements: `newlyUnlocked(stats, set)`.

## Design

### Part A — Tangible variable rewards (player actually gets coins)
Grant **real coins** (via existing `addCoins`) at incremental milestone events during a climb, with a satisfying variable reveal. No run-end gate needed (endless).

- **Pure module `lib/wordTower/towerReward.ts`** (TDD):
  - `rollTowerReward(event, ctx) → { coins, tier, isWreckCharge }` where `event ∈ {zone, achievement, pbMilestone, surprise}`. Tier ∈ `common|uncommon|rare|epic` via seeded RNG (reuse run seed) + base coins scaled by zone index / event.
  - **Pity:** `dryStreak` counter forces ≥`uncommon` after N (e.g. 8) commons. Pure, deterministic.
  - `rewardDedupeKey(playerId, source)` — stable key per (zone id | achievement id | PB-bucket) so refresh/re-entry never double-pays. Mirrors `awardDailyCoins` breadcrumb.
- **Granting:** in `WordTowerPlay`, on (new zone entered | new achievement unlocked | new PB 25m bucket crossed), call `addCoins(coins, 'wordtower_<source>', {...})` guarded by dedupe breadcrumb in localStorage.
- **Reveal UX:** lightweight `WordTowerRewardReveal` — coin count-up + rarity flash + particles, reusing existing FX vocabulary; respects reduced-motion. Wire existing `towerSurprise` "Windfall/Golden Floor" surprises to also drop coins so surprises become tangible.
- **Spend:** coins already spendable app-wide (reveal/retry costs). Optionally surface a "spend" hint; no new shop required this slice (YAGNI).

### Part B — Wrecking Ball (extend the existing sabotage system)
Rename the player-facing concept to **Wrecking Ball**; keep `sabotage.ts` internals, extend earning + add async persistence.

- **Earn (per user ask):** 1 charge on **entering a new height-zone** (first time this run) and 1 on **unlocking a new achievement**. Cap 3 (`SABOTAGE_TOKEN_CAP`). New pure `wreckingBallEarn(prevCharges, {zonesEntered, achievementsUnlocked}) → charges` (TDD). Keep perfect-streak as a secondary bonus path (optional).
- **Mount** `WordTowerSabotageBay` (relabeled) + `useSabotage` into `WordTowerPlay`, fed by rivals from `useWordTowerRivals`. This delivers the visible feature.
- **Trigger against another player (async raid, minimal):**
  - Attacker picks a rival from the picker → **immediate local simulation** (existing CSS wrecking-ball arc against the rival's cached ghost height) + persist a pending wreck.
  - **API `app/api/word-tower/wreck/route.ts`:** `POST {targetPlayerId, damageFloors}` → insert row in `word_tower_pending_wrecks` (rate-limited, auth, server clamps `damageFloors` to cap). `GET` → unapplied pending wrecks for the caller.
  - **Apply on session start** in `WordTowerPlay`: fetch pending; apply via `damageTower` to the **restored `current_state` only** (session debuff) — never `best_*` (monotonic trigger guarantees this); mark applied (idempotent); show a **Wreck Report** banner ("@rival wrecked your tower −N floors") + small **compensation** (+1 scramble or a few coins) so the defender feels paid, not just hit.
  - **Stripped (TODO seam, not built):** per-pair cooldowns, daily caps, targeting bands, shields, revenge pools — unjustified for a ~5-person pool. One server-side impact cap + idempotent apply is the whole fairness surface.
- **DB:** migration `word_tower_pending_wrecks` (`id, attacker_id, defender_id, damage_floors, reason, created_at, applied_at`). RLS: caller can insert (attacker) / read own (defender). **NOT** added to `supabase_realtime` publication (CLAUDE.md rule — read-on-session-start needs no realtime).

### Part C — Highest-leverage polish (scoped)
1. Reward reveal ceremony (Part A) — the biggest "I got something" upgrade.
2. Mounting the wrecking ball (Part B) — big visible feature.
3. Rival ghost presence: clearer "next rival" chip + tap-to-wreck affordance (reuse `NextRivalChip` + bay).
4. If budget allows: crane land impact dust + haptics on milestone; otherwise defer.

## Testing (TDD, pure-first)
- `towerReward.test.ts`: drop-table tiers, pity floor, dedupe keys, coin scaling monotonic.
- `wreckingBall.test.ts`: earn from zones/achievements + cap; async damage clamp; apply-to-restored-state never reduces below 0 and never touches PB.
- Route tests for `/api/word-tower/wreck` (auth, clamp, idempotent apply).
- Component: reward reveal renders count-up; bay mounts + fires earn on zone/achievement.

## Guardrails
- Keep admin gate (ship dark; flipping public is the user's call).
- Session-only debuff; never mutate PB/leaderboard.
- i18n ×5 (`wordTower.*`), RTL-safe.
- `npm run lint && test && build` green.

## Out of scope (seams left)
- Live socket versus. Real-money lootboxes. Cosmetic-shard currency. Large-population anti-grief. Revenge/retaliation pools.
