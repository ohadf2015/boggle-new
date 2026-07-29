---
name: clean-translations
description: Remove unused translation keys from all translation files (en, he, sv, ja, es). This skill should be used when cleaning up translations, after removing features, or to reduce translation file size. Finds keys defined but never used via t() calls in the codebase.
---

# Clean Translations

Remove unused translation keys from all language files in the project.

## Execution Steps

When this skill is invoked, execute the following steps in order:

### Step 1: Preview Changes (Dry Run)

Run the script in dry-run mode to see what would be removed:

```bash
node scripts/remove-unused-translations.js --dry-run
```

Review the output and report the number of unused keys found by namespace.

### Step 2: Apply Changes

If the dry run looks correct, apply the changes:

```bash
node scripts/remove-unused-translations.js
```

### Step 3: Verify Build

Run the build to ensure no required translations were removed:

```bash
npm run build
```

If the build fails due to missing translations, restore them from git and update the script's ALWAYS_KEEP list.

### Step 4: Run Lint

Check for any linting issues:

```bash
npm run lint
```

### Step 5: Validate with /complete-translation

After cleaning, invoke the `/complete-translation` skill to:
- Validate that all languages have consistent keys
- Fill any missing translations across language files

## Important Notes

- The script preserves keys in the `seo.*` namespace (used in metadata)
- Keys accessed via optional chaining (e.g., `translations[lang]?.joinView?.defaultPlayerNames`) are in the ALWAYS_KEEP list
- Dynamic key patterns (achievements, difficulty, etc.) are automatically preserved
- A report of removed keys is saved to `unused-translations-report.txt`
