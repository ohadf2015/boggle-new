# Streak Heat — spec (rev 2)

Branch `feat/streak-heat`, worktree `.claude/worktrees/streak-heat`, off `origin/master@c36f62200`.

Rev 2 exists because rev 1 was wrong twice: it planned a calendar week (the reference is a rolling
7-day cycle) and it planned to build a weekly-chest + per-day-history system **that already ships**.

## What already exists (reuse, do not rebuild)

| Thing | Where |
|---|---|
| Server-authoritative 7-day cycle: `daysCompleted`, `completedDates[]`, `cycleStart`, `cycleNumber`, uncapped `currentStreak`, `isClaimable`, `projectedTier`, `claim()` | `hooks/useWeeklyChest.ts` + `app/api/daily/weekly-chest/{status,claim}` |
| Chest reveal with GSAP 3-act shake→burst→reveal, sounds, haptics, coin counter, badge | `components/daily/WeeklyChestModal.tsx` |
| Tier thresholds 1/3/7/14/30/60/100 + coin bonus % | `lib/streakTierRewards.ts` (`STREAK_TIERS`) |
| Per-day local completion | `getLastSevenDaysCompletion` (`utils/dailyChallenge/storage.ts:121`) |
| File-share with `canShare({files})` → `navigator.share` → text fallback | `shareImageWithNativeShare` (`utils/shareImageGenerator.ts:572`) |
| Per-card OG routes convention | `app/api/og/{challenge,room,word-hunt,boss-defeat,daily-rank}/route.tsx` |

So the cycle model, the reward, and the payout are **solved**. What is missing is everything the
user actually asked for: heat, visibility, mascots, and a share.

## Real gaps

1. **No heat.** Day 2 and day 200 render identically. No tier art, no escalating background.
2. **Barely visible.** `/daily` shows an inline `🔥 {n}` (`DailyHub.tsx:176`); home hides the streak
   entirely below `MIN_STREAK_TO_DISPLAY = 3` — hiding exactly the fragile 1–2 day streak most at risk.
3. **No share anywhere in the streak/chest flow** — zero viral loop on the app's best brag moment.
4. **Chest art is off-brand.** `/daily/chests/chest-{tier}.jpg` are stock-looking JPEGs, not the
   marshmallow mascot. The user explicitly asked that the gift screen's assets match the mascot.
5. **Shared artifact would be wrong.** `/api/og?streak=N` renders a flat 🔥 emoji card on navy.

## Assets (done — 8 files, `public/mascot/`)

Generated with `onfire-nobg.webp` as the character reference (nano-banana, `maintainCharacterConsistency`),
then cut to alpha by corner flood-fill (the art has a white sticker border, so the fill stops cleanly),
tight-cropped, padded 4%, resized 256×256 lossy WebP (19–37 KB each):

`streak-spark`, `streak-kindling`, `streak-inferno`, `streak-molten`, `streak-supernova`,
`streak-eternal`, `streak-chest-closed`, `streak-chest-open` (all `-nobg.webp`).

Same marshmallow, same sunglasses, same outline weight across all 8. `streak-eternal` was
regenerated once to remove baked-in caption text.

## Heat map — new file, does NOT touch `STREAK_TIERS`

`STREAK_TIERS` is the **win-streak** table (consumed by `utils/coinManager.ts`, `hooks/useWinStreak.ts`,
asserted by `lib/__tests__/streakTierRewards.test.ts`). Adding mascot fields there would also make
`lib/` import `components/ui/mascotData`. So: reuse its thresholds via `getStreakTier()`, put the art
in a separate map keyed by tier `id`.

`lib/streakHeat.ts`:
```ts
export interface StreakHeat {
  id: StreakTierConfig['id'];
  mascot: MascotVariant;
  from: string; to: string;   // bg gradient, hotter per tier
  ring: string;               // border/ring color
  ink: string;                // readable text on that gradient
  labelKey: string;
}
export function getStreakHeat(streak: number): StreakHeat;  // clamps 0 → starting
```

