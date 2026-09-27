# Daily Weekly Chest + Insight Cards — Design Spec

**Date:** 2026-05-12  
**Status:** Approved  
**Scope:** Daily challenge engagement layer — weekly chest progress, chest opening ceremony, and daily insight cards

---

## Overview

Add a repeating weekly engagement loop to daily challenges: a visible 7-slot progress bar fills as players complete dailies each day, and on day 7 a tiered chest opens with coins + a badge. Insight cards in the results screen surface personal stats (speed delta, percentile, personal bests) in a fun, motivating way. Uses GSAP animations, Lucide icons, generated chest/badge images, and wired sound effects.

---

## Goals

- Make streak progress visible and addictive (like Clash Royale chest slots)
- Reward a completed week with a dramatic, satisfying opening ceremony
- Surface meaningful per-player stats after every daily so players feel their progress
- Drive daily return visits — the chest progress bar is always one click away on the hub

---

## What's NOT in scope

- Cosmetic item inventory (no new cosmetics, only coins + badge)
- Guest player chest rewards (logged-in players only)
- Retroactive cycle credit for past completions before this feature ships
- Streak freeze interaction with chest cycle (freeze does NOT count as a completion)

## Relationship to existing `daily_rewards.ts`

The existing `dailyRewards.ts` system grants coins + badges based on consecutive **login streak days** (100 coins + `weekly_warrior` badge at day 7). The new weekly chest tracks **puzzle completion cycles** — 7 distinct days with at least one daily puzzle finished. These are two separate systems:

- Login streak badge at day 7: keep as-is, unmodified
- Weekly chest at 7 completions: new system, different badge IDs (`badge_weekly_bronze/silver/gold`), higher coin amounts reflecting effort

No double-badge scenario: badge IDs are distinct. Coin stacking is intentional — completing 7 puzzles is harder than logging in 7 days.

---

## Data Model

### New table: `daily_weekly_chests`

Models after existing `blast_chests` table pattern.

```sql
CREATE TABLE public.daily_weekly_chests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     uuid NOT NULL REFERENCES auth.users(id),
  cycle_start   date NOT NULL,
  cycle_number  integer NOT NULL,  -- 1st chest, 2nd chest, etc.
  tier          text NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  contents      jsonb NOT NULL,    -- { coins: 300, badge_id: 'weekly_silver_7' }
  opened_at     timestamptz,       -- null = pending claim, set = claimed
  created_at    timestamptz DEFAULT now(),
  UNIQUE (player_id, cycle_start)
);
```

### Cycle progress (no new table)

Progress is computed at query time by counting distinct `puzzle_date` values for `player_id` in the last 7 calendar days across:
- `daily_puzzle_attempts`
- `daily_word_hunt_attempts`
- `daily_word_wheel_attempts`

Any one completion per day counts (mode-agnostic). This avoids a separate streak table and stays accurate when modes are added.

### Chest tier formula

Computed server-side on day-7 completion:

| Mode | Performance signal |
|---|---|
| Word Hunt | `efficiency_score` (already stored) |
| Word Wheel | `score / NULLIF(time_seconds, 0) * 60` (score-per-minute) |
| Classic puzzle | `score / NULLIF(time_seconds, 0) * 60` |

`week_score` = average of all available daily scores across the 7 days, normalized 0–100.

| `week_score` | Tier | Coins | Badge |
|---|---|---|---|
| < 40 | Bronze | 150 | `badge_weekly_bronze` |
| 40–70 | Silver | 300 | `badge_weekly_silver` |
| > 70 | Gold | 600 | `badge_weekly_gold` |

---

## API Routes

### `GET /api/daily/weekly-chest/status`

Returns cycle progress and claimable chest for the authenticated player.

```ts
Response: {
  cycleStart: string          // ISO date of cycle day 1
  cycleNumber: number         // which chest this will be (1, 2, 3…)
  completedDates: string[]    // ISO dates of days completed this cycle
  daysCompleted: number       // 0–7
  isClaimable: boolean        // day 7 done + opened_at is null
  pendingChest?: {
    tier: 'bronze' | 'silver' | 'gold'
    coins: number
    badgeId: string
  }
}
```

### `POST /api/daily/weekly-chest/claim`

Atomically sets `opened_at`, grants coins to player wallet, unlocks badge. Idempotent — returns 409 if already claimed.

```ts
Response: {
  tier: string
  coins: number
  badgeId: string
  cycleNumber: number
}
```

### `GET /api/daily/insights`

Returns up to 3 insight cards for today's completed daily. Computed from attempt + leaderboard tables, no new storage.

```ts
Response: {
  insights: Array<{
    type: 'personal_best' | 'percentile' | 'speed' | 'first_try' | 'streak_complete' | 'improved'
    headline: string    // i18n key resolved server-side
    sub: string         // i18n key resolved server-side
    lucideIcon: string  // icon name: 'Trophy' | 'Zap' | 'Gauge' | 'Target' | 'Flame' | 'TrendingUp'
    tier?: 'positive' | 'neutral'  // card accent color
  }>
}
```

