# LexiClash Player Journey Map

## Executive Summary

This journey map documents the complete player experience across LexiClash (Boggle), from initial discovery through long-term engagement. Based on codebase analysis, the map identifies key touchpoints, emotional states, pain points, and opportunities for UX improvement.

---

## Player Personas

### Persona 1: "Casual Casey" - The Social Gamer
| Attribute | Details |
|-----------|---------|
| **Age** | 25-35 |
| **Play Style** | Casual, social-first |
| **Motivation** | Fun with friends, quick entertainment |
| **Tech Comfort** | Moderate |
| **Session Length** | 5-15 minutes |
| **Primary Mode** | Multiplayer |

**Goals:**
- Quick games during breaks
- Play with friends remotely
- Easy to pick up, no commitment

**Frustrations:**
- Complex onboarding
- Waiting for others
- Technical issues during play

---

### Persona 2: "Competitive Chris" - The Achievement Hunter
| Attribute | Details |
|-----------|---------|
| **Age** | 20-40 |
| **Play Style** | Competitive, goal-oriented |
| **Motivation** | Rankings, achievements, mastery |
| **Tech Comfort** | High |
| **Session Length** | 15-45 minutes |
| **Primary Mode** | Daily Challenge + Ranked |

**Goals:**
- Climb leaderboards
- Unlock all achievements
- Maintain daily streaks
- Beat personal bests

**Frustrations:**
- Unfair matchmaking
- Lost progress
- Unclear achievement criteria

---

### Persona 3: "Daily Dana" - The Routine Player
| Attribute | Details |
|-----------|---------|
| **Age** | 30-55 |
| **Play Style** | Habitual, solo |
| **Motivation** | Daily mental exercise, routine |
| **Tech Comfort** | Low-moderate |
| **Session Length** | 5-10 minutes |
| **Primary Mode** | Daily Challenge |

**Goals:**
- Quick daily brain exercise
- Maintain streaks
- Track improvement over time
- Simple, predictable experience

**Frustrations:**
- Complex UI changes
- Missing streak due to confusion
- Too much visual noise

---

## Journey Stages Overview

```
┌─────────────┬──────────────┬─────────────┬──────────────┬─────────────┬──────────────┐
│  AWARENESS  │  ONBOARDING  │   FIRST     │   ACTIVE     │  RETENTION  │   ADVOCACY   │
│             │              │   GAME      │   PLAYER     │             │              │
├─────────────┼──────────────┼─────────────┼──────────────┼─────────────┼──────────────┤
│ Discovery   │ Tutorial     │ Mode        │ Regular      │ Daily       │ Share wins   │
│ Landing     │ Profile      │ Selection   │ Sessions     │ Challenges  │ Invite       │
│ page        │ Setup        │ Gameplay    │ Achievements │ Streaks     │ friends      │
│             │              │ Results     │ XP/Leveling  │ Comebacks   │ Promote      │
└─────────────┴──────────────┴─────────────┴──────────────┴─────────────┴──────────────┘
```

---

## Detailed Journey Map

### Stage 1: AWARENESS & DISCOVERY

| Element | Details |
|---------|---------|
| **Touchpoints** | Landing page, shared links, QR codes, social shares |
| **User Actions** | Visits site, reads value prop, views game modes |
| **Thoughts** | "What is this?", "Looks fun", "Is it free?" |
| **Emotions** | Curious → Interested |
| **Pain Points** | - No preview of actual gameplay<br>- Value prop could be clearer<br>- No video demo |
| **Opportunities** | - Add gameplay preview/video<br>- Clearer mode descriptions<br>- Social proof (player count) |

**Current State:**
- Two main CTAs: Single Player & Multiplayer
- Live badges showing active rooms/players
- "How to Play" link available

**Emotional Journey:** Curiosity (6/10) → Interest (7/10)

---

### Stage 2: ONBOARDING

| Element | Details |
|---------|---------|
| **Touchpoints** | 6-step tutorial modal, avatar selection, name setup |
| **User Actions** | Views demo, tries interactive grid, sets profile |
| **Thoughts** | "How do I play?", "This looks simple", "Let me try" |
| **Emotions** | Uncertain → Confident |
| **Pain Points** | - 6 steps may be too long for casuals<br>- Interactive demo on Step 1 only<br>- Combo system explanation complex |
| **Opportunities** | - Progressive disclosure (basics first)<br>- Skip to game option<br>- In-game contextual hints |

**Current Flow:**
1. Welcome Demo (interactive grid)
2. Combo System explanation
3. Special Rounds (Earthquake, Fire)
4. Avatar Selection
5. Display Name
6. Mode Selection

**Emotional Journey:** Uncertain (4/10) → Learning (6/10) → Confident (8/10)

---

