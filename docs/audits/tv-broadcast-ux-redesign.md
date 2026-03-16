# TV Broadcast View — UX Redesign Proposal

> **Context**: LexiClash multiplayer. TV/projector shown on a shared screen while 2–8+ players compete on phones. No spoilers. Neo-brutalist design system.

---

## 1. Core Design Philosophy

### What's wrong with the current layout

The current view divides the screen 50/50 between the letter grid and a static leaderboard. This breaks the no-spoilers constraint immediately — the grid is the answer key. Spectators can coach players in real time, and players glancing up get an unfair advantage.

Beyond the spoiler problem, the view feels passive. The leaderboard shows rank and score but communicates nothing about momentum, story, or drama. It's a spreadsheet on a TV.

### What makes a spectator screen compelling

Think about what sports broadcasts do:
- They show **activity and effort**, not the playbook (you see the player running, not the play call)
- They manufacture **narrative tension** — who's surging, who just dropped, who's about to catch up
- They use **rhythm and sound** — the screen changes shape and intensity as the game changes
- They give **non-participants something to root for** — even people who don't know the rules can pick a favorite and care

The TV broadcast should feel like watching an esports stream, not a school scoreboard.

---

## 2. The No-Spoilers Constraint — What to Show Instead of the Grid

### Replace the grid with player activity representations

The grid must go. In its place, three abstracted visualizations — one per game mode — that show "something is happening" without showing what:

**Classic Boggle**: A 4×4 abstract tile grid where individual tiles light up with a pulse animation when any player submits a word. The tile that flashes is random (not the actual letter used). Players see activity without seeing letters or valid word positions.

**Blast Mode**: An abstract cascade visualization — colored blocks falling and exploding in a physics-like display. No letters. The visual intensity (how many blocks fall, how fast, how bright) reflects the current combo multiplier across all players.

**Word Hunt**: A horizontal progress bar per player showing how many guesses they've made toward the target word. The bar fills with colored segments — green for correct guesses, gray for attempts. The target word length is shown as dashes (like Hangman) but no letters are revealed.

---

## 3. Layout System

### Screen zones

```
┌──────────────────────────────────────────────────────┐
│  JOIN BAR: "Play at lexiclash.com • Code: GAME7"     │  ~8% height
├─────────────────┬────────────────────────────────────┤
│                 │  MOMENTUM TICKER (scrolling)        │  ~6% height
│  ACTIVITY       ├────────────────────────────────────┤
│  VISUALIZATION  │  LEADERBOARD                       │
│  (left 45%)     │  (right 55%)                       │  ~62% height
│                 │                                     │
├─────────────────┴────────────────────────────────────┤
│  BOTTOM BAR: Timer | Mode badge | Player count        │  ~8% height
├──────────────────────────────────────────────────────┤
│  NOTIFICATION STAGE (overlaid center-bottom)          │  floating
└──────────────────────────────────────────────────────┘
```

### Why this proportion

The leaderboard gets 55% of horizontal space because it carries the narrative. Names, avatars, scores, deltas, and momentum bars need breathing room. On a 1920×1080 TV, cramped leaderboard rows are unreadable from 3 meters away.

The activity visualization (left panel) gets 45% — it's atmospheric. It shows the room that something is happening and sets energy level, but it is not the main information.

On screens narrower than 1024px (projectors in landscape tablet mode), the layout collapses to a single column: visualization on top (30% height), leaderboard below (70%).

---

## 4. Component Hierarchy

```
TvBroadcastView
├── TvJoinBar                          (existing, keep)
├── TvMomentumTicker                   (NEW)
├── TvMainStage
│   ├── TvActivityVisualization        (NEW — replaces TvGrid)
│   │   ├── TvClassicActivityPanel     (mode-specific)
│   │   ├── TvBlastActivityPanel       (mode-specific)
│   │   └── TvWordHuntActivityPanel    (mode-specific)
│   └── TvLeaderboardPanel             (REDESIGNED)
│       ├── TvLeaderboardHeader
│       ├── TvPlayerRow (×N)           (replaces TvPlayerCard)
│       └── TvGapIndicator             (NEW — shows score distance)
├── TvBottomBar                        (NEW — replaces TvGameHeader)
├── TvNotificationStage                (REDESIGNED — was TvNotificationQueue)
│   ├── TvHeroNotification             (large center-screen blast)
│   └── TvSideToast                    (small persistent side notices)
└── TvTutorialOverlay                  (existing, keep)
```

