# LexiClash Wireframe Specifications

## Overview

This document provides detailed wireframe specifications for recommended UX improvements. Each section includes layout structure, component specifications, interaction patterns, and implementation notes.

---

## 1. Landing Page Enhancements

### 1.1 Gameplay Preview Section

**Purpose:** Reduce uncertainty by showing actual gameplay before commitment

**Location:** Between hero section and game mode cards

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                              [Lang] [Theme] [Auth]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              "Fast-paced word battles"                      │
│           Find words. Beat friends. 2 minutes.              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │           [GAMEPLAY VIDEO/GIF]                      │    │
│  │                                                     │    │
│  │    ┌───────────────────────────┐                    │    │
│  │    │  15-second gameplay loop  │                    │    │
│  │    │  - Word formation          │                    │    │
│  │    │  - Scoring animation       │                    │    │
│  │    │  - Timer countdown         │                    │    │
│  │    └───────────────────────────┘                    │    │
│  │                                                     │    │
│  │         ▶ Watch how to play                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌───────────────────┐    ┌───────────────────┐          │
│    │   SINGLE PLAYER   │    │    MULTIPLAYER    │          │
│    │                   │    │                   │          │
│    │   Solo vs Bots    │    │   Play with       │          │
│    │   Practice Mode   │    │   Friends         │          │
│    │   Challenges      │    │                   │          │
│    │                   │    │   🔴 4 open rooms │          │
│    │                   │    │   👥 12 playing   │          │
│    └───────────────────┘    └───────────────────┘          │
│                                                             │
│                   [How to Play]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Component Specifications:**

| Component | Spec |
|-----------|------|
| Video container | 16:9 aspect ratio, max 600px width |
| Video format | MP4 with GIF fallback, autoplay muted, loop |
| Video content | Grid → form word → score appears → combo → timer |
| Play button | Only shows if autoplay fails |
| Tagline | 24px bold, centered |
| Subtitle | 16px regular, centered |

**Interaction Notes:**
- Video autoplays on page load (muted)
- Tap video to expand full-screen
- "Watch how to play" links to /rules

---

### 1.2 Quick Play Option

**Purpose:** Reduce decision paralysis for users who just want to play

**Location:** Above or between mode cards

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │         ⚡ QUICK PLAY - Start in seconds          │     │
│   │    Jump into a game now (solo with bots)          │     │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
│           ─── OR CHOOSE YOUR MODE ───                       │
│                                                             │
│    ┌───────────────────┐    ┌───────────────────┐          │
│    │   Single Player   │    │   Multiplayer     │          │
```

**Component Specifications:**

| Component | Spec |
|-----------|------|
| Quick Play button | Full width, accent color, prominent |
| Icon | Lightning bolt |
| Subtitle | 14px, muted color |
| Behavior | Starts single player vs 2 bots, medium difficulty |

---

## 2. Streamlined Onboarding

### 2.1 Condensed Onboarding Flow (3 Steps)

**Purpose:** Reduce onboarding from 6 steps to 3, deferring advanced concepts

```
STEP 1/3: Quick Profile
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│               Choose your look                              │
│                                                             │
│    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│    │ 😀  │ │ 😎  │ │ 🤓  │ │ 🦊  │ │ 🐱  │ │ 🐶  │         │
│    └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│    │ 🎮  │ │ 🎯  │ │ 🌟  │ │ 🔥  │ │ 💎  │ │ 🎪  │         │
│    └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│                                                             │
│    ┌───────────────────────────────────────────────┐       │
│    │  Your name: [___________________]             │       │
│    └───────────────────────────────────────────────┘       │
│                                                             │
│                    [ Continue → ]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘


STEP 2/3: Learn the Basics
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Connect letters to form words                  │
│                                                             │
│         ┌─────────────────────────────────────┐             │
│         │                                     │             │
│         │      [INTERACTIVE DEMO GRID]        │             │
│         │                                     │             │
│         │    C─A─T  →  +3 points!             │             │
│         │                                     │             │
│         │    Try forming "CAT" by             │             │
│         │    connecting the letters           │             │
│         │                                     │             │
│         └─────────────────────────────────────┘             │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │ ✓ CAT found! Nice work!                       │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│                    [ Got it! → ]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘


