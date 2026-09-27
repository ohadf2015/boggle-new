---
name: use-ux-writer-translations
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: translations/.*\.(js|json|ts)$
  - field: new_text
    operator: regex_match
    pattern: ":\s*[\"'][^\"']{3,}[\"']"
---

✍️ **Translation File Edit Detected - Use /ux-writer Skill!**

You're adding or modifying user-facing text in translation files. **Use the `/ux-writer` skill** to ensure:

1. **Native-sounding copy** for all 5 languages
2. **Consistent tone** across the app
3. **Cultural adaptation** (not just literal translation)

## Required Languages

This project requires translations in **ALL 5 languages**:
- 🇺🇸 **English** (`en.js`)
- 🇮🇱 **Hebrew** (`he.js`) - RTL language
- 🇸🇪 **Swedish** (`sv.js`)
- 🇯🇵 **Japanese** (`ja.js`)
- 🇪🇸 **Spanish** (`es.js`)

## How to Use /ux-writer

```
/ux-writer
```

Then provide:
- The context/feature where text will appear
- The meaning/intent of the text
- Any tone requirements (playful, formal, etc.)

The skill will generate native-sounding translations for all languages.

## ❌ Don't Do This

```json
// Bad: Writing translations manually without /ux-writer
"welcome_message": "Welcome to the game!"  // Only English
"welcome_message": "ברוכים הבאים למשחק!"  // Literal translation
```

## ✅ Do This Instead

1. Call `/ux-writer` skill
2. Describe: "Welcome message for game lobby, playful tone"
3. Get native translations for all 5 languages
4. Add all translations at once

## Remember

- **Hebrew is RTL** - text may need different structure
- **Japanese uses different levels of formality** - match app tone
- **Swedish has unique idioms** - avoid literal translations
- **Spanish has gendered nouns/accents** - board generates á é í ó ú ü ñ; keep them
- **Playful "Jackbox" tone** - keep it fun across all languages!
