#!/usr/bin/env node

/**
 * Missing Translation Key Finder
 *
 * This script:
 * 1. Extracts all translation keys from fe-next/translations/index.js for each language
 * 2. Extracts all t() function calls from the codebase
 * 3. Compares them to find missing translations
 * 4. Generates a comprehensive report
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TRANSLATIONS_FILE = path.join(PROJECT_ROOT, 'translations/index.js');
const EXTENSIONS_TO_SCAN = ['.ts', '.tsx', '.js', '.jsx'];
const DIRS_TO_EXCLUDE = ['node_modules', '.next', 'dist', 'build', '.git', 'playwright-report'];

// ============================================
// PART 1: Extract translation keys from translation file
// ============================================

function extractTranslationKeys(obj, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      keys.push(...extractTranslationKeys(value, fullKey));
    } else {
      // This is a leaf node (actual translation value)
      keys.push(fullKey);
    }
  }

  return keys;
}

function getTranslationKeysFromFile() {
  console.log('Reading translations file...');

  const content = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');

  // Use a safe approach: eval the file in a controlled way
  // Extract the translations object using regex and parsing
  const translationsMatch = content.match(/const\s+translations\s*=\s*(\{[\s\S]*?\});?\s*(?:\/\/|module\.exports)/);

  if (!translationsMatch) {
    // Try alternative approach - require the module
    try {
      const translationsModule = require(TRANSLATIONS_FILE);
      const translations = translationsModule.translations;

      const result = {};
      for (const lang of Object.keys(translations)) {
        result[lang] = extractTranslationKeys(translations[lang]);
      }
      return { translations, keysByLanguage: result };
    } catch (e) {
      console.error('Failed to parse translations file:', e.message);
      process.exit(1);
    }
  }

  // Fallback to require
  const translationsModule = require(TRANSLATIONS_FILE);
  const translations = translationsModule.translations;

  const result = {};
  for (const lang of Object.keys(translations)) {
    result[lang] = extractTranslationKeys(translations[lang]);
  }

  return { translations, keysByLanguage: result };
}

// ============================================
// PART 2: Extract t() function calls from codebase
// ============================================

function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!DIRS_TO_EXCLUDE.includes(entry.name)) {
        getAllFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXTENSIONS_TO_SCAN.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function extractTFunctionCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const calls = [];

  // Multiple regex patterns to catch different t() usages
  const patterns = [
    // t('key') or t("key")
    /\bt\(\s*['"]([^'"]+)['"]\s*\)/g,
    // t('key', ...) with additional params
    /\bt\(\s*['"]([^'"]+)['"]\s*,/g,
    // {t('key')} in JSX
    /\{\s*t\(\s*['"]([^'"]+)['"]\s*\)/g,
    // t('key') || 'fallback'
    /\bt\(\s*['"]([^'"]+)['"]\s*\)\s*\|\|/g,
    // t('key').replace
    /\bt\(\s*['"]([^'"]+)['"]\s*\)\.replace/g,
  ];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pattern of patterns) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(line)) !== null) {
        const key = match[1];

        // Skip keys that look like they contain variables or are not translation keys
        if (key.includes('${') || key.includes('`')) continue;

        // Skip if it looks like a method call or URL
        if (key.includes('://') || key.startsWith('.') || key.endsWith('.')) continue;

        calls.push({
          key,
          file: path.relative(PROJECT_ROOT, filePath),
          line: lineNum + 1,
          context: line.trim().substring(0, 100)
        });
      }
    }
  }

  return calls;
}

function extractAllTFunctionCalls() {
  console.log('Scanning codebase for t() function calls...');

  const files = getAllFiles(PROJECT_ROOT);
  console.log(`Found ${files.length} files to scan`);

  const allCalls = [];

  for (const file of files) {
    const calls = extractTFunctionCalls(file);
    allCalls.push(...calls);
  }

  console.log(`Found ${allCalls.length} t() calls total`);

  return allCalls;
}

// ============================================
// PART 3: Compare and generate report
// ============================================

function generateReport(keysByLanguage, tCalls, translations) {
  console.log('\n========================================');
  console.log('TRANSLATION KEY ANALYSIS REPORT');
  console.log('========================================\n');

  const languages = Object.keys(keysByLanguage);
  console.log(`Languages found: ${languages.join(', ')}`);
  console.log('');

  // Get unique keys used in code
  const uniqueKeysInCode = [...new Set(tCalls.map(c => c.key))];
  console.log(`Unique translation keys used in code: ${uniqueKeysInCode.length}`);

  // Print key counts per language
  console.log('\nKeys defined per language:');
  for (const lang of languages) {
    console.log(`  ${lang}: ${keysByLanguage[lang].length} keys`);
  }

  // Use English as the reference language
  const referenceKeys = new Set(keysByLanguage['en'] || []);

  // ========================================
  // Section 1: Keys used in code but missing from English
  // ========================================
  console.log('\n========================================');
  console.log('KEYS USED IN CODE BUT NOT DEFINED IN TRANSLATIONS');
  console.log('========================================\n');

  const missingFromEnglish = [];

  for (const key of uniqueKeysInCode) {
    if (!referenceKeys.has(key)) {
      // Find all usages
      const usages = tCalls.filter(c => c.key === key);
      missingFromEnglish.push({ key, usages });
    }
  }

  if (missingFromEnglish.length === 0) {
    console.log('No missing keys found in English translations!\n');
  } else {
    console.log(`Found ${missingFromEnglish.length} keys used in code but not defined:\n`);

    // Sort by key
    missingFromEnglish.sort((a, b) => a.key.localeCompare(b.key));

    for (const { key, usages } of missingFromEnglish) {
      console.log(`KEY: "${key}"`);
      console.log('  Used in:');
      for (const usage of usages.slice(0, 5)) { // Show max 5 usages
        console.log(`    - ${usage.file}:${usage.line}`);
      }
      if (usages.length > 5) {
        console.log(`    ... and ${usages.length - 5} more locations`);
      }
      console.log('');
    }
  }

  // ========================================
  // Section 2: Keys missing in other languages (compared to English)
  // ========================================
  console.log('\n========================================');
  console.log('KEYS DEFINED IN ENGLISH BUT MISSING IN OTHER LANGUAGES');
  console.log('========================================\n');

  for (const lang of languages) {
    if (lang === 'en') continue;

    const langKeys = new Set(keysByLanguage[lang]);
    const missingInLang = [];

    for (const key of referenceKeys) {
      if (!langKeys.has(key)) {
        missingInLang.push(key);
      }
    }

    if (missingInLang.length === 0) {
      console.log(`${lang.toUpperCase()}: All keys present!`);
    } else {
      console.log(`${lang.toUpperCase()}: ${missingInLang.length} keys missing from English`);
      console.log('  Missing keys:');
      // Show first 20 missing keys
      for (const key of missingInLang.slice(0, 20)) {
        console.log(`    - ${key}`);
      }
      if (missingInLang.length > 20) {
        console.log(`    ... and ${missingInLang.length - 20} more`);
      }
    }
    console.log('');
  }

  // ========================================
  // Section 3: Keys in other languages but not in English
  // ========================================
  console.log('\n========================================');
  console.log('KEYS DEFINED IN OTHER LANGUAGES BUT NOT IN ENGLISH');
  console.log('========================================\n');

  for (const lang of languages) {
    if (lang === 'en') continue;

    const langKeys = new Set(keysByLanguage[lang]);
    const extraInLang = [];

    for (const key of langKeys) {
      if (!referenceKeys.has(key)) {
        extraInLang.push(key);
      }
    }

    if (extraInLang.length === 0) {
      console.log(`${lang.toUpperCase()}: No extra keys`);
    } else {
      console.log(`${lang.toUpperCase()}: ${extraInLang.length} keys not in English`);
      for (const key of extraInLang.slice(0, 10)) {
        console.log(`    - ${key}`);
      }
      if (extraInLang.length > 10) {
        console.log(`    ... and ${extraInLang.length - 10} more`);
      }
    }
    console.log('');
  }

  // ========================================
  // Section 4: Summary table - which keys are missing where
  // ========================================
  console.log('\n========================================');
  console.log('DETAILED MISSING KEY MATRIX');
  console.log('========================================\n');

  // Get all unique keys (from code AND from all languages)
  const allKeys = new Set([
    ...uniqueKeysInCode,
    ...Object.values(keysByLanguage).flat()
  ]);

  // Find keys that are missing in at least one place
  const keysWithIssues = [];

  for (const key of allKeys) {
    const inCode = uniqueKeysInCode.includes(key);
    const inLanguages = {};

    for (const lang of languages) {
      inLanguages[lang] = keysByLanguage[lang].includes(key);
    }

    // Only include if used in code but missing somewhere, or missing from English
    const usedButMissing = inCode && !inLanguages['en'];
    const missingFromSomeLang = inLanguages['en'] && languages.some(l => l !== 'en' && !inLanguages[l]);

    if (usedButMissing || missingFromSomeLang) {
      keysWithIssues.push({
        key,
        inCode,
        ...inLanguages
      });
    }
  }

  if (keysWithIssues.length > 0) {
    // Sort by key
    keysWithIssues.sort((a, b) => a.key.localeCompare(b.key));

    // Print header
    const header = ['Key', 'In Code', ...languages.map(l => l.toUpperCase())].join(' | ');
    console.log(header);
    console.log('-'.repeat(header.length));

    for (const row of keysWithIssues.slice(0, 100)) {
      const cells = [
        row.key.substring(0, 40).padEnd(40),
        row.inCode ? 'YES' : 'NO ',
        ...languages.map(l => row[l] ? 'YES' : 'NO ')
      ];
      console.log(cells.join(' | '));
    }

    if (keysWithIssues.length > 100) {
      console.log(`\n... and ${keysWithIssues.length - 100} more keys with issues`);
    }
  } else {
    console.log('No keys with cross-language issues found!');
  }

  // ========================================
  // Section 5: JSON output for further processing
  // ========================================
  const jsonReport = {
    summary: {
      totalKeysInCode: uniqueKeysInCode.length,
      keyCountByLanguage: Object.fromEntries(
        languages.map(l => [l, keysByLanguage[l].length])
      ),
      missingFromEnglish: missingFromEnglish.length,
    },
    missingFromEnglish: missingFromEnglish.map(m => ({
      key: m.key,
      usages: m.usages.map(u => ({ file: u.file, line: u.line }))
    })),
    missingByLanguage: Object.fromEntries(
      languages.filter(l => l !== 'en').map(lang => {
        const langKeys = new Set(keysByLanguage[lang]);
        const missing = [...referenceKeys].filter(k => !langKeys.has(k));
        return [lang, missing];
      })
    ),
    keysNotInEnglish: Object.fromEntries(
      languages.filter(l => l !== 'en').map(lang => {
        const langKeys = new Set(keysByLanguage[lang]);
        const extra = [...langKeys].filter(k => !referenceKeys.has(k));
        return [lang, extra];
      })
    )
  };

  // Write JSON report
  const jsonReportPath = path.join(PROJECT_ROOT, 'scripts/translation-report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));
  console.log(`\nJSON report written to: ${jsonReportPath}`);

  return jsonReport;
}

// ============================================
// Main execution
// ============================================

function main() {
  console.log('Translation Key Analysis Tool');
  console.log('==============================\n');

  // Step 1: Extract translation keys
  const { translations, keysByLanguage } = getTranslationKeysFromFile();

  // Step 2: Extract t() calls
  const tCalls = extractAllTFunctionCalls();

  // Step 3: Generate report
  const report = generateReport(keysByLanguage, tCalls, translations);

  console.log('\n==============================');
  console.log('Analysis complete!');
  console.log('==============================');

  // Return exit code based on missing keys
  if (report.missingFromEnglish.length > 0) {
    console.log(`\nWARNING: ${report.missingFromEnglish.length} translation keys are used but not defined!`);
    return 1;
  }

  return 0;
}

// Run the script
const exitCode = main();
process.exit(exitCode);
