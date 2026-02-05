# Mobile Results Page Simplification

> **Goal:** Reduce visual clutter on mobile results while maintaining celebration, learning, and progress feedback.

## Design Principles

1. **Score celebration + Play Again above fold** - No scrolling needed for core experience
2. **Details on demand** - Investigation via Details tab (2-tab system stays)
3. **Cut the noise** - Remove BonusBadgesRow and sparkline from Results tab
4. **Consistent across modes** - Same simplified structure for single player, multiplayer, adventure, daily

---

## Mobile Results Tab - Simplified

### Above the Fold (~280px)

```
┌─────────────────────────────────┐
│ ← Back                          │
├─────────────────────────────────┤
│      🏆 YOU WON! 🏆             │  Banner (30% shorter)
│         247 pts                 │
│        #1 of 4                  │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐      │  Inline stats row
│  │ 12 words│  │ 85% acc │      │
│  └─────────┘  └─────────┘      │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │   ▶  PLAY AGAIN             ││  Primary CTA
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Below the Fold (~200px scroll)

```
┌─────────────────────────────────┐
│  🔥 3 Win Streak    +25 coins   │  Compact rewards row
├─────────────────────────────────┤
│  🥇 You    247  ←── current     │
│  🥈 Bot1   198                  │  Compact leaderboard
│  🥉 Bot2   156                  │  (no avatars)
├─────────────────────────────────┤
│  #847 Global Rank               │  Text only (no badge)
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │  🎯 Challenge a Friend      ││  Secondary CTA
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Components Changed

| Component | Current | New |
|-----------|---------|-----|
| ResultsWinnerBanner | Full height | 30% shorter |
| CompactResultsStats | Grid with sparkline | Single inline row (words + accuracy only) |
| RewardsSummary | Large card with animations | Single compact row |
| Top3Leaderboard | With avatars | Text-only, tighter spacing |
| GlobalRankBadge | Decorative badge | Plain text |
| BonusBadgesRow | Visible | **REMOVED** (move to Details) |
| Sparkline trend | Visible | **REMOVED** (move to Details) |

---

## Mobile Details Tab - Investigation Mode

```
┌─────────────────────────────────┐
│  YOUR WORDS (12)           ▼   │  Default OPEN
│  [word chips by points...]      │
├─────────────────────────────────┤
│  PERFORMANCE               ▶   │  Collapsed (archetype here)
├─────────────────────────────────┤
│  MISSED WORDS (5)          ▶   │  Collapsed
├─────────────────────────────────┤
│  BOT WORDS                 ▶   │  Collapsed
├─────────────────────────────────┤
│  ACHIEVEMENTS (2)          ▶   │  Collapsed
├─────────────────────────────────┤
│  HISTORY CHART             ▶   │  Collapsed (sparkline here)
├─────────────────────────────────┤
│  BONUSES                   ▶   │  Collapsed (combo/fire here)
└─────────────────────────────────┘
```

### What Moves to Details Tab

- Player archetype badge → inside Performance section
- Sparkline trend → inside History Chart section
- Combo/fire bonus breakdown → new Bonuses section

---

## Desktop Layout - Reorganized

Two-column layout with clear information hierarchy:

```
LEFT COLUMN (40%)                RIGHT COLUMN (60%)
═══════════════                 ═══════════════════

┌──────────────────┐            ┌──────────────────────────┐
│  Celebration     │            │  YOUR WORDS              │
│  Banner          │            │  [word chips grid]       │
└──────────────────┘            └──────────────────────────┘

┌──────────────────┐            ┌──────────────────────────┐
│ Stats + Rewards  │            │  LEADERBOARD             │
│ (compact grid)   │            │  (full with avatars)     │
└──────────────────┘            └──────────────────────────┘

┌──────────────────┐            ┌──────────────────────────┐
│ ▶ PLAY AGAIN     │            │  Collapsible sections:   │
│ 🎯 Challenge     │            │  - Missed Words          │
└──────────────────┘            │  - Performance           │
                                │  - Bot Words             │
Global Rank (text)              │  - Achievements          │
                                └──────────────────────────┘
```

### Desktop Principles

- **No tabs** - Everything visible on one scrollable page
- **Left:** What happened + What next (celebration, stats, actions)
- **Right:** Investigation (words, standings, expandable analysis)

---

## Implementation Plan

### New Components to Create

1. **`MobileCompactStats`** - Single row: words count + accuracy only
2. **`MobileCompactRewards`** - Single row: streak + coins inline
3. **`MobileCompactLeaderboard`** - Text-only, no avatars, 3 rows max

### Components to Modify

1. **`ResultsWinnerBanner`** - Add `compact` prop for 30% height reduction
2. **`MobileResultsTab`** - Use new compact components
3. **`MobileDetailsTab`** - Add Bonuses section, reorder sections
4. **`SinglePlayerResults`** - Update desktop layout to 2-column
5. **`ResultsPage`** (multiplayer) - Same changes for consistency

### Components to Keep As-Is

- Desktop leaderboard (with avatars)
- All Details tab sections (just reorder/add bonuses)
- Achievement modal system
- Word validation flow

---

## Success Metrics

- **Above-fold content fits in 280px** (all phone sizes)
- **Play Again button visible without scroll**
- **Results tab scroll depth < 500px total**
- **Details tab provides full investigation capability**

---

## Applies To

- ✅ Single Player (solo-bots, practice)
- ✅ Multiplayer
- ✅ Adventure mode results
- ✅ Daily Buzz results (already minimal, verify consistency)
