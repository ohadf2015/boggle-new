---
name: game-designer
description: Game design specialist for improving LexiClash playability, researching competitors, and suggesting viral features. This skill should be used when analyzing game mechanics, proposing new features, improving player engagement, researching similar word games, or brainstorming ideas to make the game more fun, unique, and shareable. Covers player psychology, retention strategies, viral loops, and competitive differentiation.
---

# Game Designer Skill

Expert game design guidance for LexiClash, a real-time multiplayer word game with neo-brutalist aesthetics.

## LexiClash Current State

### Core Mechanics
- **Board Sizes**: 5x5 (Easy), 7x7 (Medium), 9x9 (Hard)
- **Combo System**: 8-second window, up to 2.25x multiplier
- **Rarity Scoring**: Common (1x) → Legendary (2x) based on discovery rates
- **Fire Rounds**: 2x multiplier during special events
- **Multi-layer Validation**: Dictionary + Community voting + AI fallback

### Game Modes
1. **Multiplayer**: Real-time 2-unlimited players, tournaments, ranked
2. **Single-Player**: Solo vs bots, practice, challenge mode
3. **Daily Word Hunt**: Wordle-style daily puzzle with streaks

### Engagement Features
- 30+ achievements (speed, volume, length, combo categories)
- XP progression (100 levels, 600+ hours to max)
- Global and daily leaderboards
- Streak tracking with milestones
- Shareable emoji-based results

### Tech Stack
- Next.js 16 + React 19 + Socket.IO + Supabase
- 5 languages: English, Hebrew, Swedish, Japanese, Spanish

## Design Analysis Framework

### 1. Player Motivation (Bartle's Taxonomy)
- **Achievers**: Progression, unlocks, completion
- **Explorers**: Discovery, hidden content, rare words
- **Socializers**: Interaction, connection, sharing
- **Killers**: Competition, dominance, leaderboards

### 2. Engagement Loop Evaluation
- **Core Loop** (seconds): Action → Feedback → Reward
- **Session Loop** (minutes): Start → Peak → Resolution
- **Retention Loop** (days): Progress → Goal → Return
- **Social Loop** (ongoing): Play → Share → Invite → Play

### 3. Feature Impact Matrix
Rate each feature on:
- **Fun Factor** (1-10): How enjoyable?
- **Retention Impact** (1-10): Brings players back?
- **Viral Coefficient** (0-2): Spreads organically?
- **Implementation Effort** (S/M/L/XL)

## Research Process

### Competitive Research
Reference [references/competitive-analysis.md](references/competitive-analysis.md) for detailed breakdowns of:
- Word game competitors (Wordle, Scrabble GO, Words With Friends)
- Party game references (Jackbox, Kahoot, Gartic Phone)
- Viral game case studies

### Game Psychology
Reference [references/game-psychology.md](references/game-psychology.md) for:
- Hook Model (Trigger → Action → Variable Reward → Investment)
- Flow State requirements
- Loss aversion and FOMO mechanics
- Social proof and status signaling

### Viral Mechanics
Reference [references/viral-mechanics.md](references/viral-mechanics.md) for:
- K-factor optimization
- Share triggers and friction reduction
- Network effects and invitation loops
- Content generation for social platforms

## Feature Generation Process

### Step 1: Identify Opportunity
- Underserved player motivation?
- Broken engagement loop?
- Missing competitive feature?
- Viral potential untapped?

### Step 2: Brainstorm with Constraints
- Must fit neo-brutalist aesthetic
- Must work in real-time multiplayer
- Must be language-agnostic (5+ languages)
- Should leverage combo/rarity systems

### Step 3: Validate Against Psychology
- Does it create flow state?
- Does it satisfy intrinsic motivation?
- Does it trigger sharing behavior?
- Does it build habits?

### Step 4: Design for Virality
- What's the share trigger?
- What's the social proof element?
- How does it generate content?
- What's the network effect?

## Feature Categories

### Playability Improvements
- **Accessibility**: Better onboarding, tutorials
- **Feedback**: Clearer success/failure signals
- **Pacing**: Optimal session length, break points
- **Difficulty Curve**: Skill-appropriate challenges

### Fun Amplification
- **Surprise**: Unexpected rewards, hidden content
- **Mastery**: Skill expression, technique development
- **Social Joy**: Shared experiences, friendly competition
- **Humor**: Playful messaging, easter eggs

### LexiClash Unique Factors (Lean into these)
- Real-time multiplayer word racing (unique in space)
- Combo system with momentum building
- Neo-brutalist "Jackbox" aesthetic
- Community word validation
- Multi-language support

### Viral Triggers
- Shareable results (emoji grids exist)
- Challenge-a-friend mechanics
- Spectator mode for streamers
- Daily puzzle synchronization
- Rare achievement bragging rights

## Implementation Priorities

### Quick Wins (High Impact, Low Effort)
1. Enhanced share cards with player stats
2. "Beat my score" challenge links
3. Achievement showcase on profile
4. Streak milestone celebrations

### Core Features (High Impact, Medium Effort)
1. Friend system with direct challenges
2. Weekly tournaments with brackets
3. Theme variations (holiday, seasonal)
4. Custom room settings for hosts

### Moonshots (High Impact, High Effort)
1. Synchronous global events
2. User-generated puzzle creation
3. Spectator betting/prediction
4. Cross-platform mobile apps

## Evaluation Checklist

Before recommending any feature:
- [ ] Enhances core word-finding gameplay?
- [ ] Works across all 5 languages?
- [ ] Maintains accessibility (no pay-to-win)?
- [ ] Fits neo-brutalist aesthetic?
- [ ] Has clear success metrics?
- [ ] Can be A/B tested?
- [ ] Creates sharing opportunities?

## Output Format

When proposing features:

```
## Feature: [Name]

### Concept
[1-2 sentence description]

### Player Motivation
[Which Bartle type(s) served?]

### Mechanics
[How it works in detail]

### Viral Potential
[How this spreads organically]

### Implementation
- Effort: [S/M/L/XL]
- Files likely affected: [list]
- Dependencies: [list]

### Success Metrics
- [Metric 1]
- [Metric 2]

### Risks & Mitigations
- Risk: [description] → Mitigation: [solution]
```

## Web Research Queries

Use these patterns for competitor research:
- "word game viral mechanics 2024 2025"
- "[competitor name] game design analysis"
- "mobile game retention strategies"
- "party game multiplayer UX patterns"
- "wordle success factors viral growth"

Always cite sources and extract actionable insights.
