# LexiClash Product Backlog

## Overview

This prioritized backlog contains user stories derived from journey map analysis, organized by priority tier. Each item includes acceptance criteria, effort estimate, and expected impact.

---

## Prioritization Framework

**Priority Tiers:**
- **P1 (Critical):** High impact + addresses critical pain points
- **P2 (High):** High impact OR high frequency issues
- **P3 (Medium):** Medium impact improvements
- **P4 (Low):** Nice-to-have enhancements

**Effort Scale:**
- **XS:** < 1 day
- **S:** 1-2 days
- **M:** 3-5 days
- **L:** 1-2 weeks
- **XL:** 2+ weeks

**Impact Scale:**
- **High:** >20% improvement in target metric
- **Medium:** 10-20% improvement
- **Low:** <10% improvement

---

## P1: Critical Priority

### P1-001: Streamlined Onboarding Flow

**User Story:**
> As a new player, I want to start playing quickly so that I don't lose interest before experiencing the game.

**Current State:**
- 6-step onboarding process
- ~90-140 seconds to complete
- ~30% estimated drop-off

**Proposed State:**
- 3-step essential onboarding
- ~45 seconds to complete
- Advanced concepts taught in-game contextually

**Acceptance Criteria:**
- [ ] Profile setup (avatar + name) in single screen
- [ ] Interactive grid demo with one guided word
- [ ] Quick tips screen (skippable)
- [ ] Combo, earthquake, fire round explained via in-game tooltips
- [ ] First-time hints stored in localStorage
- [ ] Skip option available on all steps

**Effort:** M (3-5 days)
**Impact:** High (+20% activation rate)
**Metric:** Onboarding completion rate, D1 retention

---

### P1-002: One-Tap Room Sharing

**User Story:**
> As a room host, I want to share my room with one tap so that I can quickly invite friends without friction.

**Current State:**
- Multiple taps required to share
- Separate flows for different platforms
- No pre-filled messages

**Proposed State:**
- Single share button opens unified share sheet
- Pre-filled messages with room code and link
- QR code always visible in lobby

**Acceptance Criteria:**
- [ ] Share button triggers native share sheet OR custom share modal
- [ ] Copy link copies full URL with one tap
- [ ] WhatsApp button opens pre-filled message
- [ ] QR code visible in room lobby
- [ ] "Copied!" toast feedback on copy actions
- [ ] Share modal dismissible

**Effort:** S (1-2 days)
**Impact:** High (+50% share rate)
**Metric:** Share conversion rate, room join rate

---

### P1-003: Auto-Fill Bots When Waiting

**User Story:**
> As a host waiting for players, I want the option to fill empty spots with bots so that I don't have to wait indefinitely.

**Current State:**
- Host waits for players manually
- No auto-start option
- Players abandon after long waits

**Proposed State:**
- Toggle to fill with bots at game start
- Optional auto-start after 30 seconds
- Prompt appears after 30s of waiting

**Acceptance Criteria:**
- [ ] "Fill empty spots with bots" toggle in lobby
- [ ] "Auto-start after 30 seconds" toggle
- [ ] Prompt after 30s: "Still waiting? Add bots and start now"
- [ ] Bots match room difficulty setting
- [ ] Bots have distinct names and avatars
- [ ] Works for 2-8 player rooms

**Effort:** M (3-5 days)
**Impact:** High (+30% multiplayer completion)
**Metric:** Multiplayer abandonment rate, game start rate

---

### P1-004: First Game Contextual Guidance

**User Story:**
> As a first-time player, I want helpful hints during my first game so that I understand the mechanics without feeling overwhelmed.

**Current State:**
- All concepts explained in onboarding
- No guidance during actual gameplay
- Players often confused by combos, special rounds

**Proposed State:**
- In-game tooltips appear at relevant moments
- First combo triggers combo explanation
- First earthquake triggers earthquake explanation
- Hints only appear once per player

**Acceptance Criteria:**
- [ ] Combo tooltip appears on first combo achieved
- [ ] Earthquake tooltip appears on first earthquake warning
- [ ] Fire round tooltip appears on first fire round
- [ ] Tooltips dismissable with tap
- [ ] Shown state persisted in localStorage
- [ ] Tooltips positioned to not block gameplay

**Effort:** S (1-2 days)
**Impact:** High (+25% first game completion)
**Metric:** First game completion rate, D1 retention

---

## P2: High Priority

### P2-001: Achievement Progress Visibility

**User Story:**
> As an active player, I want to see my progress toward achievements so that I know what goals to work toward.

