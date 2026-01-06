---
name: ux-writer
description: UX copywriting specialist for LexiClash. This skill should be used when writing or improving micro-copy, creating share messages, writing native copy for each supported language (NOT translating), writing achievement text, crafting witty user-facing text, defining voice and tone guidelines, or researching competitor copy for inspiration. Can establish new style directions or improve existing copy across all languages.
---

# LexiClash UX Writer

A specialized skill for crafting, defining, and improving user-facing text throughout LexiClash. This skill can both follow existing patterns and establish new style directions.

**Core principle: Write native, don't translate.** Each language should sound like a native speaker wrote it from scratch.

## When to Use This Skill

- Writing or improving micro-copy (buttons, labels, tooltips, error messages)
- Creating share messages for social media (daily challenge results, victories)
- Writing native copy for each language (never literal translation)
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

### 5. Write Native Copy for Each Language

**CRITICAL: Never translate. Write original copy that sounds native.**

Each language version should read like a native speaker wrote it from scratch. If text "feels translated," it's wrong.

**Process:**
1. **Understand the intent** - What emotion/action should this text trigger?
2. **Write fresh for each language** - Don't translate word-by-word
3. **Use local expressions** - Slang, idioms, and cultural references that resonate
4. **Match the vibe, not the words** - Same energy, different expression

**Language-specific guidance:**

| Language | Tone | Native Expressions | Avoid |
|----------|------|-------------------|-------|
| 🇺🇸 English | Punchy, competitive | "No way you beat this", "Your move" | Formal language |
| 🇪🇸 Spanish | Latin American casual | "Ni de broma", "¿Ya entraste en calor?" | Spain Spanish formality |
| 🇮🇱 Hebrew | Israeli colloquial | "יאללה", "אחלה", "אין סיכוי", "מי מתמודד?" | Formal/biblical Hebrew |
| 🇯🇵 Japanese | Energetic casual | "勝てないでしょ", "本番いこう" | Overly polite keigo |
| 🇸🇪 Swedish | Friendly casual | "Snyggt!", "Våga försöka" | Stiff/corporate tone |

**Examples of BAD vs GOOD:**

❌ BAD (translated): "Ready to dominate friends?" → "מוכן להשתלט על חברים?"
✅ GOOD (native): "מוכנים למשחק אמיתי?"

❌ BAD (translated): "Challenge your friends" → "אתגר את החברים שלך"
✅ GOOD (native): "למולטי" or "בואו נראה אתכם מול חברים"

❌ BAD (translated): "Good luck beating this!" → "¡Buena suerte superando esto!"
✅ GOOD (native): "Ni de broma me ganas."

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

## Multi-Language Workflow

1. **Write English copy first** - Establish the intent and energy
2. **Add to [translations/en.js](fe-next/translations/en.js)**
3. **Write native versions for each language** - NOT translate, but write fresh copy that captures the same vibe
4. **Update all files:** [es.js](fe-next/translations/es.js), [he.js](fe-next/translations/he.js), [ja.js](fe-next/translations/ja.js), [sv.js](fe-next/translations/sv.js)
5. **Hebrew specifics:** RTL compatibility, emoji typically at end of text
6. **Quality check:** Read each version aloud - does it sound like something a native would actually say?

## References

- [Style Guide](references/style-guide.md) - Voice, tone, and writing rules
- [Translation Glossary](references/translation-glossary.md) - Key terms in all languages
