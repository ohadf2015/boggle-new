# LexiClash Customer Journey Map

## Multiplayer Game Flow - Complete User Journey

### Stage 1: Discovery & Landing

**Touchpoint:** Landing Page (/)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWARENESS                                        │
│  User finds LexiClash via: social share, search, friend invite          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LANDING PAGE                                     │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                  │
│  │ Single Player │ │  Multiplayer  │ │ Daily Challenge│                 │
│  │     Card      │ │     Card      │ │    Banner     │                  │
│  └───────────────┘ └───────────────┘ └───────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

| Moment | Emotion | Action | Thoughts | Pain Points | Opportunities |
|--------|---------|--------|----------|-------------|---------------|
| First visit | Curious | Scans page | "What is this game?" | No video/demo | Add game preview |
| Mode selection | Considering | Compares options | "Which mode fits me?" | Not clear differences | Better mode descriptions |
| Daily banner | Interested | Checks streak | "I want to keep my streak" | Small banner | Make more prominent |

**Emotional Arc:** Curious → Interested → Ready to Play

---

### Stage 2: Multiplayer Entry

**Touchpoint:** Multiplayer Lobby (/multiplayer)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MULTIPLAYER HUB                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  [  JOIN  ]        [  HOST  ]                                   │    │
│  │   ──────────        ──────────                                  │    │
│  │   Selected          Not Selected                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Username: [_________________]                                  │    │
│  │  Game Code: [_______] or Browse Rooms                           │    │
│  │                                                                 │    │
│  │  [ JOIN GAME ]                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Join Flow

| Moment | Emotion | Action | Thoughts | Pain Points | Opportunities |
|--------|---------|--------|----------|-------------|---------------|
| Arrive at lobby | Ready | Sees join/host tabs | "How do I get into a game?" | Two options unclear | Default to best option |
| Enter username | Focused | Types name | "What name should I use?" | No suggestions | Remember last name |
| Enter game code | Anxious | Types code | "Did I type it right?" | Case sensitivity | Auto-uppercase |
| Click join | Hopeful | Submits form | "Will this work?" | Error messages unclear | Better validation |

#### Host Flow

| Moment | Emotion | Action | Thoughts | Pain Points | Opportunities |
|--------|---------|--------|----------|-------------|---------------|
| Switch to host | Empowered | Clicks HOST tab | "I'll control the game" | Extra fields appear | Simpler defaults |
| Configure settings | Overwhelmed | Reviews options | "What settings do I pick?" | Too many choices | Presets (Quick, Party, Challenge) |
| Select difficulty | Uncertain | Chooses level | "Is Medium right for everyone?" | No guidance | Difficulty descriptions |
| Select language | Decisive | Picks language | "Which language works best?" | 4+ options | Remember preference |
| Create room | Excited | Clicks create | "Let's get this started!" | Loading uncertainty | Progress indicator |

**Emotional Arc:** Ready → Focused → Hopeful/Anxious → Excited

---

### Stage 3: Pre-Game Lobby

**Touchpoint:** Waiting Room

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     WAITING FOR PLAYERS                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ROOM CODE                                     │    │
│  │                     ABC123                                       │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                            │    │
│  │  │   QR    │ │ WhatsApp│ │  Copy   │                            │    │
│  │  │  Code   │ │  Share  │ │  Link   │                            │    │
│  │  └─────────┘ └─────────┘ └─────────┘                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Players: (2/8)                                                 │    │
│  │  👤 Alex (Host)     👤 Jordan                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  [ START GAME ]  (Host only)                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

| Moment | Emotion | Action | Thoughts | Pain Points | Opportunities |
|--------|---------|--------|----------|-------------|---------------|
| Enter lobby | Anticipation | Sees room code | "Now I share this with friends" | Code not prominent enough | Larger display |
| Share with friends | Social | Uses QR/link | "Will they figure out how to join?" | Multi-step for friends | One-tap join link |
| Wait for players | Impatient | Watches player list | "Hurry up and join!" | No ETA/progress | Estimated wait time |
| See player join | Excited | Notices new player | "They made it!" | Subtle notification | Sound/animation |
| Ready to start | Eager | Host clicks Start | "Let's go!" | Minimum player requirement? | Clear start conditions |

**Emotional Arc:** Anticipation → Social → Impatient → Excited → Eager

---

### Stage 4: Active Gameplay

**Touchpoint:** In-Game Screen

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⏱️ 2:45                                          🏆 Leaderboard        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │     ┌───┬───┬───┬───┐                          1. Alex: 45     │    │
│  │     │ B │ O │ G │ G │                          2. Jordan: 32   │    │
│  │     ├───┼───┼───┼───┤                          3. Sam: 28      │    │
│  │     │ L │ E │ S │ T │                                          │    │
│  │     ├───┼───┼───┼───┤                                          │    │
│  │     │ A │ R │ I │ N │                                          │    │
│  │     ├───┼───┼───┼───┤                                          │    │
│  │     │ D │ O │ W │ E │                                          │    │
│  │     └───┴───┴───┴───┘                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Found Words: BOG, BEST, STAR, RAIN, DOW...                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  [  Type word here...  ]   [ SUBMIT ]                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