---

## 5. Component Specifications

### 5.1 TvMomentumTicker

A single horizontal scrolling strip below the join bar. Rotates through auto-generated commentary fragments based on game state. Updates every 8–12 seconds.

**What it shows:**
- "ALEX is on a 7-word streak"
- "3 players within 40 points — anyone's game"
- "SAM just jumped from 4th to 2nd"
- "FIRST PLACE GAP: 120 pts"
- In Blast: "COMBO x8 in progress"
- In Word Hunt: "2 players eliminated"

**Design**: Dark background strip, neo-yellow text, `font-neo-display`, uppercase, 24px. Fade-in/fade-out transitions (not scroll — scroll is hard to read on a TV from distance).

**RTL**: Text direction flips for Hebrew locale. The ticker still fades, not scrolls.

**Implementation note**: This is purely derived from props already available (`playerScores`, `playerWordCounts`, `playerCombos`). No new socket events needed.

---

### 5.2 TvActivityVisualization

This is the atmospheric left panel. It has three mode-specific implementations selected via a `gameMode` prop passed down from `TvBroadcastViewProps` (currently absent — needs to be added).

#### 5.2.1 TvClassicActivityPanel

A 4×4 (or 5×5) grid of abstract tiles. Each tile is a filled square with a letter placeholder (shown as a blurred blob or a "?" glyph — never the real letter).

**Event-driven animations:**
- When any player submits a valid word: 2–4 random tiles briefly pulse in neo-yellow, then settle. Duration 400ms.
- When a player combo fires: A ripple effect emanates from the center of the grid, passing through tiles with a delay per row.
- When the fire round activates: All tiles get a red tint overlay that pulses with the fireRoundRemaining countdown.
- Earthquake: Tiles wobble using the existing `animate-neo-shake` class, same as current behavior.

**Visual vocabulary**: Tiles use muted navy fill by default. Active tiles burst to yellow. The visual reads as "activity" — something is happening in the grid — without showing the grid.

#### 5.2.2 TvBlastActivityPanel

An abstract cascade field. Think of it as a slot-machine-style column of colored blocks that animate continuously.

**Structure**: 6–8 columns of stacked colored squares (12px each, gap-1). Each column has 8–10 rows visible.

**Idle state**: Blocks gently float down at 1–2px/s. Random color palette from the design system (neo-yellow, neo-orange, neo-pink, neo-cyan).

**Event-driven animations:**
- Word submitted: A burst of 3–5 blocks in the color corresponding to the word's length (short=yellow, medium=orange, long=pink) explode from a random column and scatter off-screen.
- Combo level 3+: Cascade columns accelerate. Speed scales with combo level.
- Combo level 7+: The panel background shifts from navy to a deep red glow. Block colors become more saturated.
- Combo break: All columns flash white for 200ms, then reset to base speed.

**No letters are ever shown.** This panel is pure kinetic energy visualization.

#### 5.2.3 TvWordHuntActivityPanel

Shows one horizontal progress bar per player. Up to 8 players shown.

**Each bar:**
- Player avatar (32px) on the left
- Player name (truncated, 12px, bold uppercase)
- Progress bar: segmented into N slots matching `wordHuntTargetLength`. Each solved word fills one slot green. Each failed attempt creates a brief red flash, then fades.
- Attempt counter badge on the right: "5 tries"
- Eliminated players: Bar fades to 30% opacity, crossed-out name, red border

**The key no-spoilers insight here**: The bar shows HOW MANY words a player has found (they hunt the same word repeatedly for points in some modes) or how many attempts toward a target — but never WHICH word. The actual target word is not displayed.

**Event-driven animations:**
- Correct guess: The newly filled slot bursts in green with a scale-up pop, then settles.
- Wrong guess: Bar shakes using `animate-neo-shake`, count increments with a bounce.
- Player eliminated: Dramatic exit animation — bar slides right and shrinks, red X overlays avatar.

---

