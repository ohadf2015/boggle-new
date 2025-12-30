Run the translation analysis script and add all missing translations using the ux-writer skill for high-quality, on-brand copy:

1. First, run the analysis script:
   cd fe-next && node scripts/find-missing-translations.js

2. Review the output which shows:
   - Keys used in code but not defined in any language
   - Keys missing in specific languages
   - Files where these keys are used
   - Detailed JSON report at fe-next/scripts/translation-report.json

3. Use the **ux-writer** skill to write translations:
   - Invoke the ux-writer skill: `/ux-writer`
   - Reference the style guide: .claude/skills/ux-writer/references/style-guide.md
   - Reference the translation glossary: .claude/skills/ux-writer/references/translation-glossary.md

4. Add ALL missing translations to fe-next/translations/ files:
   - For keys completely missing: add them to ALL languages (en.js, he.js, sv.js, ja.js, es.js)
   - For language-specific gaps: add missing keys to those specific language files
   - Use the file locations in the report to understand the context of each key

5. UX Writing Guidelines (from ux-writer skill):
   - **Playful & Energetic** - LexiClash is a game, not a corporate app
   - **Concise** - Short, punchy phrases. Most UI text under 5 words
   - **Action-oriented** - Use active verbs: "Find", "Beat", "Share", "Unlock"
   - **Competitive** - Encourage friendly rivalry: "Can you beat this?"

6. Translation Guidelines by Language:
   - English (en) - Primary source, establish the tone first
   - Spanish (es) - Latin American casual tone
   - Hebrew (he) - RTL aware, informal register, emoji at end of text
   - Japanese (ja) - Energetic with appropriate particles
   - Swedish (sv) - Casual Nordic tone

7. Translation Workflow:
   - Write English copy first with the correct playful tone
   - Translate to each language preserving energy (don't just literally translate)
   - Adapt idioms to cultural equivalents
   - Match UI space constraints (keep length similar)

8. After adding translations:
   - Run the script again to verify all keys are now present
   - Test the affected components to ensure translations display correctly

The script analyzes both code usage and translation definitions to find gaps.
