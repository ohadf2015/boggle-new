# Economy Balance Audit — 2026-04-22

Source: CCGS `ccgs-balance-check` scan of `fe-next/src/lib/economy/`, `coinManager.ts`, loot configs, mission configs.

## Earn Sources

| Source | Amount | Condition | Est./Day |
|--------|--------|-----------|----------|
| Daily login base | 25 | Show up | 25 |
| Efficiency bonus | ≤50 (score/2, EFFICIENCY_MULTIPLIER=0.5) | Score-gated | ~25 |
| Streak bonus | 10×streak_days | Login streak | 0–1000 |
| Streak tier multiplier | 5–50% all earnings | Days 3/7/14/30/60/100 | varies |
| Daily login milestone | 100–2500 | Days 7/14/30/60/100 | infrequent |
| Adventure loot chest | (10+worldId×3)×stars | Level clear (cap world 10) | 130–580/session |
| Adventure daily quests | 50–180 each + 50 bonus | 3 quests/day | 200–590 |
| Adventure streak milestone | 50/150/300/500 | Days 3/7/14/30 | infrequent |
| Combo coins | 5–20 | Combos 5/10/15/20 | ~10–40 |
| Multiplayer game | 15 + score/10, win+25, top3+10, cap 500 | Per game | ~50–150 |
| Singleplayer game | 10 + score/10, win+25, cap 500 | Per game | ~35–100 |
| Watch ad | 250 | Ad view | ~250 |
| Duel win | **0** | Win ranked match | 0 |
| WOTD completion | **0** | Complete WOTD | 0 |
| First win of day | **0** | First MP win | 0 |
| Grand Slam | **0 coins** (500 XP only) | All daily missions | 0 |

## Sinks

| Sink | Cost |
|------|------|
| Reveal letter (5+) | 60 |
| Daily retry | 200 |
| Reveal target word | 250 |
| Streak recovery | 500 |
| board-dark skin | 50 |
| tile-wooden skin | 100 |
| Adventure upgrades | 40–500 per tier |

Effective paid cosmetic total: **150 coins**.

## Ratios

- Active casual (no streak): ~150 coins/day, 3 days to first cosmetic.
- 100-day streak player: ~1,575 coins/login. All cosmetics in <1 session. **10:1+ earn:sink ratio** — no scaling sink.

## Degenerate Strategies

1. **Streak grind dominates.** `STREAK_BONUS=10×days` × `STREAK_TIERS` multiplier compounds. Gameplay earn becomes irrelevant for veterans.
2. **Ad farming uncapped.** `WATCH_AD=250`. No daily cap in `coinManager` or `/api/coins` route. `MAX_COIN_AWARD=2000` caps single POST only.
3. **Daily quests world-invariant.** World-1 player earns same as world-10. No difficulty scaling.

## Outliers

- **High:** Day-100 milestone 2,500 coins = 50× cheapest sink.
- **High:** Ad (250) = reveal-word sink (250). Ads trivially fund routine sinks.
- **Low:** Grand Slam = 0 coins (median quest ~115).
- **Low:** 20-combo = 20 coins, negligible vs streak income.

## Broken Pipelines

| Feature | File | Issue |
|---|---|---|
| Duel/ranked | `gameResults.ts` | Calls `emitXpEvents`, never awards coins |
| WOTD | `wordOfTheDayManager.ts` | No coin/XP path exists |
| First-win-of-day | `useFirstWinCelebration` | Confetti only, no coin transfer |
| Grand Slam | `dailyMissionsManager.ts:47` | `GRAND_SLAM_XP=500`, no `GRAND_SLAM_COINS` |
| goldMultiplier | `lootConfig.ts` | Applies to `baseGold+perfectBonus` only, skips `bonusGold`/`bossBonus`/`luckyBonus` |

## Priority Fixes

1. **Wire 4 dead earn sources** (duel/WOTD/first-win/Grand Slam) — players completed actions expecting rewards. Silent breakage.
2. **Ad daily cap** — `/api/coins/route.ts`, track per-user ad count, cap 5/day = 1250 coins.
3. **Streak bonus curve flattening** — replace linear `10×days` with logarithmic or tier-capped formula.
4. **Scaling sinks** — add premium cosmetics (500–5000 coins) or consumable boosters to absorb veteran earnings.
5. **goldMultiplier scope** — apply to full chest total, not partial.