**Current State:**
- Achievements shown on unlock only
- No progress indicators
- Full list only on profile page

**Proposed State:**
- "Almost there" section showing near achievements
- Progress bars on achievement tiles
- In-game progress indicator (optional)

**Acceptance Criteria:**
- [ ] Profile shows "Almost There" section with 2-3 closest achievements
- [ ] Achievement tiles show progress bar (e.g., "4/5 words")
- [ ] Progress updates after each game
- [ ] Optional: subtle in-game progress for tracked achievement
- [ ] "Next goal" suggestion in results screen

**Effort:** S (1-2 days)
**Impact:** Medium (+15% engagement)
**Metric:** Achievement unlock rate, session frequency

---

### P2-002: Streak Freeze Feature

**User Story:**
> As a streak player, I want streak freezes to protect my progress so that I don't lose my streak to a single missed day.

**Current State:**
- Streak breaks on any missed day
- No recovery mechanism
- High anxiety and churn on break

**Proposed State:**
- Earn streak freezes through play
- Auto-applies if day is missed
- Max 2-3 freezes stored

**Acceptance Criteria:**
- [ ] Players earn freezes at milestones (7 days, 50 games, etc.)
- [ ] Freeze auto-applies if daily challenge missed
- [ ] Max 3 freezes can be stored
- [ ] Freeze used indicator shown on return
- [ ] Freeze count visible in daily challenge UI
- [ ] Freeze earn conditions shown in profile

**Effort:** M (3-5 days)
**Impact:** High (+15% D30 retention)
**Metric:** Streak length, retention after streak break

---

### P2-003: Gameplay Preview on Landing

**User Story:**
> As a new visitor, I want to see gameplay before committing so that I understand what the game is like.

**Current State:**
- No gameplay preview
- Static mode cards only
- Users must commit to see gameplay

**Proposed State:**
- Auto-playing video/GIF of gameplay
- Shows word formation, scoring, timer
- Clear value proposition

**Acceptance Criteria:**
- [ ] 15-second gameplay loop video (MP4 + GIF fallback)
- [ ] Autoplay muted on page load
- [ ] Shows: grid, word formation, score popup, timer
- [ ] Positioned between hero and mode cards
- [ ] Tap to expand full-screen
- [ ] Tagline: "Find words. Beat friends. 2 minutes."

**Effort:** S (1-2 days)
**Impact:** Medium (+15% landing conversion)
**Metric:** Landing page to first game conversion

---

### P2-004: Enhanced Results Screen

**User Story:**
> As a player finishing a game, I want clear next steps so that I know what to do after seeing my results.

**Current State:**
- Results show score and achievements
- Next actions scattered/unclear
- "Almost there" achievements not shown

**Acceptance Criteria:**
- [ ] Clear primary CTA: "Play Again"
- [ ] Secondary CTAs: "Share Win", "View Leaderboard"
- [ ] Show newly unlocked achievements
- [ ] Show "Almost there" achievements with progress
- [ ] Clear exit path to home
- [ ] Win/loss messaging appropriate to outcome

**Effort:** S (1-2 days)
**Impact:** Medium (+10% replay rate)
**Metric:** Games per session, share rate

---

### P2-005: Daily Challenge Warm-up Option

**User Story:**
> As a daily challenge player, I want to warm up before my one attempt so that I feel prepared and less anxious.

**Current State:**
- One attempt only, no warm-up
- High stakes create anxiety
- Some players avoid due to pressure

**Proposed State:**
- "Warm up first" option with random puzzle
- Practice puzzle doesn't count toward daily
- Clear messaging about one-attempt rule

**Acceptance Criteria:**
- [ ] "Warm up first" button on daily challenge screen
- [ ] Warm-up uses random (non-daily) grid
- [ ] Clear indicator that warm-up doesn't count
- [ ] Return to daily challenge after warm-up
- [ ] Track warm-up usage for analytics

**Effort:** S (1-2 days)
**Impact:** Medium (+10% daily challenge participation)
**Metric:** Daily challenge start rate, completion rate

---

## P3: Medium Priority

### P3-001: Late Joiner Participation

**User Story:**
> As a late joiner, I want to play for partial credit so that I can participate instead of just watching.

**Current State:**
- Late joiners become spectators
- No gameplay option
- Frustrating experience

**Proposed State:**
- Option to join late and play
- Score prorated by time played
- Clear indicator of late join status

