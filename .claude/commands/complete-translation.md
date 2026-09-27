---
allowed-tools: Bash(cd *), Bash(npm *), Bash(node *), Read, Write, Edit, Skill(ux-writer), Task, TodoWrite
description: Complete all missing translations using parallel agents for speed
---

## Process (Parallelized)

1. **Analyze gaps:**
   - Run: `cd fe-next && node scripts/find-missing-translations.js`
   - Parse report at `fe-next/scripts/translation-report.json`
   - Identify which languages have missing translations

2. **Launch parallel agents** (ONE message with MULTIPLE Task tool calls):
   - If English has missing keys: Launch agent to write English copy using ux-writer
   - For each language with missing keys, launch a separate agent with ux-writer:
     - Spanish (es) - Latin American casual
     - Hebrew (he) - Informal, emoji at end
     - Japanese (ja) - Energetic
     - Swedish (sv) - Casual Nordic
   - Each agent receives: language code + list of missing keys for that language

3. **Agent task template:**
   ```
   Use the ux-writer skill to complete missing translations for [LANGUAGE].
   Missing keys: [LIST_OF_KEYS]

   Language-specific guidance:
   - [en]: Playful, concise, action-oriented
   - [es]: Latin American casual
   - [he]: Informal, emoji at end (RTL aware)
   - [ja]: Energetic
   - [sv]: Casual Nordic

   Update fe-next/translations/[LANG].js with the new translations.
   ```

4. **Verify:** After all agents complete, run script again to confirm all keys present

## Implementation Details

**CRITICAL: Launch all language agents in parallel (single message)**

When you identify missing translations across multiple languages, launch ALL agents simultaneously using a single message with multiple Task tool calls. This parallelizes the work and dramatically reduces total execution time.

Example pattern:
- 4 languages need updates → Send 1 message with 4 Task calls → All complete in ~same time as 1
- Sequential approach would take 4x longer

Each agent should:
- Use `subagent_type: general-purpose`
- Invoke `Skill(ux-writer)` to leverage UX writing expertise
- Update only their assigned language file
- Follow language-specific tone guidelines

## Key Principles
- Write native copy, don't translate literally
- Most UI text under 5 words
- Use active verbs: Find, Beat, Share, Unlock
- Hebrew: RTL aware, emoji at end of text
- **Speed optimization**: Always use parallel agents when multiple languages need updates