### 5.3 TvLeaderboardPanel (redesign of TvLeaderboard + TvPlayerCard)

The leaderboard is the narrative engine. The redesign focuses on two things: **readability at TV distance** and **story communication**.

#### TvLeaderboardHeader

A slim header row showing the column labels: PLAYER, SCORE, WORDS, and a small mode-specific stat (COMBO for Blast, TRIES for Word Hunt, STREAK for Classic).

Includes a live player count: "6 PLAYING" badge in neo-cyan.

#### TvPlayerRow (replaces TvPlayerCard)

Each row is taller (72px minimum) with clear visual hierarchy:

```
┌─────────────────────────────────────────────────────────┐
│  [#1 🏆]  [AVATAR]  PLAYERNAME      ████████░░  850 pts │
│                      8 words  🔥 3x             +45 ↑   │
└─────────────────────────────────────────────────────────┘
```

**New element: the score bar**

A horizontal progress bar between the name and score showing this player's score relative to the current leader. Leader bar = 100% full. Second place bar = (their score / leader score) × 100%. This makes the gap between first and second instantly readable without arithmetic.

This is the single most important new element. Spectators need to answer "how far behind is second place?" in under a second. The bar answers that visually.

**New element: score delta badge**

Shows the last score change as "+45" with an upward arrow in green, or "-20" with a downward arrow in red (for Word Hunt elimination scoring). Fades after 3 seconds. This is what creates "something just happened" moments for spectators.

**Rank position animation**

When positions change, rows animate using Framer Motion `layoutId` (already in the codebase). The existing implementation is correct — rows slide to their new position. Keep this.

**Rank change arrow**

Already implemented in TvPlayerCard. Keep, but increase size from w-5/h-5 to w-7/h-7 for TV readability.

**Combo indicator**

Already implemented. Increase font size to text-lg minimum. Add pulse animation when combo is active (keyframe: scale 1.0 → 1.15 → 1.0, 1s loop).

#### TvGapIndicator

A new element inserted between first place and second place when the gap exceeds 15% of the leader's score.

Shows: "— GAP: 240 pts —" in small italic text, centered, with a dashed border above and below.

This makes "can anyone catch the leader?" immediately legible. When the gap is closing rapidly (second place scoring faster than first), the indicator text changes to "CLOSING FAST" in neo-orange with a flame icon.

---

### 5.4 TvBottomBar (replaces TvGameHeader)

A slim persistent bar at the bottom of the screen. Three zones:

**Left**: Game mode badge — a pill showing "CLASSIC", "BLAST", or "WORD HUNT" in the appropriate accent color (yellow/orange/cyan).

**Center**: Timer — large, high-contrast. When under 30 seconds, pulses red. Under 10 seconds, fills background red and text turns white. Same fire round logic as existing TvGameHeader.

**Right**: Player count "6 PLAYERS" and a small activity indicator (a pulsing dot when players are actively submitting words, confirming the game is live).

---

### 5.5 TvNotificationStage (redesign of TvNotificationQueue)

The current implementation shows one notification at a time in a queue. The redesign separates notifications into two tiers:

**TvHeroNotification** — large, center-screen, dramatic

Used for: rank overtakes ("SAM TAKES THE LEAD!"), combo milestones ("COMBO x10 — UNSTOPPABLE"), word hunt eliminations ("CHRIS IS OUT"), fire round start, game over countdown.

Specs:
- Covers roughly 40% of screen width, centered horizontally
- Positioned at 35% from top (center of attention, above the fold of the leaderboard)
- Dark background with neo-black border-4, shadow-hard-lg
- Title text: 36px, font-neo-display, uppercase, neo-yellow
- Subtitle: 18px, neo-cream
- Duration: 2.5 seconds, then exits with slide-up + fade
- Maximum 1 visible at a time — new ones queue and wait

**TvSideToast** — small, top-right corner, persistent

Used for: word submissions ("ALEX found a word"), minor score changes, combo starts, player joins mid-game.

Specs:
- 280px wide, stacked vertically with 8px gap
- Maximum 3 visible simultaneously
- Auto-dismiss after 4 seconds
- Entrance from right edge, exit to right edge
- 14px text, avatar thumbnail, minimal info

