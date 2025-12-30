---
name: ux-writer
description: UX copywriting specialist for LexiClash. This skill should be used when writing or improving micro-copy, creating share messages, translating content while preserving tone, writing achievement text, crafting witty user-facing text, defining voice and tone guidelines, or researching competitor copy for inspiration. Can establish new style directions or improve existing copy across all languages.
---

# LexiClash UX Writer

A specialized skill for crafting, defining, and improving user-facing text throughout LexiClash. This skill can both follow existing patterns and establish new style directions.

## When to Use This Skill

- Writing or improving micro-copy (buttons, labels, tooltips, error messages)
- Creating share messages for social media (daily challenge results, victories)
- Translating content while preserving or enhancing tone
- Writing achievement titles and descriptions
- Crafting witty, engaging text for any user-facing feature
- Defining or evolving the app's voice and tone
- Researching competitor apps for copy inspiration

## Capabilities

### 1. Write New Copy

Create user-facing text for any feature following these principles:

**Playful & Energetic** - LexiClash is a game, not a corporate app
**Concise** - Short, punchy phrases. Most UI text under 5 words
**Action-oriented** - Use active verbs: "Find", "Beat", "Share", "Unlock"
**Competitive** - Encourage friendly rivalry: "Can you beat this?"

### 2. Improve Existing Copy

Review and enhance current text by:
1. Reading the relevant section in [translations/en.js](fe-next/translations/en.js)
2. Identifying issues (too long, wrong tone, unclear, boring)
3. Proposing improved versions
4. Updating all language files consistently

### 3. Define Voice & Style

Establish or evolve the writing style by:
- Proposing voice attributes (playful, competitive, encouraging)
- Setting tone guidelines for different contexts
- Creating word lists (use/avoid)
- Defining punctuation and emoji conventions

Update [references/style-guide.md](references/style-guide.md) when establishing new style directions.

### 4. Research Competitors

Before writing copy for a feature:

1. **Identify target feature** - What needs copy?
2. **Find competitors** - Use WebSearch to find examples from:
   - Wordle (share mechanics, daily challenges)
   - Word Hunt (real-time competition)
   - SpellTower (achievement naming)
   - Wordscapes (streak/retention messaging)
   - Boggle With Friends (multiplayer invites)
3. **Analyze patterns** - What works? What's the tone?
4. **Adapt for LexiClash** - Apply learnings with our voice

Example search queries:
- "Wordle share message format"
- "word game achievement names examples"
- "mobile game streak notification copy"

### 5. Translate Content

When translating:

1. **Preserve energy** - Translations should feel as engaging as English
2. **Adapt, don't translate literally** - Find cultural equivalents for idioms
3. **Match length** - UI space is limited
4. **Use glossary** - Reference [translation-glossary.md](references/translation-glossary.md)

Supported languages:
- English (en) - Primary source
- Spanish (es) - Latin American casual
- Hebrew (he) - RTL, informal register
- Japanese (ja) - Energetic, appropriate particles
- Swedish (sv) - Casual Nordic tone

## Copy Patterns by Context

| Context | Tone | Pattern | Example |
|---------|------|---------|---------|
| Victory | Celebratory | Short exclamation | "You crushed it!" |
| Achievement | Impressive | [Icon] + Title | "💎 RARE GEM unlocked!" |
| Error | Helpful, light | What happened | "Already found!" |
| Share | Competitive | Result + CTA | "450 pts! Beat me?" |
| Streak | Urgent | Stakes + action | "7-day streak on the line!" |
| Loading | Playful | Game-themed | "Shuffling letters..." |
| Empty state | Encouraging | Opportunity | "No games yet - start your first battle!" |

## Share Message Template

Share messages drive growth. Follow this structure:

```
[Emoji] [Score/Result]
[Achievement/Brag line]
[Challenge CTA]
[Link]
```

Example:
```
🔥 Daily #127 - 580 points
Found 47 words in 90 seconds!
Can you beat this?
lexiclash.com/daily
```

## Translation Workflow

1. Write English copy first
2. Add to [translations/en.js](fe-next/translations/en.js)
3. Translate to each language using glossary
4. Update: [es.js](fe-next/translations/es.js), [he.js](fe-next/translations/he.js), [ja.js](fe-next/translations/ja.js), [sv.js](fe-next/translations/sv.js)
5. For Hebrew: ensure RTL compatibility, emoji at end of text

## References

- [Style Guide](references/style-guide.md) - Voice, tone, and writing rules
- [Translation Glossary](references/translation-glossary.md) - Key terms in all languages