### Submission route hook (existing routes)

After persisting each daily attempt, check: is today the 7th distinct completion in the current cycle? If yes → compute `week_score`, insert into `daily_weekly_chests`, include `{ chestReady: true, tier }` in submit response so the client can immediately update the hub card CTA.

---

## UI Components

### `WeeklyChestCard` (hub page)

Location: `/app/[locale]/daily/page.tsx` — above mode tiles, always visible for logged-in players.

```
┌─────────────────────────────────────────────────────┐
│  [Calendar icon] WEEKLY CHEST          Day 4 of 7   │
│                                                     │
│  [✓] [✓] [✓] [✓] [○] [○]  [🎁 locked]             │
│  Mon  Tue  Wed  Thu  Fri  Sat   Sun                 │
│                                                     │
│  "3 more days to unlock your Silver Chest!"         │
└─────────────────────────────────────────────────────┘
```

**Animations:**
- On mount: dots stagger in `gsap.from({ scale: 0, opacity: 0 }, { stagger: 0.08 })`
- Each filled dot: `<CheckCircle2 />` in electric lime, pop sound (`pop.mp3`) staggered
- Empty dot: `<Circle />` muted navy
- Day 7 reached: chest icon pulses `gsap.to({ scale: 1.05, yoyo: true, repeat: -1, duration: 0.8 })` + `<LockOpen />` swap + shake `chest-shake.mp3`
- CLAIM button: `gsap.from({ y: 20, opacity: 0, ease: 'back.out' })` on appear

**Icons:** `<Calendar />` header, `<CheckCircle2 />` filled days, `<Circle />` empty days, `<Lock />` / `<LockOpen />` chest state.

---

### `WeeklyChestModal` (portal overlay, day-7 claim)

Full-screen overlay. Three-act GSAP sequence:

**Act 1 — Suspense (0–1.2s)**
- Chest image (`/public/daily/chests/chest-{tier}.png`) center screen
- `gsap.to({ rotation: "±5deg", yoyo: true, repeat: 6, duration: 0.15 })`
- Background: dark overlay fades in
- Sound: `suspense-rumble.mp3`

**Act 2 — Burst (1.2–2.0s)**
- Lid: `gsap.to({ y: -220, rotation: -45, opacity: 0, duration: 0.6 })`
- Light rays: CSS conic-gradient div, `gsap.fromTo({ scale: 0, opacity: 0.8 }, { scale: 3, opacity: 0 })`
- Coin shower: 20 `<Coins />` icons scatter via random `gsap.to({ x, y, rotation, opacity: 0 })`
- Sound: `chest-open.mp3` then `coins.mp3` (100ms delay)

**Act 3 — Reveal (2.0–3.5s)**
Three items pop in staggered `gsap.from({ scale: 0, ease: 'back.out(1.7)', stagger: 0.2 })`:
1. `<Coins />` + coin counter animating 0 → final amount
2. Badge image (`/public/badges/weekly/badge-{tier}.png`) with `<Award />` placeholder until loaded
3. Tier label: "Silver Week · Score 58"

- Sound: `fanfare.mp3` on Act 3 start
- Tap/click to dismiss after 3.0s (enforced minimum)

---

### `DailyInsightStack` (results screen)

Location: inserted above attempt history in `DailyWordHuntResults` and `WordWheelResults`.

Horizontal swipeable strip. Max 3 cards. Each card: 160×80px, neo-brutalist border, mode-accent background.

**Insight card types:**

| `type` | Icon | Headline | Sub-line |
|---|---|---|---|
| `percentile` | `<Zap />` | "Elite today!" | "Top 10% of all players" |
| `personal_best` | `<Trophy />` | "New personal best!" | "+23 pts vs your record" |
| `speed` | `<Gauge />` | "Speed demon!" | "40% faster than your avg" |
| `first_try` | `<Target />` | "First try!" | "Only 8% solved it in 1" |
| `streak_complete` | `<Flame />` | "Week complete!" | "Chest is ready to claim" |
| `improved` | `<TrendingUp />` | "Getting sharper!" | "Better than yesterday" |

**Animations:**
- Cards slide in: `gsap.from({ x: 60, opacity: 0 }, { stagger: 0.15 })`
- Icon: `gsap.from({ scale: 0, rotation: -20, ease: 'back.out(2)' })`
- Sound: `insight-chime.mp3` per card (staggered 150ms)
- Touch drag via Framer Motion `drag="x"` with `dragConstraints`

---

## Sound Assets

All files ≤ 2 seconds. Load lazily on modal open / card appear. Respect system mute and `prefers-reduced-motion` (skip sounds + skip GSAP animations when reduced motion is on).

