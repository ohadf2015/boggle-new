---
name: use-ux-writer-components
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(tsx|jsx)$
  - field: new_text
    operator: regex_match
    pattern: t\([\"'][a-zA-Z_\.]+[\"']\)
---

✍️ **New Translation Key Detected - Use /ux-writer Skill!**

You're adding a `t()` translation key to a component. **Before adding the key**, use the `/ux-writer` skill to create native-sounding translations.

## The Problem

Adding `t('new.key')` without translations means:
- ❌ Missing translations in other languages
- ❌ Literal/robotic translations if done manually
- ❌ Inconsistent tone across the app

## The Solution

**Before adding `t()` calls:**

1. **Use `/ux-writer` skill first**
2. **Describe the context** and intent of the text
3. **Get native translations** for all 5 languages
4. **Add translations to all language files**
5. **Then add the `t()` call** to your component

## Quick Workflow

```bash
# Step 1: Call the skill
/ux-writer

# Step 2: Describe what you need
"Button text for starting a new game, playful and exciting tone"

# Step 3: Skill provides all 5 translations
# en: "Let's Play!"
# he: "יאללה למשחק!"
# sv: "Nu kör vi!"
# ja: "さあ、始めよう！"
# es: "¡A jugar!"

# Step 4: Add to all translation files
# Step 5: Use t('game.startButton') in component
```

## Required Languages

- 🇺🇸 English (`en.js`)
- 🇮🇱 Hebrew (`he.js`) - RTL
- 🇸🇪 Swedish (`sv.js`)
- 🇯🇵 Japanese (`ja.js`)
- 🇪🇸 Spanish (`es.js`)

## Project Context

This is a **LexiClash word game** with a **playful "Jackbox Party Pack" style**.
Keep translations:
- Fun and engaging
- Culturally appropriate
- Consistent with neo-brutalist design tone