STEP 3/3: Ready to Play!
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   You're all set!                           │
│                                                             │
│         Find as many words as you can                       │
│         before time runs out.                               │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │                                               │        │
│    │  Tips:                                        │        │
│    │  • Longer words = more points                 │        │
│    │  • Find words quickly for combos              │        │
│    │  • Watch for special bonus rounds             │        │
│    │                                               │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│                                                             │
│              [ Start Playing! ] (primary)                   │
│                                                             │
│           [Skip tutorial, I know how] (text link)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Component Specifications:**

| Step | Duration Target | Required |
|------|-----------------|----------|
| 1 - Profile | 15 sec | Yes |
| 2 - Demo | 20 sec | Yes (can skip) |
| 3 - Tips | 10 sec | Yes (can skip) |

**Deferred Content (Now In-Game):**
- Combo system → Show tooltip when first combo achieved
- Earthquake → Show alert when first earthquake happens
- Fire round → Show indicator when activated

---

### 2.2 In-Game Contextual Hints

**Purpose:** Teach advanced concepts when relevant, not upfront

```
COMBO HINT (First combo achieved)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  🔥 COMBO x2!                                 │        │
│    │                                               │        │
│    │  Find words quickly to keep your              │        │
│    │  combo going for bonus points!                │        │
│    │                                               │        │
│    │  [Got it]                          (dismiss)  │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘


EARTHQUAKE HINT (First earthquake warning)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  🌋 EARTHQUAKE WARNING!                       │        │
│    │                                               │        │
│    │  The grid will shake! Letters may             │        │
│    │  shift. Fire Round starts next!               │        │
│    │                                               │        │
│    │  [Bring it on!]                    (dismiss)  │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘


FIRE ROUND HINT (First fire round)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  🔥 FIRE ROUND - 2X POINTS!                   │        │
│    │                                               │        │
│    │  Every word is worth double!                  │        │
│    │  Go fast!                                     │        │
│    │                                               │        │
│    │  [Let's go!]                       (dismiss)  │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Component Specifications:**

| Component | Spec |
|-----------|------|
| Container | Modal overlay, centered, 80% width max 400px |
| Background | Semi-transparent dark overlay |
| Dismiss | Tap anywhere or button |
| Show once | Persisted in localStorage |
| Position | Top-third of screen (not covering grid) |

---

## 3. Multiplayer Improvements

### 3.1 One-Tap Room Sharing

**Purpose:** Reduce sharing friction from 3+ taps to 1 tap

**Current Flow:**
```
1. Click share button
2. Choose share method
3. Customize message
4. Send
```

**Proposed Flow:**
```
1. Click share button → Immediately opens native share sheet
   OR shows single-screen share options
```

```
SHARE ROOM (Single Screen)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Share this room                            │
│                                                             │
│         Room Code: ABCD-1234                                │
│         ┌──────────────────────────────────────┐            │
│         │   [Copy Code]  (one tap copies)      │            │
│         └──────────────────────────────────────┘            │
│                                                             │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│    │         │  │         │  │         │  │         │      │
│    │  Copy   │  │ WhatsApp│  │ Message │  │  Share  │      │
│    │  Link   │  │         │  │         │  │   QR    │      │
│    │         │  │         │  │         │  │         │      │
│    └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  Or scan to join:                             │        │
│    │           ┌─────────────┐                     │        │
│    │           │   [QR]      │                     │        │
│    │           │    CODE     │                     │        │
│    │           └─────────────┘                     │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│                      [Close]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interaction Notes:**
- Copy Link: Copies full URL to clipboard, shows "Copied!" toast
- WhatsApp: Opens WhatsApp with pre-filled message
- Message: Opens SMS with pre-filled message
- Share QR: Opens system share sheet with QR image
- QR always visible for in-person sharing

---

### 3.2 Auto-Fill Bots When Waiting

