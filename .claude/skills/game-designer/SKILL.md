---
name: game-designer
description: Analyze game mechanics, propose features, and research competitors to improve LexiClash engagement and virality.
allowed-tools: Read, Write, Edit, Grep, Glob, WebSearch, mcp__memory__*
---

# Game Designer Skill

Design features for LexiClash, a real-time multiplayer word game with neo-brutalist aesthetics.

## Memory Integration

### Before Starting
Recall past game design decisions and feature analysis:
```
mcp__memory__memory_recall(query="game design feature [feature-area] mechanic")
```

### After Completing
Store game design decisions and analysis:
```
mcp__memory__memory_store(
  content="Game design: [feature-name] - [description]. Target players: [player-types]. Impact: Fun=[x], Retention=[x], Viral=[x]. Decision: [approved/rejected] because [reason].",
  type="fact",
  tags=["game-design", "feature", "[feature-area]"],
  importance=7
)
```

For competitor insights:
```
mcp__memory__memory_store(
  content="Competitor insight: [competitor] - [mechanic/feature]. What works: [analysis]. Applicable to LexiClash: [yes/no/maybe] because [reason].",
  type="fact",
  tags=["game-design", "competitor", "[competitor-name]"],
  importance=6
)
```

## LexiClash Core

**Mechanics:** 5x5-9x9 boards, 8-sec combos (2.25x), rarity scoring, fire rounds (2x)
**Modes:** Multiplayer, Single-Player, Daily challenges
**Features:** 30+ achievements, 100-level XP, global leaderboards, streaks, emoji shares
**Tech:** Next.js + React + Socket.IO + Supabase (5 languages)

## Feature Analysis Framework

### Player Types (Bartle)
- Achievers: progression, unlocks
- Explorers: discovery, rare words
- Socializers: sharing, connection
- Killers: competition, leaderboards

### Rate Each Feature
- Fun Factor (1-10)
- Retention Impact (1-10)
- Viral Coefficient (0-2)
- Implementation Effort (S/M/L/XL)

## What to Do

1. **Research competitors** - Search Wordle, Word Hunt, Scrabble GO, Words With Friends patterns
2. **Identify opportunities** - Underserved player types? Broken loops? Viral potential?
3. **Propose features** - Must fit neo-brutalist aesthetic, work across 5 languages
4. **Validate psychology** - Creates flow state? Triggers sharing? Builds habits?
5. **Design for virality** - What's the share trigger? Social proof element? Network effect?

## Quick Wins (High Impact, Low Effort)
- Enhanced share cards with stats
- "Beat my score" challenge links
- Achievement showcase
- Streak milestone celebrations

## Core Features (Medium Effort)
- Friend system with challenges
- Weekly tournaments
- Theme variations
- Custom room settings

## Evaluation Checklist

- Enhances word-finding?
- Works across all 5 languages?
- No pay-to-win?
- Fits neo-brutalist aesthetic?
- Has success metrics?
- Creates sharing opportunities?

## References

- [Competitive Analysis](references/competitive-analysis.md)
- [Game Psychology](references/game-psychology.md)
- [Viral Mechanics](references/viral-mechanics.md)
