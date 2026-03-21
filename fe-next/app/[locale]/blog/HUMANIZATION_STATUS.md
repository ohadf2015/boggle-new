# Blog & Guide Humanization - Status

## Architecture

All blog/guide content lives in `content.ts` files with `contentByLocale` exports containing per-language content. The "Word Nerd" persona is used across all articles.

## Blog Articles (14) - COMPLETE

All 14 blog articles use the Word Nerd persona with personal anecdotes, honest admissions, casual tone, and varied rhythm.

**Systemic fixes applied (2026-03-21):**
- Reduced "Here's the thing/Here's what" from ~42 instances to ~12 across all articles
- Reduced em dashes by ~60% (replaced with commas, periods, parentheses)
- Converted bold-label lists to flowing prose (mental-health, kids-education, addictive)
- Deduplicated Nigel Richards (full story kept in top-player-secrets only, brief mentions elsewhere)
- Removed "Sorry. Not sorry." and "Let me walk you through" repetitive patterns
- Varied self-testing percentage claims (some converted to qualitative observations)

| Article | Status |
|---------|--------|
| 10-surprising-benefits-word-games | Done (low severity, minimal fixes needed) |
| improve-word-game-skills | Done (Nigel deduped, percentages varied) |
| science-behind-word-games | Done (em dashes, Here's, copula avoidance fixed) |
| top-player-secrets | Done (low severity, keeps full Nigel story) |
| why-word-games-are-addictive | Done (em dashes reduced, bold lists fixed) |
| word-games-and-mental-health | Done (bold labels, em dashes, Here's fixed) |
| best-boggle-alternatives-2026 | Done (low severity, inherently well-structured) |
| daily-challenge-strategies | Done (Here's openers, Scrabble authority appeals) |
| hebrew-word-games-guide | Done (low severity) |
| vocabulary-building-strategies | Done (bold labels, Here's, em dashes fixed) |
| multiplayer-word-games-social | Done (Here's, em dashes, synonym cycling fixed) |
| word-games-for-brain-training | Done (Here's openers, synonym cycling fixed) |
| word-games-for-kids-education | Done (bold labels merged to prose, Here's fixed) |
| multilingual-word-learning | Done (Nigel deduped, Here's fixed) |
| word-game-history | Done (low severity) |

## Strategy Guides (3) - COMPLETE

All 3 guides fully rewritten with Word Nerd voice (2026-03-21).

| Guide | Changes |
|-------|---------|
| classic-strategy | Full EN rewrite: personal anecdotes, humor, first-person tips, engaging titles |
| blast-strategy | Full EN rewrite: combo war stories, honest admissions, adrenaline feel |
| word-hunt-strategy | Full EN rewrite: spreadsheet nerd persona, trap stories, tension/satisfaction |

Hebrew content preserved unchanged in all guides.

## Remaining work

- **Hebrew guide content**: Hebrew sections in guides are functional but could benefit from the same personality injection
- **Swedish/Japanese/Spanish guide content**: Not yet present in guide files
- **Lumosity duplication**: The Lumosity story appears in both `science-behind-word-games` and `word-games-for-brain-training` with slightly different framing. Consider consolidating to one article.