**Purpose:** Reduce abandonment due to waiting for players

```
HOST WAITING ROOM (With Auto-Fill)
┌─────────────────────────────────────────────────────────────┐
│  [Back]        Game Room           [Settings]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Room Code: ABCD-1234          [Share Room]               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Players (2/8)                                            │
│                                                             │
│    ┌─────────────────────────────────────────────────┐      │
│    │ 😀 PlayerOne (Host)                    ✓ Ready │      │
│    │ 🦊 GuestUser42                         ✓ Ready │      │
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │      │
│    │   Waiting for more players...                  │      │
│    └─────────────────────────────────────────────────┘      │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  ☐ Fill empty spots with bots                 │        │
│    │    (Adds AI players when game starts)         │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  ☐ Auto-start after 30 seconds               │        │
│    │    (With bots if needed)                      │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [ Start Game ]  (primary, large)               │
│                                                             │
│           Need at least 2 players to start                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘


WAITING TOO LONG (30+ seconds)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  Still waiting?                               │        │
│    │                                               │        │
│    │  [ Add bots and start now ]    (primary)     │        │
│    │                                               │        │
│    │  [ Keep waiting ]              (secondary)   │        │
│    │                                               │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Behavior Specifications:**

| Setting | Behavior |
|---------|----------|
| Fill with bots | When enabled, adds bots to reach min 4 players at game start |
| Auto-start | Countdown appears after 30s, can cancel, starts with bots |
| Bot difficulty | Matches room difficulty setting |
| Bot naming | "Bot_Easy", "Bot_Medium", "Bot_Hard" with random avatar |

---

### 3.3 Late Joiner Participation

**Purpose:** Allow late joiners to play for partial credit instead of spectating

```
LATE JOINER FLOW
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Game in progress!                              │
│                                                             │
│         Time remaining: 1:45                                │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │                                               │        │
│    │  You can still join and play!                 │        │
│    │                                               │        │
│    │  Your score will be prorated based on         │        │
│    │  time played. (75% of full game)              │        │
│    │                                               │        │
│    │  [ Join Game ]              (primary)         │        │
│    │                                               │        │
│    │  [ Watch instead ]          (secondary)       │        │
│    │                                               │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘


LATE JOINER IN-GAME INDICATOR
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    Score: 45 pts (x0.75 late join)    Time: 1:23            │
│                                                             │
└─────────────────────────────────────────────────────────────┘


RESULTS FOR LATE JOINER
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    🦊 YourName                                              │
│    Score: 45 pts                                            │
│    Late join: 75% time played                               │
│    Adjusted: 34 pts (for ranking)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Achievement System Improvements

### 4.1 Achievement Progress Dashboard

**Purpose:** Show players what achievements are close and motivate progress

```
PROFILE PAGE - ACHIEVEMENTS SECTION
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Achievements (12/35)              [View All →]             │
│                                                             │
│  ── Almost There! ──                                        │
│                                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │  🎯 Speed Demon                                   │       │
│  │  Find 5 words in 30 seconds                       │       │
│  │  ████████████████░░░░░  4/5 words                │       │
│  └──────────────────────────────────────────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │  📚 Word Master                                   │       │
│  │  Find 10 words in a single game                   │       │
│  │  ██████████████░░░░░░░  8/10 words               │       │
│  └──────────────────────────────────────────────────┘       │
│                                                             │
│  ── Recently Earned ──                                      │
│                                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐                              │
│  │  🏆  │  │  🔥  │  │  ⭐  │                              │
│  │First │  │Combo │  │Quick │                              │
│  │Blood │  │King  │  │Start │                              │
│  └──────┘  └──────┘  └──────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 In-Game Achievement Progress

**Purpose:** Show progress during gameplay, not just at end

```
IN-GAME ACHIEVEMENT PROGRESS (Subtle)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │              [GAME GRID]                            │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                         ↓                                   │
│               Score: 42 pts                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🎯 Speed Demon: 4/5 words in 30 sec                │    │
│  │  ██████████████████░░                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘


