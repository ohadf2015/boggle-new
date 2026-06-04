# Player Rewards Audit — 2026-06-04

Full sweep of every reward LexiClash promises a player: does it **function** end-to-end, and does the player **feel** it land? Two axes, because a reward that credits silently is almost as broken as one that never credits.

North star for "feel": the **Weekly Chest** (`components/daily/WeeklyChestModal.tsx`) — 4-act shake→burst→reveal→count-up with sound + haptic. Every other reward is measured against it.

---

## Severity buckets

### 🔴 BROKEN — promised but not delivered

| Reward | Evidence | Fix |
|---|---|---|
| **Daily Mode Quest coins** (play Blast+ClassicMp+WordHuntMp → 50–150 coins) | `DailyModeQuestCard.tsx` calls `claimReward()` (marks `claimed:true` in localStorage, returns a number) then only `setRewardAmount(coins)`. **Never** calls `CoinContext.addCoins`. No server endpoint grants them either. Player sees "You earned 100 coins!" and balance is unchanged. | Wire `addCoins(reward, reason)` after non-null `claimReward()`. `claimed:true` set synchronously → idempotent, no double-grant. ✅ shipped this pass. |

### 🟠 WEAK FEELING — functions, but invisible to the player

| Reward | What works | What's missing |
|---|---|---|
| **Streak Freeze (consume)** | Earn paths solid (ad/calendar/comeback/chest). Server auto-consumes a freeze to bridge a missed daily in `wordHuntRoutes.ts:404-417`, records to `daily_streak_freezes`, decrements pool. | **No "your streak was saved!" moment.** `StreakFreezeIndicator` (results) reads steady-state `isProtected` from `/api/streak` → passive blue box, fires/looks identical every day. The *consume event* is never surfaced. **This is the user's exact complaint.** ✅ fixed this pass: thread `freezeBridged` out of the submit response, one-shot cyan frost celebration keyed off the event. |
| **Multiplayer game XP** | Calculated correctly (`backend/modules/xpManager.ts`). Shown via `XpBreakdownCard`/`ConsolidatedPlayerCard` when `xpGainedData` is populated. | Verified NOT-a-gap — the UI exists and is conditional on data. |
| **Grand Slam bonus** (all 3 daily missions) | Coins (200) granted server-side (`dailyMissionsManager.checkAndClaimGrandSlam`). | Toast (fired via the decoupled `markCelebrated` path) showed "+500 XP" only — coin amount never surfaced. ✅ fixed: mirror `goldReward:200` in the toast (matches existing `xpReward:500` hardcode pattern). |
| **Combo milestone coins** | `CoinContext.awardComboMilestone()` routes through `addCoins`→toast IF called. | `awardComboMilestone()` is **orphaned — 0 callers**. Wiring it is a feature-add, not a fix. Deferred. |
| **Prestige unlock** (level 100) | `PrestigeModal` exists, multiplier scaling works. | Manual-trigger BY DESIGN (no auto-pop). NOT-a-gap. |
| **Adventure loot drops** | Persisted to `player_inventory` via `app/api/adventure/complete/lootInventory.ts` upsert. | NOT-a-gap — fully granted. |

### 🟢 STRONG — functions and feels good (no action)

- **Weekly Chest** — best-in-class (north star).
- **Level-Up celebration** — `LevelUpCelebration.tsx` GSAP flash→badge→number→rewards + confetti + mascot.
- **Coin earn toast** — every `addCoins` fires a lime neo-pop pill with reason.
- **Achievement unlock** — toast + sound + tier-scaled confetti (Bronze→Platinum).
- **TV Results awards + player spotlights** — 14 awards / 17 archetypes, seeded variety, animated reveal.
- **Admin gifts** — server-granted, modal reveal.
- **Rewarded ad (AdMob native)** — robust grant + burst + toast. (Web = intentional placeholder, no provider.)
- **Daily login streak coins** — granted (auth), toast feedback.

---

## Shipped this pass (TDD, tsc0/lint0/build0, 33 tests)

1. **Daily Mode Quest coin grant** — `DailyModeQuestCard.tsx` now calls `useCoinContext().addCoins(coins, t('dailyQuest.title'), {source})` after a non-null `claimReward()`. The credit also produces the lime coin-pop (addCoins fires coinEarnToast internally).
2. **Streak-saved moment** — backend `wordHuntRoutes.ts` now returns `freezeBridged`/`freezesRemaining` from the submit (one-shot consume event). `useResultSubmission` fires a new `onFreezeBridged` callback. New `StreakSavedCelebration.tsx` (cyan frost confetti, ShieldCheck, mirrors the milestone modal). i18n `streak.saved.*` ×5. Keyed off the EVENT, never steady-state `isProtected`.
3. **Grand Slam coin visibility** — `useDailyMissions.ts` toast now passes `goldReward:200` so the player sees the coins they already earn server-side.

## Open / deferred (not this pass)

- **Combo milestone coins** — `awardComboMilestone()` orphaned (0 callers); wiring requires balance/UX design.
- **Guest streak-freeze parity** — `updateDailyStreakWithFreeze()` (client) is tested but never called; only Word Hunt server-submit consumes freezes. Guests can earn but never use. Saved-moment lives where the consume lives.
- **Season end-of-season ladder payouts** — computed server-side, no claim UI.
- **Battle pass → Supabase sync** — currently localStorage-only.
- **Production-web rewarded ads** — no fill; placeholder by design.

## Assets

Built from existing on-brand infra (`confettiUtils`, `SharedFxApp.spawnBurst`, Pixi `WheelRushCelebration`), **not** generated raster — CLAUDE.md anti-references soft gradients/glassmorphism, and a glowy AI-ice-shield would clash with the flat neo-brutalist `/daily/chests/*.jpg` style.
