# MP Desktop Polish & Personality — Design Spec

**Date:** 2026-05-08
**Status:** approved (in flight)
**Predecessor:** 2026-05-04 MP Desktop Fun chassis (shipped 2026-05-05 as `MultiplayerDesktopShell`)
**Scope:** All MP-vs-human boards (Classic, Wheel Rush, Word Hunt, Blast)

## Context

`MultiplayerDesktopShell` chassis shipped 2026-05-05. 391 LOC total, three adapters
(Classic / Wheel Rush / Word Hunt), bare-bones Tailwind cards, no per-mode personality,
no juice, side-rail meters wired to placeholder data. Viewport audit 2026-05-02 C1
(desktop = mobile-stacked) was technically closed by the shell mount, but the
delivered surface is still visually thin.

This spec adds three orthogonal layers on top of the existing chassis:
**personality**, **juice**, **info-density**. Plus the missing Blast adapter.

## Non-goals

- Mobile layout changes
- Solo modes (Connections, WordCraft, Adventure, Daily, Brain)
- Backend / scoring / netcode changes
- New kill-switch flag (existing `mp.desktop-shell.v1` continues to gate all of this)

## Architecture

No structural change. Every enhancement plugs into existing `ShellSlots`
(left.modeBadge / left.roster / left.secondary / center / right.wordsLadder /
right.activityStream / right.chat). Adapter API stays additive — new optional
props default to `null` so existing call sites keep working until updated.

### New mode theme map — `lib/multiplayer/desktopThemes.ts`

| Mode | Color family | Mascot pose | Texture | Header tape | Icon |
|---|---|---|---|---|---|
| classic | `cyan` | focused | halftone-dots | "STANDARD" | grid |
| wheel-rush | `pink` | excited | radial-burst | "WHEEL RUSH" | spin |
| word-hunt | `purple` | curious | dotted-target | "WORD HUNT" | target |
| blast | `lime` | wild | confetti-scatter | "BLAST" | dynamite |

Note: kept `pink` for wheel-rush (already in shipped code) and gave Blast its
existing `lime` color-power family. Brand-coherent.

### New visual primitive — `ThemedPanel`

```tsx
<ThemedPanel mode="blast" variant="rail" header="ROSTER" />
```

Renders neo-border in mode color, halftone overlay (opacity 0.06 max),
`shadow-hard-lg`, optional tape-strip header label, RTL-safe via logical props.
Replaces raw `border-2 border-foreground bg-card` divs across all adapters.

### Universal primitives — `components/multiplayer/desktop/insights/`

| Primitive | Data source | Slot |
|---|---|---|
| `MyStatsCard` | derived from `foundWords` | left.secondary |
| `OpponentInsightFeed` | new `opponentWords` prop (driven by `useOpponentWordFeed`) | right.activityStream |
| `PaceDeltaChip` | derived from `leaderboard` + `meId` | right.activityStream (header) |
| `ScoreTickChip` | RosterRail row diff watcher (no new prop) | absolute floats inside RosterRail |

### Mode-specific primitives

- `SpinCounter` (wheel-rush) — current spin / total
- `RarityHeatChip` (wheel-rush) — last word rarity tier
- `CategoryBanner` (word-hunt) — active category name (replaces the existing target chip)
- `HuntProgressMeter` (word-hunt) — words found in category / target

### Blast adapter — NEW

`components/multiplayer/desktop/BlastDesktopAdapter.tsx` mirrors existing pattern.

Props:
```ts
{ roomId, leaderboard, foundWords, remainingTime, totalTime, canvas, meId,
  goal: { type, payload }, comboCount, comboMultiplier, retiredTileCount,
  luckyBoostActive, opponentWords? }
```

New Blast primitives:
- `GoalBanner` — goal type chip (target_word / color_power / classic)
- `ComboCounter` — combo chain × multiplier with neo-shake on increment
- `RetiredTilesChip` — count of retired tiles this round
- `LuckyBoostChip` — DDA boost indicator when active

Mount at `MultiplayerInGameView.tsx` line ~520 in a new
`if ((gameMode as string) === 'blast' && shellEnabled)` block, parallel to
Standard/WheelRush/WordHunt.

## Juice layer

Five sub-layers, all gated by `prefers-reduced-motion: no-preference`:

1. **Entrance stagger** — GSAP timeline on shell mount; mode-badge → roster (80ms) → secondary; center scale-in 0.96→1.0 (240ms); right rail rows stagger
2. **Score-tick** — `ScoreTickChip` floats from roster row toward total when score increments (600ms float, mode-color)
3. **Opponent-word incoming** — ladder rows for opponents flash mode-color background on insert
4. **Hover micro-states** — desktop-only via `(hover: hover)` media: roster row lifts + tooltip; ladder row reveals input-method icon; mode badge mascot wobbles
5. **Idle ambient** — every 8-12s mode-badge mascot does subtle blink/breath

Implementation: small `useShellEntrance()` hook (~30 LOC), CSS-only hover states
where possible. Score-tick uses queue + animation-end auto-removal, debounced to
1 per row per 250ms.

## Translation hit

~14 new EN keys under `mp.insights.*` namespace:
`bestWord`, `wordsPerMin`, `kbBonusUses`, `paceDeltaPositive`, `paceDeltaNegative`,
`paceDeltaTied`, `opponentInsightHeader`, `comboCounterHeader`, `retiredTiles`,
`luckyBoost`, `goalTypeTargetWord`, `goalTypeColorPower`, `spinCounter`,
`rarityHeat`. EN authored, HE/SV/JA/ES machine-translated and flagged for
native review (memory pattern).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Mascot GIFs add weight | poster PNG fallback; `loading="lazy"`; <30KB |
| GSAP timelines leak on remount | explicit `tl.kill()` cleanup |
| Halftone reduces text contrast | opacity capped at 0.06; AA verified |
| Score-tick spam on rapid words | debounce: 1 tick / row / 250ms |
| Blast adapter goal-banner duplicates mobile banner | desktop has separate slot; mobile path untouched |
| WheelRushDesktopAdapter already uses `pink` color | spec keeps it; Blast uses `lime` |

## Test coverage

- Snapshot per adapter (4 total) at LTR + RTL + empty-data paths
- Behavior tests for new primitives: data-derivation, lifecycle, animation flags
- Existing `MultiplayerDesktopShell.test.tsx` and existing adapter tests pass unchanged
- Reduced-motion path tested for each animated primitive

## Build sequence

1. `desktopThemes.ts` map + `ThemedPanel` primitive + tests
2. Universal primitives (`MyStatsCard`, `OpponentInsightFeed`, `PaceDeltaChip`, `ScoreTickChip`) + tests
3. Wire universals into Standard/WheelRush/WordHunt adapters
4. Mode-specific primitives (Spin/Rarity/Category/HuntProgress) + wire
5. New `BlastDesktopAdapter` + Blast-specific primitives + mount in `MultiplayerInGameView`
6. Juice layer (entrance / hover / ambient)
7. Translation files (5 locales)
8. Audit: lint + test + build + manual smoke at 1920px EN + HE-RTL

## Rollout

- Same kill-switch flag `mp.desktop-shell.v1` (no new flag)
- Visual + juice changes are slot-internal; flag-off path remains current portrait
- Locales ship with EN authored + HE/SV/JA/ES native-review flagged