ACHIEVEMENT UNLOCKED (Mid-Game)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌───────────────────────────────────────────────┐          │
│  │  🎉 Achievement Unlocked!                      │          │
│  │                                               │          │
│  │  🎯 Speed Demon                                │          │
│  │  Found 5 words in 30 seconds                   │          │
│  │                                               │          │
│  └───────────────────────────────────────────────┘          │
│       ↑ Appears briefly (2s), auto-dismisses               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Streak System Improvements

### 5.1 Streak Freeze Feature

**Purpose:** Reduce streak anxiety and churn from broken streaks

```
STREAK DISPLAY (With Freeze)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    Daily Challenge                                          │
│                                                             │
│    🔥 15 Day Streak!                                        │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │  🧊 2 Streak Freezes available                 │        │
│    │  (Auto-protects if you miss a day)            │        │
│    │                                               │        │
│    │  [Get more freezes →]                         │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│         [ Play Today's Puzzle ]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘


STREAK FROZEN (Missed Day)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    🧊 Your streak was frozen!                               │
│                                                             │
│    You missed yesterday, but your                           │
│    streak freeze saved you!                                 │
│                                                             │
│    🔥 15 Day Streak (protected)                             │
│    🧊 1 Freeze remaining                                    │
│                                                             │
│         [ Continue Streak → ]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘


EARNING FREEZES
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    Streak Freezes                                           │
│                                                             │
│    Current: 🧊🧊 (2 freezes)                                │
│    Max: 🧊🧊🧊 (3 freezes)                                  │
│                                                             │
│    ── Earn More Freezes ──                                  │
│                                                             │
│    ✓ 7-day streak → +1 freeze                               │
│    ○ Play 50 games total → +1 freeze  (38/50)               │
│    ○ Win 10 multiplayer games → +1 freeze  (6/10)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Streak Recovery Challenge

**Purpose:** Allow players to recover recently broken streaks

```
STREAK BROKEN SCREEN
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    😢 Your 23-day streak ended                              │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │                                               │        │
│    │  Want to recover it?                          │        │
│    │                                               │        │
│    │  Complete the Recovery Challenge:             │        │
│    │  Win 3 games in the next 24 hours             │        │
│    │                                               │        │
│    │  [ Start Recovery Challenge ]    (primary)   │        │
│    │                                               │        │
│    │  [ Start Fresh ]                 (secondary) │        │
│    │                                               │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘


RECOVERY IN PROGRESS
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ⚡ Streak Recovery Challenge                              │
│                                                             │
│    Win 3 games to restore your 23-day streak                │
│                                                             │
│    Progress: ⬤ ⬤ ○                                          │
│              2/3 wins                                       │
│                                                             │
│    Time remaining: 18:42:15                                 │
│                                                             │
│         [ Play Now ]                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘


RECOVERY SUCCESSFUL
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    🎉 Streak Recovered!                                     │
│                                                             │
│    🔥 23 Day Streak (restored)                              │
│                                                             │
│    Great comeback! Your dedication                          │
│    paid off.                                                │
│                                                             │
│         [ Continue Playing ]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Results Screen Improvements

### 6.1 Enhanced Results with Next Actions

**Purpose:** Guide players to next engagement action after game ends