### Stage 3: FIRST GAME EXPERIENCE

#### 3A: Single Player Path

| Element | Details |
|---------|---------|
| **Touchpoints** | Mode selection, difficulty, game UI, results |
| **User Actions** | Picks mode, plays 2-3 min game, views score |
| **Thoughts** | "Can I beat the bots?", "What words work?", "Time pressure!" |
| **Emotions** | Excited → Focused → Satisfied/Frustrated |
| **Pain Points** | - Bot difficulty unclear<br>- First game often overwhelming<br>- No practice without timer |
| **Opportunities** | - Untimed practice mode<br>- Difficulty recommendations<br>- First-game guidance overlay |

#### 3B: Multiplayer Path

| Element | Details |
|---------|---------|
| **Touchpoints** | Create/Join selection, lobby, waiting room, game, results |
| **User Actions** | Creates room OR joins via code, waits, plays, views rankings |
| **Thoughts** | "Will my friends join?", "Who's winning?", "That was close!" |
| **Emotions** | Anticipation → Impatient → Competitive → Triumphant/Defeated |
| **Pain Points** | - Waiting time in lobby<br>- Room code sharing friction<br>- Connection issues<br>- Late joiners become spectators |
| **Opportunities** | - Auto-fill with bots option<br>- Streamlined sharing flow<br>- Mini-games while waiting<br>- Late-join catch-up mechanics |

#### 3C: Daily Challenge Path

| Element | Details |
|---------|---------|
| **Touchpoints** | Daily puzzle screen, game, global leaderboard |
| **User Actions** | Starts daily puzzle, plays 2 min, compares globally |
| **Thoughts** | "Can I beat yesterday?", "Where do I rank?", "Same puzzle as everyone!" |
| **Emotions** | Routine → Focused → Competitive |
| **Pain Points** | - One attempt only (high stakes)<br>- No warm-up option<br>- Timezone confusion on reset |
| **Opportunities** | - Practice mode with past puzzles<br>- Clear countdown to next puzzle<br>- Regional leaderboards |

**First Game Emotional Journey:**
```
Excitement    ████████░░ 8/10
Focus         █████████░ 9/10
Satisfaction  ███████░░░ 7/10 (win) / 4/10 (loss)
```

---

### Stage 4: ACTIVE PLAYER

| Element | Details |
|---------|---------|
| **Touchpoints** | Game modes, achievements, leaderboards, XP system, profile |
| **User Actions** | Regular sessions, unlocks achievements, checks rankings |
| **Thoughts** | "What achievement is next?", "Am I improving?", "New best!" |
| **Emotions** | Engaged → Accomplished → Motivated |
| **Pain Points** | - Achievement progress not visible<br>- No skill-based matchmaking<br>- Limited variety in game modes |
| **Opportunities** | - Achievement tracker dashboard<br>- Skill brackets<br>- Seasonal challenges<br>- New game variants |

**Engagement Mechanics Present:**
- 35+ achievements across categories
- XP & leveling system
- Win streak tracking
- Combo mastery progression

**Active Player Emotional Journey:**
```
Engagement    █████████░ 9/10
Mastery       ███████░░░ 7/10
Satisfaction  ████████░░ 8/10
```

---

### Stage 5: RETENTION

| Element | Details |
|---------|---------|
| **Touchpoints** | Daily challenges, streak system, push notifications, leaderboards |
| **User Actions** | Returns daily, maintains streaks, checks standings |
| **Thoughts** | "Don't want to break my streak", "Wonder if I'm still ranked", "Quick daily game" |
| **Emotions** | Habitual → Obligated → Proud |
| **Pain Points** | - Streak anxiety (fear of losing)<br>- No streak recovery option<br>- Notifications may be ignored<br>- Content repetition |
| **Opportunities** | - Streak freeze items<br>- Weekly challenges variety<br>- Friends activity feed<br>- Comeback rewards |

**Retention Mechanics Present:**
- Daily streak tracking
- Daily challenge with global leaderboard
- Win streak celebrations
- Sign-up prompt after first win (converts guests)

**Retention Risk Points:**
1. **Day 3**: Initial novelty wears off
2. **Day 7**: Need habit formation trigger
3. **Day 30**: Long-term engagement decision
4. **Streak break**: High churn risk moment

---

### Stage 6: ADVOCACY

| Element | Details |
|---------|---------|
| **Touchpoints** | Share buttons, room codes, QR codes, social posts |
| **User Actions** | Shares wins, invites friends, creates rooms for groups |
| **Thoughts** | "My friends would like this", "Look at my score!", "Let's play together" |
| **Emotions** | Pride → Social → Generous |
| **Pain Points** | - Share friction (multiple taps)<br>- No referral incentives<br>- Limited share formats |
| **Opportunities** | - One-tap sharing<br>- Referral rewards program<br>- Shareable stats cards<br>- Tournament creation |