**The key distinction**: Hero notifications interrupt spectator attention. Side toasts provide a stream of activity without demanding focus. This mirrors how sports broadcasts use a big graphic for goals and a ticker for stats.

---

## 6. Mode-Specific Narrative Elements

### Classic Boggle

**Stat tracked and surfaced**: Word streak (consecutive words found without a gap longer than 15 seconds). Shown as a fire emoji + count next to the player name in the leaderboard row.

**Tension mechanic**: "30 SECOND WARNING" hero notification when the last 30 seconds begin. Player who is currently in 2nd place gets a brief spotlight — their row pulses with a bright border, suggesting they might still catch up.

### Blast Mode

**Stat tracked and surfaced**: Current combo level and cascade count. The activity panel's energy level mirrors the highest active combo across all players.

**Tension mechanic**: When a player's combo breaks above level 5, the hero notification fires: "COMBO BROKEN — [NAME]" in red. Spectators feel the loss.

**Cascade visualization**: Each cascade level adds another "explosion" burst in the activity panel. A combo x10 causes a screen-wide flash for 300ms (respects `prefers-reduced-motion`).

### Word Hunt

**Stat tracked and surfaced**: Attempts remaining before elimination. Players approaching their limit get a red urgency indicator on their progress bar.

**Tension mechanic**: When 2 players remain before a potential elimination, the activity panel zooms in to just those two players' bars. The panel background shifts to a tense dark-red gradient.

**Elimination drama**: When a player is eliminated, a dedicated hero notification plays with their avatar, name, and rank. 3-second display.

---

## 7. Animation System

### Principles

1. **Every animation has a reason** — animations communicate state changes, not decoration
2. **Idle state must be calm** — only intentional triggers cause motion, otherwise spectators tune out
3. **Reduced motion support is mandatory** — wrap all `motion.*` components with the existing `AdaptiveMotion` system

### Animation budget per event type

| Event | Duration | Scope |
|---|---|---|
| Score update | 600ms | Player row flash + counter roll |
| Rank change | 800ms | Row layout spring + arrow badge |
| Combo start | 400ms | Combo badge pop + activity panel pulse |
| Combo break (major) | 300ms | Screen flash (10% opacity) + activity reset |
| Word submitted (Classic) | 400ms | Tile pulses on activity panel |
| Block cascade (Blast) | ongoing | Activity panel continuous |
| Player eliminated (WH) | 1200ms | Row exit + hero notification |
| Fire round start | 500ms | Bottom bar color change + hero notification |
| Last 30 seconds | looping | Timer pulse |

---

## 8. Data Requirements and Props Changes

The current `TvBroadcastViewProps` needs additions to support the redesign:

**New required props:**
- `gameMode: 'classic' | 'blast' | 'word-hunt'` — currently absent, needed for mode-specific visualizations
- `wordHuntPlayerLives?: Record<string, number>` — for Word Hunt progress bars
- `wordHuntTargetLength?: number` — for progress bar segment count
- `blastCombos?: Record<string, number>` — already partially available via `useTvPlayerCombos`, but needs to be surfaced to the activity panel

**New socket events to listen for (on TV side):**
- `tvWordSubmitted` — player + word length (NOT the word itself) + timestamp. Triggers tile pulse / block burst.
- `tvComboUpdate` — player + comboLevel. Already exists via `useTvPlayerCombos`.
- `tvPlayerEliminated` — player + rank. For Word Hunt drama.
- `tvCascadeEvent` — comboLevel + intensity. For Blast panel.

Note: `tvWordSubmitted` must emit word LENGTH only, never the word. This is a backend change and should be explicitly gated.

---

## 9. RTL Considerations

The existing implementation handles RTL via shadow auto-flip (documented in CLAUDE.md). The redesign adds:

**Layout mirroring:**
- The main stage swaps: activity visualization moves to the right, leaderboard to the left for `locale=he`
- Use `dir="rtl"` on the root container and rely on logical properties throughout (`ms-` not `ml-`, `me-` not `mr-`, `ps-` not `pl-`, `pe-` not `pr-`)
- The score bar fill direction reverses naturally with `dir="rtl"` if built with `width` as a percentage, not `left` positioning

