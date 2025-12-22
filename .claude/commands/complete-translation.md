Run the translation analysis script and add all missing translations:

1. First, run the analysis script:
   cd fe-next && node scripts/find-missing-translations.js

2. Review the output which shows:
   - Keys used in code but not defined in any language
   - Keys missing in specific languages
   - Files where these keys are used
   - Detailed JSON report at fe-next/scripts/translation-report.json

3. Add ALL missing translations to fe-next/translations/index.js:
   - For keys completely missing: add them to ALL languages (en, he, sv, ja, es)
   - For language-specific gaps: add missing keys to those specific language sections
   - Use the file locations in the report to understand the context of each key

4. Guidelines for translations:
   - Infer the English text from context (file usage, key name, surrounding code)
   - Keep translations concise and consistent with existing style in the translation file
   - Match the nested structure in the translations file (e.g., common.*, errors.*, etc.)
   - For non-English languages, provide appropriate translations or clearly mark if human translation is needed
   - Look at how the key is used in the code to determine appropriate tone and length

5. After adding translations:
   - Run the script again to verify all keys are now present
   - Test the affected components to ensure translations display correctly

6. Optional - Add to CI/CD:
   Consider adding this check to prevent future missing translations:
   node scripts/find-missing-translations.js && exit 0 || exit 1

The script analyzes both code usage and translation definitions to find gaps.