**Current Share Options:**
- Copy link
- WhatsApp share
- QR code generation
- Native share sheet (mobile)

---

## Emotional Journey Summary

```
                    First Win!    Streak!    Top 10!
                         ↑           ↑          ↑
Positive  ──────────────────────────────────────────────
Emotion        ╱╲          ╱╲        ╱╲
              ╱  ╲        ╱  ╲      ╱  ╲
Neutral  ────╱────╲──────╱────╲────╱────╲────────────────
            ╱      ╲    ╱      ╲  ╱      ╲
           ╱        ╲  ╱        ╲╱        ╲
Negative ─╱──────────╲╱──────────────────────────────────
          ↑          ↑           ↑
       Confusing   Lost      Streak
       Onboarding  Game      Broken

      DISCOVERY → ONBOARDING → FIRST GAME → ACTIVE → RETENTION
```

---

## Pain Points Summary (Prioritized)

### Critical (High Impact, High Frequency)
1. **Multiplayer waiting friction** - Players abandon while waiting for others
2. **First game overwhelm** - Too much happening without guidance
3. **Streak anxiety** - Fear of losing progress causes stress/abandonment

### Major (High Impact, Medium Frequency)
4. **Room sharing friction** - Multiple steps to invite friends
5. **Late joiner spectator mode** - Frustrating to watch, not play
6. **Achievement visibility** - Progress toward next unlock unclear

### Minor (Medium Impact)
7. **Onboarding length** - 6 steps may lose casual players
8. **Bot difficulty clarity** - Unclear what to expect
9. **Timezone confusion** - Daily reset time unclear

---

## Opportunity Matrix

| Opportunity | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| One-tap room sharing | High | Low | **P1** |
| Auto-fill with bots when waiting | High | Medium | **P1** |
| Achievement progress tracker | High | Low | **P1** |
| Streak freeze items | High | Medium | **P2** |
| In-game guidance for first play | Medium | Low | **P2** |
| Practice mode (untimed) | Medium | Low | **P2** |
| Friends activity feed | Medium | High | **P3** |
| Referral rewards program | Medium | High | **P3** |
| Skill-based matchmaking | Medium | High | **P3** |

---

## Recommended Actions

### Quick Wins (1-2 days)
1. **Simplify sharing** - Single-tap share button in lobby
2. **Add achievement progress** - Show "3/5 words for X badge" in UI
3. **Clarify daily reset** - Add countdown timer on daily challenge

### Short-term (1-2 weeks)
4. **Auto-fill lobby** - Option to add bots after 30s wait
5. **First-game overlay** - Contextual hints during first match
6. **Reduce onboarding** - 3 essential steps, rest deferred

### Medium-term (1 month)
7. **Streak recovery** - Purchasable/earnable streak freeze
8. **Late-joiner participation** - Let them play for partial points
9. **Practice mode** - Untimed sandbox for learning

### Long-term (3+ months)
10. **Referral program** - Rewards for inviting friends
11. **Skill brackets** - Matchmaking based on performance
12. **Seasonal content** - Themed challenges and rewards

---

## Metrics to Track

### Acquisition
- Landing page → First game conversion rate
- Referral source effectiveness
- Share-to-join conversion

### Activation
- Onboarding completion rate
- First game completion rate
- Second session return rate

### Engagement
- Average session length
- Games per session
- Achievement unlock rate

### Retention
- D1, D7, D30 retention
- Daily challenge participation
- Streak length distribution

### Advocacy
- Share action rate
- Referral success rate
- Room creation frequency

---

## Appendix: User Flow Diagrams

### Multiplayer Flow
```
Landing → Mode Selection → Create/Join
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              Create Room          Join Room
                    ↓                   ↓
              Profile Setup       Enter Code/Browse
                    ↓                   ↓
              Host Lobby          Player Waiting
                    ↓                   ↓
              Start Game ─────────────→←
                    ↓
              In-Game (2-3 min)
                    ↓
              Results Screen
                    ↓
              ┌─────┴─────┐
              ↓           ↓
          Play Again    Exit
```

### Daily Challenge Flow
```
Landing → Daily Challenge Card
                ↓
         Check if Played Today
                ↓
        ┌───────┴───────┐
        ↓               ↓
    Not Played      Already Played
        ↓               ↓
    Start Game    Show Results
        ↓               ↓
    Play (120s)   Show Streak
        ↓               ↓
    Submit Score  Next Puzzle Timer
        ↓
    Global Ranking
        ↓
    Streak Update
```

---

*Document created: 2025-12-26*
*Based on: LexiClash codebase analysis*
*Methodology: UX journey mapping with emotional tracking*
