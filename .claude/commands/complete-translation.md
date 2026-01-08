---
allowed-tools: Bash(cd *), Bash(npm *), Bash(node *), Read, Write, Edit, Skill(ux-writer), TodoWrite
description: Complete all missing translations using ux-writer skill
---

## Process

1. **Analyze gaps:**
   - Run: `cd fe-next && node scripts/find-missing-translations.js`
   - Review report at `fe-next/scripts/translation-report.json`

2. **Use ux-writer skill** to write English copy first (playful, concise, action-oriented)

3. **Create native translations** for each language (don't translate, write fresh):
   - English (en) - Primary source
   - Spanish (es) - Latin American casual
   - Hebrew (he) - Informal, emoji at end
   - Japanese (ja) - Energetic
   - Swedish (sv) - Casual Nordic

4. **Update:** `fe-next/translations/` - All language files (en.js, es.js, he.js, ja.js, sv.js)

5. **Verify:** Run script again to confirm all keys present

## Key Principles
- Write native copy, don't translate literally
- Most UI text under 5 words
- Use active verbs: Find, Beat, Share, Unlock
- Hebrew: RTL aware, emoji at end of text