**Typography:**
- Player names in Hebrew render in Rubik (already configured as font-neo-body)
- The momentum ticker reverses reading direction — use `text-align: start` not `text-align: left`
- Rank arrows (up/down) do NOT flip — vertical direction is the same in RTL

**Notification stage:**
- Side toasts enter from the left edge in RTL (mirror of right edge in LTR)
- Hero notifications remain center — no change

---

## 10. Accessibility

The TV view is primarily a passive spectator screen, but it may be navigated by the host using a keyboard (to toggle fullscreen, dismiss tutorial). Key requirements:

- All interactive controls (fullscreen toggle, help button) must have `aria-label` via `t()` — already done in current code
- The leaderboard must be a proper `<ol>` with each `<li>` having a meaningful `aria-label`: "Rank 1, Alex, 850 points, 8 words"
- Score deltas announced via `aria-live="polite"` region (a visually hidden span that updates with score change text)
- Hero notifications: `role="status"` and `aria-live="assertive"` for urgent game events (eliminations, fire round)
- Reduced motion: the entire activity visualization should be static (tiles just hold their last color state) when `prefers-reduced-motion: reduce` is set

---

## 11. Wireframe Descriptions

### State: Pre-game / Waiting

```
┌──────────────────────────────────────────────────────────────┐
│  Play at lexiclash.com  |  Code: GAME7  |  [QR CODE]        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌─────────────────────┐   ┌────────────────────────────┐ │
│    │                     │   │   WAITING FOR HOST...      │ │
│    │   [GAME MODE LOGO]  │   │                            │ │
│    │                     │   │   4 PLAYERS READY          │ │
│    │   3 players joined  │   │                            │ │
│    │   Waiting for more  │   │   ALEX      [avatar]       │ │
│    │                     │   │   SAM       [avatar]       │ │
│    │                     │   │   JORDAN    [avatar]       │ │
│    │                     │   │   + 1 more                 │ │
│    └─────────────────────┘   └────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [CLASSIC]          --:--          4 PLAYERS  ●            │
└──────────────────────────────────────────────────────────────┘
```

### State: Active game — Classic Boggle

```
┌──────────────────────────────────────────────────────────────┐
│  lexiclash.com  •  Code: GAME7  |  [QR]         [?] [⛶]   │
├──────────────────────────────────────────────────────────────┤
│  ALEX is on a 5-word streak — SAM is closing the gap        │ ← momentum ticker
├──────────────┬───────────────────────────────────────────────┤
│              │  #  PLAYER          ████████░░  SCORE        │
│  ░ ░ ░ ░    │                                               │
│  ░ █ ░ ░    │  🏆  [av] ALEX       ██████████  850 pts     │
│  ░ ░ █ ░    │            7 words    🔥2x      +45 ↑        │
│  ░ ░ ░ ░    │                                               │
│             │  🥈  [av] SAM        ████████░░  720 pts     │
│             │            6 words              +30 ↑        │
│  (abstract  │                                               │
│   tile grid │  — GAP: 130 pts ——————————————————————       │
│   pulses    │                                               │
│   on word   │  3   [av] JORDAN     ██████░░░░  580 pts     │
│   submit)   │            5 words                           │
│             │                                               │
│             │  4   [av] CASEY      ████░░░░░░  390 pts     │
│             │            3 words                           │
├─────────────┴───────────────────────────────────────────────┤
│  [CLASSIC]              1:42              4 PLAYERS  ●      │
└──────────────────────────────────────────────────────────────┘
```

### State: Hero notification (rank overtake)

```
                    ┌───────────────────────────┐
                    │  ▲  SAM TAKES THE LEAD!   │
                    │     SAM overtook ALEX      │
                    │     +85 pts               │
                    └───────────────────────────┘
```

The leaderboard continues behind the notification. The overtaking player's row is mid-animation (sliding up in the layout).

### State: Blast Mode active, high combo