| File | Event |
|---|---|
| `/public/sounds/daily/pop.mp3` | Each streak dot filling in on mount |
| `/public/sounds/daily/chest-shake.mp3` | Chest shaking on day 7 |
| `/public/sounds/daily/chest-open.mp3` | Chest lid flying off |
| `/public/sounds/daily/coins.mp3` | Coin shower |
| `/public/sounds/daily/fanfare.mp3` | Final reveal |
| `/public/sounds/daily/insight-chime.mp3` | Insight card appearance |

**Sound sourcing:** Use royalty-free assets from [freesound.org](https://freesound.org) (CC0/CC-BY license) or generate via the `fal-ai` MCP sound generation tool during implementation. All files must be ≤ 50KB after compression to mp3 at 44kHz/128kbps.

Sound loading: use existing `useSound` hook pattern if present, else Web Audio API `AudioContext` with lazy `fetch` + `decodeAudioData`.

---

## Generated Images

Three chest images + three badge images generated during implementation via `mcp-image`. Style: **neo-brutalist pixel art, dark navy (#0a0a1a) background, hard 3px pixel drop shadows, electric accent colors, no gradients, no glassmorphism**.

| File | Prompt notes |
|---|---|
| `chest-bronze.png` | Bronze chest, warm #cd7f32 bands, pixel star, dark navy (#1a1a2e) bg, hard 3px pixel shadows, no gradients |
| `chest-silver.png` | Silver chest, #c0c0c0 metal, pixel gem, same neo-brutalist style |
| `chest-gold.png` | Gold chest, `neo-yellow` (#FFE135) glow (project's semantic celebration color), pixel crown |
| `badge-weekly-bronze.png` | Shield frame, `<Star />` icon, bronze palette, hard pixel shadows |
| `badge-weekly-silver.png` | Shield frame, `<Gem />` icon, silver palette |
| `badge-weekly-gold.png` | Shield frame, `<Crown />` icon, `neo-yellow` (#FFE135) palette |

**Color system note:** Gold tier must use the project's `neo-yellow` (#FFE135), not generic `#ffd700`. Per design system, `neo-yellow` is semantically reserved for celebration/gold rewards — this is the correct use.

Saved to `/public/daily/chests/` and `/public/badges/weekly/`.

---

## Component File Tree

```
fe-next/
├── components/daily/
│   ├── WeeklyChestCard.tsx        NEW
│   ├── WeeklyChestModal.tsx       NEW
│   ├── ChestProgressDots.tsx      NEW
│   ├── DailyInsightStack.tsx      NEW
│   └── InsightCard.tsx            NEW
├── app/api/daily/
│   ├── weekly-chest/
│   │   ├── status/route.ts        NEW
│   │   └── claim/route.ts         NEW
│   └── insights/route.ts          NEW
├── hooks/
│   └── useWeeklyChest.ts          NEW
└── public/
    ├── daily/chests/              NEW (3 images)
    ├── badges/weekly/             NEW (3 images)
    └── sounds/daily/              NEW (6 audio files)
```

---

## i18n Keys Required

All 5 locales (en, he, sv, ja, es). Hebrew = RTL.

```
daily.weeklyChest.title
daily.weeklyChest.dayProgress        // "Day {day} of 7"
daily.weeklyChest.daysRemaining      // "{n} more days to unlock your {tier} Chest!"
daily.weeklyChest.claimButton        // "Claim Chest"
daily.weeklyChest.tierBronze
daily.weeklyChest.tierSilver
daily.weeklyChest.tierGold
daily.weeklyChest.revealLabel        // "{tier} Week · Score {score}"
daily.insights.percentile.headline
daily.insights.percentile.sub        // "Top {n}% of all players"
daily.insights.personalBest.headline
daily.insights.personalBest.sub      // "+{n} pts vs your record"
daily.insights.speed.headline
daily.insights.speed.sub             // "{n}% faster than your avg"
daily.insights.firstTry.headline
daily.insights.firstTry.sub          // "Only {n}% solved it in 1"
daily.insights.streakComplete.headline
daily.insights.streakComplete.sub
daily.insights.improved.headline
daily.insights.improved.sub          // "Better than yesterday"
```

---

## Accessibility

- Chest modal: focus-trapped, `role="dialog"`, `aria-label`
- Progress dots: `role="list"`, each dot `aria-label="Day {n}: {completed|pending}"`
- Animations: all GSAP timelines wrapped in `window.matchMedia('(prefers-reduced-motion: reduce)')` check — skip to end state if true
- Sounds: skip entirely on reduced motion

---

## Testing

- Unit: `useWeeklyChest` hook — cycle computation, tier calculation, claim idempotency
- Unit: `DailyInsightStack` — renders correct card types, max 3, swipe behavior
- Integration: submit route hook → chest row created on day 7
- Integration: claim route → 409 on double claim, coins awarded once
- E2E: not required for MVP

---

## Out of scope / deferred

- Partial-week bonus (played 5 of 7 but not streak) — future enhancement
- Push notification on day 6 "One more day!" — separate notification sprint
- Animated chest on mobile native (Capacitor) — web-only for now
- Leaderboard of "most chests opened this month" — future social feature
