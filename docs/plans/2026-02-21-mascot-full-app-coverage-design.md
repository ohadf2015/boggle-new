# Mascot Full-App Coverage Design

**Date:** 2026-02-21
**Approach:** Direct contextual placement
**Scope:** All 12 unused variants + DJMascot + Word Hunt Daily Challenge zero-coverage gap

---

## Problem

20 animated GIF mascot variants exist. Only 8 are placed in the UI. `DJMascot` component is fully built but never imported anywhere. The Daily Word Hunt challenge — the app's primary daily engagement loop — has **zero mascot presence**. Lexi should feel alive and reactive everywhere.

## Goal

Every emotional beat in the app has the right Lexi variant. Versatile personality: panic when stressed, flex when winning, explore when starting, cry when losing, mindblown at discoveries.

---

## Mascot System Reference

**Components:**
- `<Mascot variant={V} size={S} animated />` — base, 20 variants
- `<CelebrationMascot variant="trophy|celebration" />` — winning screens
- `<CelebrationMascotWithEntrance />` — with spring pop-in
- `<DJMascot />` / `<DJMascotWithEntrance />` — lobby
- `<InteractiveMascot />` — hover/click interactive
- `<IdleMascot />` — random activity cycling

**All GIFs:** `/mascot/{variant}-nobg.gif` — always use `unoptimized` on `<Image>`

---

## Placement Map (all 12 unused + DJ)

### Word Hunt Daily Challenge

| File | Trigger | Variant | Size | Notes |
|---|---|---|---|---|
| `DailyReadyScreen.tsx` | Page load | `explorer` | `lg` | Pre-game hype |
| `DailyChallengeGame.tsx` | Timer < 30s | `panic` | `sm` | Conditional swap |
| `DailyChallengeGame.tsx` | Combo ≥ 3 | `onfire` | `xs` | Near combo display |
| `DailyWordHuntResults.tsx` | Score ≥ 60% | `flexing` | `lg` | Result hero |
| `DailyWordHuntResults.tsx` | Score < 40% | `encouraging` | `sm` | Near missed words |
| `StreakMilestoneCelebration.tsx` | Modal open | `celebration` | `xl` | Modal center |

### Multiplayer

| File | Trigger | Variant | Size | Notes |
|---|---|---|---|---|
| `MultiplayerLobby.tsx` | Always | `dj` (DJMascot) | `md` | Lobby header |
| `WaitingScreen.tsx` | 0–10s waiting | `bored` | `md` | Replaces/adds to existing InteractiveMascot wait |

### Blast Mode

| File | Trigger | Variant | Size | Notes |
|---|---|---|---|---|
| `BlastGameLayout.tsx` | Power-up activated | `powerup` | `sm` | Brief flash overlay |

### Adventure Mode

| File | Trigger | Variant | Size | Notes |
|---|---|---|---|---|
| `UpgradeShop.tsx` | Shop header always | `shopkeeper` | `md` | Decorative |
| `TvBroadcastView.tsx` | Spectator banner | `spectating` | `sm` | SpectatorBanner area |

### Global / Shared

| File | Trigger | Variant | Size | Notes |
|---|---|---|---|---|
| `NoWordsFoundView.tsx` | Zero words result | `crying` | `lg` | Empty state |
| `AchievementProgressTracker.tsx` | Near milestone (≥80%) | `mindblown` | `xs` | Progress tracker |

---

## Trigger Constants (`mascotConfig.ts`)

```ts
export const MASCOT_TRIGGERS = {
  PANIC_TIMER_THRESHOLD: 30,       // seconds remaining
  ONFIRE_COMBO_THRESHOLD: 3,       // combo level
  FLEXING_SCORE_THRESHOLD: 0.6,    // fraction of words found
  ENCOURAGING_SCORE_THRESHOLD: 0.4,// fraction of words found
  MINDBLOWN_PROGRESS_THRESHOLD: 80,// percent toward achievement
} as const;
```

---

## Team Agent Domains

### Frontend Engineer
- Create `utils/mascotConfig.ts` with trigger constants
- Wire `DJMascot` into `MultiplayerLobby`
- Add `explorer` to `DailyReadyScreen`
- Add conditional `panic`/`onfire` to `DailyChallengeGame`
- Add `flexing`/`encouraging` to `DailyWordHuntResults` based on score %
- Add `celebration` to `StreakMilestoneCelebration`
- Add `shopkeeper` to `UpgradeShop`
- Add `crying` to `NoWordsFoundView`
- Add `mindblown` to `AchievementProgressTracker`
- Add `spectating` to TV broadcast spectator area
- Add `powerup` flash to `BlastGameLayout`

### Game Designer
- Define score threshold semantics (when is 60% "good"?)
- Define combo threshold (3 feels right for casual, verify)
- Define streak milestone emotional arc (7d, 30d, 100d all feel different — same mascot?)
- Produce `MASCOT_TRIGGERS` constant values in `mascotConfig.ts`
- Verify `DailyWordHuntResults` has accessible score percentage prop

### Motion Expert
- Audit GIF + CSS animation pairing for each new placement
- `panic` GIF: fast internal — CSS should NOT add slow bob (conflict). Use matching rapid jitter.
- `onfire` GIF: upward energy — CSS scale pulse works, don't add slow oscillation
- `explorer` GIF: adventure walk — lateral sway CSS fits
- `shopkeeper` GIF: idle lean — gentle bob CSS works
- `crying` GIF: heaving motion — slow CSS bob is complementary
- `mindblown` GIF: dramatic pop — CSS scale burst then hold
- Ensure all new placements respect `useDevicePerformance()` reduced motion

---

## Testing Requirements (TDD)

Each new placement needs a test:
- Renders correct variant at correct trigger state
- Does NOT render at wrong trigger state (conditional variants)
- Respects reduced motion (mock `useDevicePerformance`)
- RTL layout not broken (run with `locale=he`)

Pattern: mock `useDevicePerformance`, render with trigger state props, assert `data-testid` or `alt` text.

---

## File Change List

**New files:**
- `fe-next/utils/mascotConfig.ts`

**Modified files:**
- `fe-next/components/multiplayer/MultiplayerLobby.tsx`
- `fe-next/components/daily/DailyReadyScreen.tsx`
- `fe-next/components/daily/DailyChallengeGame.tsx`
- `fe-next/components/daily/DailyWordHuntResults.tsx`
- `fe-next/components/daily/StreakMilestoneCelebration.tsx`
- `fe-next/components/game/WaitingScreen.tsx`
- `fe-next/components/blast/BlastGameLayout.tsx`
- `fe-next/components/adventure/meta/UpgradeShop.tsx`
- `fe-next/components/results/NoWordsFoundView.tsx`
- `fe-next/components/achievements/AchievementProgressTracker.tsx`
- `fe-next/host/components/TvBroadcastView.tsx`

**New test files:**
- Per component, collocated in `__tests__/`

---

## Acceptance Criteria

- [ ] `DJMascot` appears in `MultiplayerLobby` — no longer orphaned
- [ ] Daily Word Hunt has mascots at: ready, in-game (timer & combo), results (win/lose), streak modal
- [ ] All 20 variants are placed somewhere in the app
- [ ] All placements respect `prefersReducedMotion`
- [ ] All GIF animations complement (not fight) their CSS animation wrapper
- [ ] RTL layout unbroken
- [ ] `npm run lint && npm run test && npm run build` all pass