```
┌──────────────────────────────────────────────────────────────┐
│  lexiclash.com  •  Code: GAME7  |  [QR]         [?] [⛶]   │
├──────────────────────────────────────────────────────────────┤
│  COMBO x8 ACTIVE — SAM IS ON FIRE                           │
├──────────────┬───────────────────────────────────────────────┤
│  ░█░░░█░     │  #  PLAYER          ████████░░  SCORE        │
│  ██░█░░█     │                                               │
│  ░░░█░░░     │  🏆  [av] SAM        ██████████  1200 pts    │
│  █░░░░█░     │            🔥🔥🔥 8x COMBO    +320 ↑        │
│  ░░█░░░█     │                                               │
│  ░█░░█░░     │  🥈  [av] ALEX       ████████░░  980 pts     │
│              │            🔥 3x              +60 ↑         │
│  (cascade    │                                               │
│   blocks     │  3   [av] JORDAN     ██████░░░░  720 pts     │
│   falling,   │                                               │
│   blocks     │  4   [av] CASEY      ████░░░░░░  510 pts     │
│   exploding) │                                               │
├─────────────┴───────────────────────────────────────────────┤
│  [BLAST]                2:15              4 PLAYERS  ●      │
└──────────────────────────────────────────────────────────────┘
```

### State: Word Hunt, 2 players near elimination

```
┌──────────────────────────────────────────────────────────────┐
│  lexiclash.com  •  Code: GAME7  |  [QR]         [?] [⛶]   │
├──────────────────────────────────────────────────────────────┤
│  2 PLAYERS ON THEIR LAST CHANCE — WHO GETS ELIMINATED?      │
├──────────────┬───────────────────────────────────────────────┤
│              │  #  PLAYER          GUESSES   SCORE          │
│  [av] ALEX   │                                               │
│  ███░░░░░   │  🏆  [av] ALEX       ●●●●●●●  580 pts        │
│  7 tries     │            ██████░  1 try left               │
│              │                                               │
│  [av] SAM    │  🥈  [av] SAM        ●●●●●●○  520 pts        │
│  ████░░░░   │            ████░░░  2 tries left              │
│  6 tries     │                                               │
│              │  3   [av] JORDAN     ●●●●●●●  490 pts        │
│  (zoomed-in  │            ████░░░  comfortable              │
│   on at-risk │                                               │
│   players)   │  4   [av] CASEY      OUT ✗                   │
│              │            eliminated                        │
├─────────────┴───────────────────────────────────────────────┤
│  [WORD HUNT]            3:05              3 PLAYING  ●      │
└──────────────────────────────────────────────────────────────┘
```

---

## 12. Implementation Priority Order

The following order minimizes risk while delivering maximum spectator value earliest:

**Phase 1 — No-spoilers fix (critical, implement first)**
1. Remove the grid from `TvBroadcastView` or hide it behind a spoiler-mode toggle
2. Add `gameMode` prop to `TvBroadcastViewProps`
3. Create `TvActivityVisualization` shell with `TvClassicActivityPanel` (simplest mode)

**Phase 2 — Leaderboard narrative upgrade**
4. Add score bar (relative-to-leader progress bar) to `TvPlayerCard`/`TvPlayerRow`
5. Add score delta badge (+N with arrow) — the component `AnimatedCounter` already exists
6. Add `TvGapIndicator` between 1st and 2nd place

**Phase 3 — Notification overhaul**
7. Split `TvNotificationQueue` into `TvHeroNotification` + `TvSideToast`
8. Define hero-tier events vs. side-toast-tier events

**Phase 4 — Mode-specific activity panels**
9. `TvBlastActivityPanel` (most visually impressive, good for demos)
10. `TvWordHuntActivityPanel` (most information-dense, most useful for competitive play)

**Phase 5 — Momentum ticker**
11. `TvMomentumTicker` — derived from existing data, purely additive

**Phase 6 — Polish and sound**
12. Tune animation timings against real game sessions
13. Verify `AdaptiveMotion` wrapping throughout
14. RTL pass (Hebrew locale test for all new components)
15. WCAG pass (aria-live regions, aria-labels)

---

## 13. Files to Create or Modify