| Moment | Emotion | Action | Thoughts | Pain Points | Opportunities |
|--------|---------|--------|----------|-------------|---------------|
| Game starts | Focused | Scans grid | "What words can I find?" | Information overload | Guided first 5 seconds |
| First word | Concentrated | Types word | "Please be valid!" | Typing speed stress | Auto-suggest? (careful) |
| Word accepted | Satisfied | Sees score update | "Yes! Got one!" | Subtle feedback | Bigger celebration |
| Word rejected | Frustrated | Sees rejection | "Why didn't that work?" | No explanation | Show why invalid |
| Check leaderboard | Competitive | Glances at scores | "Am I winning?" | Takes eyes off grid | Mini-leaderboard |
| Combo streak | Excited | Rapid submissions | "Keep the combo going!" | Combo timer unclear | Clearer combo UX |
| Fire round | Thrilled | Notices multiplier | "Double points time!" | Sudden change confusing | Better announcement |
| Last 30 seconds | Intense | Frantic searching | "Find more words!" | Time stress | Warning indicators |

**Emotional Arc:** Focused → Concentrated → Satisfied/Frustrated → Competitive → Intense

---

### Stage 5: Results & Resolution

**Touchpoint:** Results Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         🎉 WINNER 🎉                                     │
│                           ALEX                                           │
│                          72 Points                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  1. 🥇 Alex - 72 pts    │ Words: BEST(8), STAR(6), BOAR(6)...  │    │
│  │  2. 🥈 Jordan - 58 pts  │ Words: RAIN(6), DOW(4), TIN(3)...    │    │
│  │  3. 🥉 Sam - 45 pts     │ Words: BOG(5), SET(4), ART(4)...     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  [ PLAY AGAIN ]          [ EXIT ROOM ]          [ SHARE WIN ]           │
└─────────────────────────────────────────────────────────────────────────┘
```

| Moment | Emotion | Action | Thoughts | Pain Points | Opportunities |
|--------|---------|--------|----------|-------------|---------------|
| Game ends | Anticipation | Waits for results | "Did I win?" | Brief loading | Instant results |
| See winner | Joy/Disappointment | Views podium | "Yes!/Ah, next time" | Winner hogs attention | Celebrate everyone |
| Review words | Reflective | Scrolls word lists | "What did I miss?" | Hard to compare | Side-by-side view |
| Check XP earned | Motivated | Sees progression | "I'm leveling up!" | XP obscured | Prominent XP display |
| Share decision | Social | Considers sharing | "Should I share this?" | Extra steps | One-tap share |
| Play again | Eager | Clicks rematch | "One more game!" | Slow reload | Instant rematch |
| Exit | Satisfied | Leaves room | "That was fun!" | Abrupt exit | Thank you message |

**Emotional Arc:** Anticipation → Joy/Disappointment → Reflective → Motivated → Eager

---

## Critical Moments of Truth

### 1. First Game Join (Make or Break)
**Scenario:** New user receives a game link from friend
**Current Experience:** Click link → Enter username → Join game
**Friction Points:**
- Must enter username every time
- No preview of what they're joining
- Possible connection issues

**Recommendations:**
- Auto-generate fun username (can change later)
- Show game preview (players, language, difficulty)
- Connection status before join attempt

### 2. Sharing the Game Code
**Scenario:** Host needs to get friends into the game
**Current Experience:** Copy code → Send via messaging → Friends navigate and enter code
**Friction Points:**
- Multiple steps for both host and joiner
- Code can be mistyped
- Friends may go to wrong URL

**Recommendations:**
- Pre-formatted messages with join link
- Click-to-copy entire invite message
- QR code that opens directly in browser

### 3. First Word Submission
**Scenario:** Player submits their first word in a game
**Current Experience:** Type word → Submit → See result
**Friction Points:**
- Uncertain if word will be valid
- Unclear scoring feedback
- Keyboard may cover input on mobile

**Recommendations:**
- Real-time valid word indicator (while typing)
- Satisfying feedback animation for valid words
- Floating keyboard that doesn't obscure grid

### 4. Game End Transition
**Scenario:** Timer reaches zero
**Current Experience:** Abrupt stop → Loading → Results
**Friction Points:**
- Can feel sudden
- Brief uncertainty about outcome
- Transition can feel jarring

**Recommendations:**
- Countdown audio cues (5, 4, 3, 2, 1)
- Smooth fade transition to results
- Quick score flash before full results

---

## Emotion Mapping Summary

```
Journey Stage     Emotion Level (1-10)

Discovery         ████████░░ 8 (Curious, Interested)
Lobby Entry       █████████░ 9 (Ready, Focused)
Pre-Game Wait     ██████░░░░ 6 (Impatient, Anxious)
Active Gameplay   ██████████ 10 (Intense, Competitive)
Results           ████████░░ 8 (Reflective, Motivated)
```

### Emotion Dips to Address
1. **Pre-Game Wait:** Add mini-games or tips while waiting
2. **Word Rejection:** Explain why words are invalid
3. **Losing:** Celebrate improvement, not just wins

---

## Service Blueprint Layers

### Frontstage (User Sees)
- Landing page UI
- Lobby interface
- Game grid and timer
- Results and leaderboards

### Backstage (User Doesn't See)
- Socket.IO connections
- Word validation engine
- Score calculations
- Session persistence

### Support Processes
- Dictionary management
- Server scaling
- Error monitoring
- Analytics tracking

---

## Key Metrics to Track

| Journey Stage | Primary Metric | Target |
|---------------|----------------|--------|
| Discovery | Landing → Mode Selection | >80% |
| Lobby Entry | Mode Selection → Room Join | >70% |
| Pre-Game | Room Join → Game Start | >90% |
| Gameplay | Game Completion Rate | >95% |
| Results | Play Again Rate | >40% |
| Retention | Day 1 Return Rate | >30% |

---

*Created: December 25, 2024*
*Based on: LexiClash codebase analysis and UX best practices*
