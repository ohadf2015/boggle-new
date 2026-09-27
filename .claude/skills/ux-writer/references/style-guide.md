# LexiClash Style Guide

## Brand Voice Deep Dive

LexiClash is a fast-paced, competitive word game. Our voice reflects the excitement of real-time competition while remaining accessible to casual players.

### The LexiClash Personality

If LexiClash were a person, they would be:
- A friendly game show host who gets genuinely excited when players succeed
- Competitive but never mean-spirited
- Quick-witted and sharp
- Encouraging even when you lose

### Voice Spectrum

```
Serious ←————————————————————→ Playful
                              ★ LexiClash lives here

Formal ←————————————————————→ Casual
                         ★ LexiClash lives here

Reserved ←————————————————————→ Energetic
                             ★ LexiClash lives here
```

## Copy Patterns by Feature

### Achievement Names

Pattern: [Adjective] + [Gaming Noun] or [Action] + [Object]

Good examples from LexiClash:
- FIRST_BLOOD - First valid word
- SPEED_DEMON - Fast word finding
- COMBO_KING - High combo streak
- RARE_GEM - Finding 9+ letter word
- VOCABULARY_TITAN - 85+ words in a game

Formula for new achievements:
1. What did the player DO? (found, achieved, unlocked)
2. What makes it SPECIAL? (rare, fast, difficult)
3. What GAMING METAPHOR fits? (gem, titan, architect, legend)

### Error Messages

Pattern: [Light acknowledgment] + [What happened/What to do]

Examples:
- "Already found!" (word already submitted)
- "Not on board!" (word can't be formed)
- "Too short!" (word under minimum length)
- "Slow down! Too many invalid words" (spam protection)

### Button Labels

Keep under 3 words when possible:
- "Play Again" not "Click here to play another game"
- "Share" not "Share your results"
- "Copy Link" not "Copy the link to clipboard"

### Loading States

Add personality to waiting moments:
- "Loading..." (acceptable but boring)
- "Shuffling letters..." (better, game-themed)
- "Preparing your battle..." (most engaging)

### Empty States

Turn emptiness into opportunity:
- "No bots yet - add some to practice!"
- "No games played - start your first battle!"
- "Leaderboard is empty - be the first to claim the top!"

## Numbers & Statistics

### Formatting

- Use numerals for game stats: "50 words", "7-day streak"
- Spell out small numbers in prose: "Find three or more words"
- Add commas for thousands: "10,000 points"

### Making Numbers Feel Impressive

- "50 words found!" > "You found 50 words"
- "🔥 15 combo!" > "Combo level: 15"
- "Rank #3 of 50,000 players" > "Your rank is 3"

## Punctuation

### Exclamation Points

Use for:
- Achievements: "Unlocked!"
- Victories: "You won!"
- Encouragement: "Keep going!"

Avoid for:
- Instructions: "Swipe letters." not "Swipe letters!"
- Errors: "Word too short" not "Word too short!"
- Settings: "Sound effects" not "Sound effects!"

### Emojis

Strategic placement:
- Before text for category indicators: "🔥 Fire Round"
- After text for celebration: "Link copied! 📋"
- Standalone for quick feedback: "✅" for valid, "❌" for invalid

Common LexiClash emojis:
- 🔥 Combos, fire round, streaks
- ⚡ Speed, quick actions
- 💎 Rare achievements
- 🏆 Victories, leaderboards
- 🎯 Accuracy, first blood
- 📚 Words, vocabulary

## Sample Copy Rewrites

### Before → After

**Share message:**
- Before: "I played LexiClash and got a score of 450. You should try it too."
- After: "🔥 450 points in LexiClash! Think you can beat me? lexiclash.com"

**Achievement:**
- Before: "You found a word with 8 letters"
- After: "💎 TREASURE HUNTER - Found an 8-letter gem!"

**Error:**
- Before: "Error: The word you entered is not valid"
- After: "Hmm, not a word we know!"

**Streak reminder:**
- Before: "You have a streak. Don't forget to play today."
- After: "🔥 7-day streak on the line! Play now to keep it alive"

## Localization Notes

### Hebrew (RTL)
- Emojis should appear at the END of Hebrew text (left side visually)
- Keep exclamations: Hebrew uses them similarly to English
- Informal register: Use second person singular (אתה/את)

### Japanese
- Use sentence-ending particles for energy: ね、よ、ぞ
- Katakana for game-specific terms: コンボ (combo), ストリーク (streak)
- Keep emoji positions as in English

### Spanish (Latin American)
- Use "tú" form (informal singular)
- Keep exclamations (Spanish uses ¡...! but single ! is acceptable in games)
- Adapt idioms: "¡Lo lograste!" for achievements

### Swedish
- Casual "du" form
- Adapt anglicisms carefully: "streak" can stay, but consider "svit" sometimes
- Keep the energy in translations