```
RESULTS SCREEN (Redesigned)
┌─────────────────────────────────────────────────────────────┐
│  [X Close]                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│               🏆 You Won!                                   │
│                  or                                         │
│              Great game! 2nd place                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Score: 87 pts        Rank: 1st of 4                   │
│                                                             │
│  Words found: 14           Best word: CREATING (+12)        │
│  Accuracy: 92%             Max combo: 4x                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── New Achievements ──                                     │
│  ┌──────┐  ┌──────┐                                        │
│  │  🔥  │  │  ⚡  │   +2 achievements!                     │
│  │Combo │  │Speed │                                        │
│  │King  │  │Demon │                                        │
│  └──────┘  └──────┘                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── Almost There ──                                         │
│  📚 Word Master: 14/15 words                                │
│  ████████████████████████░░  (1 more word!)                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────┐          │
│  │         [ Play Again ]        (primary)       │          │
│  └───────────────────────────────────────────────┘          │
│                                                             │
│  ┌─────────────────┐ ┌───────────────────────────┐          │
│  │  [ Share Win ]  │ │  [ View Leaderboard ]     │          │
│  └─────────────────┘ └───────────────────────────┘          │
│                                                             │
│               [ Return to Home ]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Daily Challenge Improvements

### 7.1 Pre-Challenge Warm-up Option

**Purpose:** Reduce anxiety about one-attempt-only format

```
DAILY CHALLENGE SCREEN
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    Daily Challenge #342                                     │
│                                                             │
│    🔥 Your streak: 15 days                                  │
│                                                             │
│    Today's puzzle awaits!                                   │
│    You get one attempt.                                     │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │         [ Start Challenge ]     (primary)    │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │         [ Warm up first ]       (secondary)  │        │
│    │    Practice with a random puzzle              │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│    ── How you compare ──                                    │
│    Average score today: 62 pts                              │
│    Your best: 78 pts                                        │
│    Top score: 124 pts                                       │
│                                                             │
│    Next puzzle in: 14:32:18                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Clear Reset Time Display

**Purpose:** Remove timezone confusion about when daily resets

```
DAILY CHALLENGE - COMPLETED STATE
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ✓ Today's Challenge Complete!                            │
│                                                             │
│    Your score: 72 pts                                       │
│    Rank: #156 of 2,341 players                              │
│                                                             │
│    🔥 16 Day Streak!                                        │
│                                                             │
│    ┌───────────────────────────────────────────────┐        │
│    │                                               │        │
│    │  Next puzzle available in:                    │        │
│    │                                               │        │
│    │         14 : 32 : 18                          │        │
│    │        hours  min   sec                       │        │
│    │                                               │        │
│    │  Tomorrow at 00:00 UTC                        │        │
│    │  (5:00 PM your time)                          │        │
│    │                                               │        │
│    │  [ Set Reminder ]                             │        │
│    └───────────────────────────────────────────────┘        │
│                                                             │
│    ── While you wait ──                                     │
│                                                             │
│    [ Play Single Player ]  [ Create Multiplayer Room ]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Mobile-Specific Wireframes

### 8.1 Bottom Navigation Enhancement

```
MOBILE BOTTOM TAB BAR
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [GAME CONTENT]                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  🏠     │ │  📊     │ │  💬     │ │  👤     │           │
│  │  Home   │ │Scores   │ │  Chat   │ │Profile  │           │
│  │         │ │  (●)    │ │  (2)    │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘

(●) = Live update indicator
(2) = Unread message count
```

### 8.2 Swipe Gesture Guide (First Game)

```
FIRST GAME SWIPE TUTORIAL
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │              [GAME GRID]                            │    │
│  │                                                     │    │
│  │         ←──────────────→                            │    │
│  │            Swipe to                                 │    │
│  │          connect letters                            │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌───────────────────────────────────────────────┐          │
│  │  👆 Drag your finger to connect letters        │          │
│  │     Lift to submit word                        │          │
│  │                                 [Got it]       │          │
│  └───────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Wireframe | Priority | Effort | Impact |
|-----------|----------|--------|--------|
| 2.1 Streamlined Onboarding | P1 | Medium | High |
| 3.1 One-Tap Sharing | P1 | Low | High |
| 3.2 Auto-Fill Bots | P1 | Medium | High |
| 4.1 Achievement Progress | P2 | Low | Medium |
| 5.1 Streak Freeze | P2 | Medium | High |
| 1.1 Gameplay Preview | P2 | Low | Medium |
| 6.1 Enhanced Results | P2 | Low | Medium |
| 7.1 Warm-up Option | P3 | Low | Medium |
| 3.3 Late Joiner Play | P3 | High | Medium |
| 5.2 Streak Recovery | P3 | Medium | Medium |

---

*Wireframe specifications created: 2025-12-26*
*Based on: Journey map pain points and opportunity analysis*
*Format: ASCII wireframes for development handoff*