**Acceptance Criteria:**
- [ ] "Join late" option when game in progress
- [ ] Score multiplied by percentage of time played
- [ ] In-game indicator shows late join status
- [ ] Results show adjusted score calculation
- [ ] Option to watch instead remains available

**Effort:** L (1-2 weeks)
**Impact:** Medium (+20% late joiner satisfaction)
**Metric:** Late joiner retention, multiplayer NPS

---

### P3-002: Streak Recovery Challenge

**User Story:**
> As a player who broke my streak, I want a chance to recover it so that I don't feel permanently penalized for one miss.

**Current State:**
- Streak permanently lost on miss
- No recovery option
- High churn after streak break

**Proposed State:**
- "Recovery Challenge" within 24 hours
- Win 3 games to restore streak
- One-time recovery per streak

**Acceptance Criteria:**
- [ ] Recovery option offered on streak break screen
- [ ] Challenge: win 3 games in 24 hours
- [ ] Progress tracker during challenge
- [ ] Success restores previous streak length
- [ ] Failure starts new streak from 0
- [ ] Only offered once per streak

**Effort:** M (3-5 days)
**Impact:** Medium (+10% retention after break)
**Metric:** Return rate after streak break

---

### P3-003: Quick Play Button

**User Story:**
> As a casual visitor, I want to start playing immediately so that I don't have to make decisions before trying the game.

**Current State:**
- Must choose between single/multiplayer
- Decision paralysis for new users

**Proposed State:**
- "Quick Play" option starts immediately
- Single player vs 2 medium bots
- Bypasses decision fatigue

**Acceptance Criteria:**
- [ ] "Quick Play" button prominent on landing
- [ ] Starts single player with 2 medium bots
- [ ] Uses minimal onboarding (or none if returning)
- [ ] Clear path to other modes after game

**Effort:** XS (< 1 day)
**Impact:** Medium (+10% activation)
**Metric:** First game start rate

---

### P3-004: Clear Daily Reset Timer

**User Story:**
> As a daily challenge player, I want to know exactly when the next puzzle is available so that I don't miss it or get confused.

**Current State:**
- Countdown shows time remaining
- No indication of timezone
- Confusion about reset time

**Proposed State:**
- Countdown with hours:minutes:seconds
- Local time conversion shown
- "Set reminder" option

**Acceptance Criteria:**
- [ ] Large countdown timer (HH:MM:SS)
- [ ] Show "Tomorrow at [local time]" below
- [ ] "Set reminder" button (notification or calendar)
- [ ] Clear messaging for timezone

**Effort:** XS (< 1 day)
**Impact:** Low (+5% daily challenge engagement)
**Metric:** Daily challenge return rate

---

### P3-005: Shareable Stats Cards

**User Story:**
> As a proud player, I want to share my achievements visually so that I can show off on social media.

**Current State:**
- Share options are text-based
- No visual share cards
- Limited viral potential

**Proposed State:**
- Generate image cards with stats
- Instagram-story sized
- Weekly recap cards

**Acceptance Criteria:**
- [ ] Generate achievement card images
- [ ] Generate weekly stats recap cards
- [ ] 9:16 aspect ratio for stories
- [ ] Include game branding
- [ ] One-tap share to platforms

**Effort:** M (3-5 days)
**Impact:** Medium (+30% share completion)
**Metric:** Share completion rate, viral coefficient

---

## P4: Low Priority

### P4-001: Referral Rewards Program

**User Story:**
> As an engaged player, I want rewards for inviting friends so that I'm incentivized to spread the game.

**Acceptance Criteria:**
- [ ] Unique referral link per player
- [ ] XP bonus when referral plays first game
- [ ] Exclusive avatar after 5 referrals
- [ ] Leaderboard for top referrers
- [ ] Track referral source analytics

**Effort:** L (1-2 weeks)
**Impact:** Medium (viral growth)
**Metric:** Viral coefficient, referral conversion

---

### P4-002: Skill-Based Matchmaking

**User Story:**
> As a competitive player, I want to play against similarly skilled opponents so that games feel fair.

**Acceptance Criteria:**
- [ ] Hidden skill rating per player
- [ ] Rating adjusts after each game
- [ ] Matchmaking considers skill for public rooms
- [ ] Skill brackets visible (Bronze, Silver, Gold, etc.)

**Effort:** XL (2+ weeks)
**Impact:** Medium (competitive engagement)
**Metric:** Multiplayer retention, NPS

---

### P4-003: Tournament Creation

**User Story:**
> As a community organizer, I want to create tournaments so that I can host competitive events.

