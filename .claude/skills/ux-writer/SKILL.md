---
name: ux-writer
description: Write or improve user-facing copy and native translations across all languages without literal translation.
allowed-tools: Read, Write, Edit, Grep, Glob, mcp__memory__*
---

# LexiClash UX Writer

Write playful, concise, action-oriented copy that sounds like a native speaker wrote it.

## Memory Integration

### Before Starting
Recall past copy decisions and translation patterns:
```
mcp__memory__memory_recall(query="copy translation [context] tone")
```

### After Completing
Store notable copy patterns:
```
mcp__memory__memory_store(
  content="Copy pattern: [context] - [en copy]. Key translations: [language]: [translation]. Tone: [tone-description].",
  type="fact",
  tags=["ux-writing", "copy", "[context]"],
  importance=5
)
```

## Core Principles

- **Write native, don't translate** - Each language should feel native, not translated
- **Playful & Energetic** - LexiClash is a game, keep the energy high
- **Concise** - Most UI text under 5 words
- **Action-oriented** - Use active verbs: "Find", "Beat", "Share", "Unlock"

## What to Do

### Write or Improve Copy
1. Read [translations/en.js](fe-next/translations/en.js) for context
2. Identify issues (too long, wrong tone, unclear)
3. Write improved English copy first
4. Create native versions for: Spanish, Hebrew, Japanese, Swedish
5. Update all language files

### Language-Specific Guidance

| Language | Tone | Examples |
|----------|------|----------|
| English | Punchy, competitive | "No way you beat this", "Your move" |
| Spanish (LA) | Casual | "Ni de broma", "¿Ya entraste en calor?" |
| Hebrew | Colloquial | "יאללה", "אחלה", "מי מתמודד?" |
| Japanese | Energetic | "勝てないでしょ", "本番いこう" |
| Swedish | Friendly | "Snyggt!", "Våga försöka" |

### Copy Patterns by Context

| Context | Tone | Example |
|---------|------|---------|
| Victory | Celebratory | "You crushed it!" |
| Achievement | Impressive | "💎 RARE GEM unlocked!" |
| Error | Light, helpful | "Already found!" |
| Share | Competitive | "450 pts! Beat me?" |
| Streak | Urgent | "7-day streak on the line!" |

## References

- [Style Guide](references/style-guide.md)
- [Translation Glossary](references/translation-glossary.md)