| tier | days | mascot | gradient |
|---|---|---|---|
| starting | 1–2 | `streakSpark` | dim amber `#7c4a12 → #b8791f` |
| hot | 3–6 | `streakKindling` | amber `#b8791f → #e8a020` |
| fire | 7–13 | `onfire` *(existing)* | orange `#e07a10 → #f5a623` |
| epic | 14–29 | `streakInferno` | deep orange `#d2500f → #f57c1f` |
| legendary | 30–59 | `streakMolten` | red-orange `#b02a0a → #ef4b17` |
| mythic | 60–99 | `streakSupernova` | violet plasma `#5b1e8a → #c026d3` |
| immortal | 100+ | `streakEternal` | gold `#8a6510 → #f0c020` |

## UI

1. `components/daily/streak/StreakHeatBadge.tsx` — tier mascot + count on the tier ring. Replaces the
   inline `🔥 {n}` in `DailyHub`; also mounted in `DailyChallengeBanner` (home). Tappable → card.
   Lower `MIN_STREAK_TO_DISPLAY` 3 → 1 so a new streak is visible while it's still fragile.
2. `components/daily/streak/StreakWeekRow.tsx` — the reference row. Labels are the **real** weekday of
   each cycle date (so a Thursday starter reads `Th Fr Sa Su Mo Tu We`, exactly like the screenshot),
   done days joined by one lit pill, slot 7 is the chest (closed → open when `isClaimable`).
   Direction-aware: order and pill flip under `?locale=he`.
3. `components/daily/streak/StreakHeatCard.tsx` — the reference screen: giant count, `day streak`,
   tier mascot on the tier gradient, week row, **`Show it off`** primary + `Continue`.
   Used by the badge-tap modal **and** as the visual template for the OG card.
4. `WeeklyChestModal` — additive changes only: chest art → `streak-chest-open-nobg.webp`, backdrop →
   tier heat gradient, and a **`Show it off`** button beside Continue. The GSAP timeline is untouched.

**No new interrupt.** `streaks.ts:74-82` deliberately demoted 7/14 for celebrating attendance;
a day-3 takeover would be that same mistake. `CELEBRATED_STREAK_MILESTONES` (30/100/365) stays as the
only auto-interrupt, the chest stays the weekly reward hand-off, and the heat card is **on-demand**
via the badge. That satisfies "more appealing + shareable" without reversing a documented call.

## Share

`app/api/og/streak/route.tsx` (new route, matching the per-card convention) — `?streak=N&tier=id&lang=`
→ tier gradient + tier mascot + big count + `day streak`, i.e. the same composition as `StreakHeatCard`.
Satori cannot rasterize animated WebP and needs absolute URLs, so export static frame-0 PNGs to
`public/og/streak-{tier}.png` with the same PIL pipeline.

`utils/streakShare.ts` → `shareStreak({ streak, tierId, t })`: fetch that PNG → blob →
`shareImageWithNativeShare(...)` (reusing its existing File/canShare/text fallback chain).

## Out of scope (stated, not silently dropped)

- **Not** reconciling the three parallel streak counters (daily localStorage / retention localStorage /
  server `player_engagement`). Real bug, far wider blast radius — separate PR.
- **Not** deleting the 4 orphaned streak components (`daily/StreakFlame`, `landing/StreakCounter`,
  `engagement/StreakBar`, `cinematics/StreakMilestoneCinematic`) — unrelated to this change.
- Animated (multi-frame) versions of the 6 new mascots — static stickers ship; the existing `onfire`
  stays animated. Upgrade path noted in code.

## Tests (TDD, RED first)

- `lib/__tests__/streakHeat.test.ts` — every tier id maps to a heat entry + a registered `MascotVariant`;
  boundaries 0/1, 2/3, 6/7, 13/14, 29/30, 59/60, 99/100.
- `StreakWeekRow.test.tsx` — 7 slots; weekday labels follow `cycleStart`, not Monday; chest in last slot;
  lit pill spans only completed days; **RTL order flips**.
- `StreakHeatCard.test.tsx` — renders count + tier mascot; `Show it off` invokes the share handler.
- `streakShare.test.ts` — falls back to text share when `canShare({files})` is false.
- `app/api/og/streak/route.test.ts` — 200 + `image/png`, unknown tier falls back to `starting`.
- i18n: new keys in all 5 locales (en/he/sv/ja/es).