**Acceptance Criteria:**
- [ ] Create tournament with 4-16 players
- [ ] Bracket generation
- [ ] Scheduled start times
- [ ] Shareable tournament invite
- [ ] Results and bracket tracking

**Effort:** XL (2+ weeks)
**Impact:** Low (niche feature)
**Metric:** Tournament creation rate, engagement

---

### P4-004: Friends Activity Feed

**User Story:**
> As a social player, I want to see what my friends are doing so that I feel connected to the community.

**Acceptance Criteria:**
- [ ] Friend list feature
- [ ] Activity feed showing friend games/achievements
- [ ] Invite friends to play
- [ ] Friend leaderboard

**Effort:** XL (2+ weeks)
**Impact:** Medium (social engagement)
**Metric:** Multiplayer rate, D30 retention

---

### P4-005: Seasonal Challenges

**User Story:**
> As a long-term player, I want fresh challenges regularly so that the game stays interesting.

**Acceptance Criteria:**
- [ ] Monthly/seasonal themed challenges
- [ ] Limited-time achievements
- [ ] Seasonal leaderboards
- [ ] Exclusive rewards

**Effort:** L (1-2 weeks)
**Impact:** Medium (long-term retention)
**Metric:** D60+ retention, MAU

---

## Sprint Planning Recommendations

### Sprint 1 (Recommended)
Focus: First-time user experience

| Item | Story Points | Notes |
|------|--------------|-------|
| P1-001 Streamlined Onboarding | 5 | Core improvement |
| P1-004 Contextual Guidance | 3 | Complements onboarding |
| P2-003 Gameplay Preview | 2 | Quick win for landing |
| **Total** | **10** | |

### Sprint 2 (Recommended)
Focus: Multiplayer friction

| Item | Story Points | Notes |
|------|--------------|-------|
| P1-002 One-Tap Sharing | 2 | Quick win |
| P1-003 Auto-Fill Bots | 5 | Major pain point |
| P3-003 Quick Play | 1 | Simple addition |
| **Total** | **8** | |

### Sprint 3 (Recommended)
Focus: Retention mechanics

| Item | Story Points | Notes |
|------|--------------|-------|
| P2-002 Streak Freeze | 5 | Retention critical |
| P2-001 Achievement Progress | 2 | Engagement driver |
| P3-004 Daily Reset Timer | 1 | Quick fix |
| **Total** | **8** | |

### Sprint 4 (Recommended)
Focus: Post-game experience

| Item | Story Points | Notes |
|------|--------------|-------|
| P2-004 Enhanced Results | 2 | Better flow |
| P2-005 Daily Warm-up | 2 | Reduces anxiety |
| P3-002 Streak Recovery | 5 | Churn prevention |
| **Total** | **9** | |

---

## Success Metrics Dashboard

### Activation Metrics
| Metric | Current | Target | Owner |
|--------|---------|--------|-------|
| Landing → First Game | TBD | +20% | Product |
| Onboarding Completion | TBD | 85% | Product |
| D1 Retention | TBD | 45% | Growth |

### Engagement Metrics
| Metric | Current | Target | Owner |
|--------|---------|--------|-------|
| Games per Session | TBD | 2.0+ | Product |
| Achievement Unlock Rate | TBD | +25% | Product |
| Daily Challenge Rate | TBD | 50% DAU | Product |

### Retention Metrics
| Metric | Current | Target | Owner |
|--------|---------|--------|-------|
| D7 Retention | TBD | 25% | Growth |
| D30 Retention | TBD | 12% | Growth |
| Streak Length Avg | TBD | 14 days | Product |

### Viral Metrics
| Metric | Current | Target | Owner |
|--------|---------|--------|-------|
| Share Rate | TBD | 10% | Growth |
| Referral Conversion | TBD | 40% | Growth |
| Viral Coefficient | TBD | 0.3+ | Growth |

---

## Appendix: User Story Template

```markdown
### [ID]: [Title]

**User Story:**
> As a [user type], I want [goal] so that [benefit].

**Current State:**
- [Current behavior/pain point]

**Proposed State:**
- [Desired behavior/solution]

**Acceptance Criteria:**
- [ ] [Specific requirement]
- [ ] [Specific requirement]
- [ ] [Specific requirement]

**Effort:** [XS/S/M/L/XL]
**Impact:** [High/Medium/Low]
**Metric:** [Primary metric to track]
```

---

*Product backlog created: 2025-12-26*
*Based on: LexiClash journey map and UX research*
*Methodology: User story mapping with impact/effort prioritization*