**New files:**
- `fe-next/host/components/tv-broadcast/TvActivityVisualization.tsx`
- `fe-next/host/components/tv-broadcast/TvClassicActivityPanel.tsx`
- `fe-next/host/components/tv-broadcast/TvBlastActivityPanel.tsx`
- `fe-next/host/components/tv-broadcast/TvWordHuntActivityPanel.tsx`
- `fe-next/host/components/tv-broadcast/TvMomentumTicker.tsx`
- `fe-next/host/components/tv-broadcast/TvGapIndicator.tsx`
- `fe-next/host/components/tv-broadcast/TvHeroNotification.tsx`
- `fe-next/host/components/tv-broadcast/TvSideToast.tsx`
- `fe-next/host/components/tv-broadcast/TvBottomBar.tsx`
- `fe-next/host/components/tv-broadcast/TvPlayerRow.tsx` (replaces TvPlayerCard)
- `fe-next/host/components/tv-broadcast/TvScoreBar.tsx` (sub-component of TvPlayerRow)
- `fe-next/host/components/tv-broadcast/TvScoreDelta.tsx` (sub-component of TvPlayerRow)
- Corresponding `__tests__/` files for each

**Modified files:**
- `fe-next/host/components/TvBroadcastView.tsx` — add `gameMode`, `wordHuntPlayerLives`, `wordHuntTargetLength` props; swap grid for TvActivityVisualization; swap header for TvBottomBar; swap notifications
- `fe-next/host/components/tv-broadcast/TvLeaderboard.tsx` — integrate TvPlayerRow, TvGapIndicator
- `fe-next/translations/en.js` (and he, sv, ja) — new keys for all new UI text

**Backend addition (minor):**
- `tvWordSubmitted` event from word submission handlers — emit `{ player, wordLength, timestamp }`, never the word itself

---

## 14. Translation Keys Required

```js
// New keys to add to translations/en.js
tvBroadcast: {
  // Momentum ticker templates
  momentumOnStreak: '{player} is on a {count}-word streak',
  momentumGapClosing: '{player} is closing the gap fast',
  momentumAnybodysGame: '{count} players within {pts} points — anyone\'s game',
  momentumLeaderComfortable: '{player} pulling away with {pts} point lead',

  // Notifications — hero tier
  heroTakesLead: '{player} TAKES THE LEAD',
  heroComboBroken: 'COMBO BROKEN — {player}',
  heroComboMilestone: 'COMBO x{level} — UNSTOPPABLE',
  heroEliminated: '{player} IS OUT',
  heroFireRound: 'FIRE ROUND — DOUBLE POINTS',
  heroLastThirty: '30 SECONDS LEFT',

  // Leaderboard
  gapLabel: 'GAP: {pts} pts',
  gapClosing: 'CLOSING FAST',
  scoreDeltaUp: '+{pts}',
  scoreDeltaDown: '-{pts}',
  triesLeft: '{count} left',
  comfortable: 'comfortable',
  eliminated: 'eliminated',

  // Activity panel
  activityWaiting: 'Waiting for game to start...',
  activityWordSubmitted: '{player} found a word',

  // Bottom bar
  playersCount: '{count} PLAYING',
  playersCountOne: '1 PLAYER',

  // Mode badges
  modeClassic: 'CLASSIC',
  modeBlast: 'BLAST',
  modeWordHunt: 'WORD HUNT',
}
```

---

## 15. Open Design Questions for the Team

1. **Should the host be able to see the grid on their own device while the TV view hides it?** The current implementation shows the grid to the host. If the host is managing the TV view on the same device (laptop connected to projector), they may want a separate window. This is a UX flow question, not a component question.

2. **How many players before the leaderboard scrolls?** At 8+ players, the leaderboard rows will overflow the panel height on a 1080p TV. Options: (a) shrink row height at 7+ players, (b) show only top 5 + bottom 2 + "N more in between" indicator, (c) auto-scroll. Recommendation: option (b), with a "show all" footer that can be tapped on the TV device.

3. **Should the activity visualization be configurable?** Some teachers/hosts may prefer a completely calm screen (no animations) for classroom settings. A "calm mode" toggle in the pre-game TV settings would address this. Respecting `prefers-reduced-motion` covers most of this automatically but a manual override is more explicit.

4. **`tvWordSubmitted` socket event — backend timing concern**: The memory file notes the game timer race condition (timer starts before all ACKs). The `tvWordSubmitted` event should be gated on `gameState === 'in_progress'` server-side to avoid spurious TV notifications during the start sequence.
