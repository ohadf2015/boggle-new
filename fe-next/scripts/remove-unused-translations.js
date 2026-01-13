#!/usr/bin/env node
/**
 * Script to find and remove unused translation keys
 *
 * Usage:
 *   node scripts/remove-unused-translations.js --dry-run  # Preview changes
 *   node scripts/remove-unused-translations.js            # Apply changes
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, '../translations');
const SRC_DIR = path.join(__dirname, '..');
const TRANSLATION_FILES = ['en.js', 'he.js', 'sv.js', 'ja.js', 'es.js'];

// Keys that are dynamically constructed and should never be removed
const DYNAMIC_KEY_PATTERNS = [
  /^achievements\.\w+\.(name|description)$/, // achievements.WORD_MASTER.name
  /^difficulty\.\w+$/,                        // difficulty.EASY
  /^language\.\w+$/,                          // language.en
  /^errors\.\w+$/,                            // Dynamic error codes
  /^brain\.drills\.\w+/,                      // Brain drill IDs
  /^collectibles\.\w+/,                       // Collectible IDs
];

// Keys that should always be kept (used dynamically or externally)
const ALWAYS_KEEP = new Set([
  'flag',
  'name',
  'direction',
  'logo.lexi',
  'logo.clash',
  'joinView.defaultPlayerNames', // accessed via translations[lang]?.joinView?.defaultPlayerNames
]);

const isDryRun = process.argv.includes('--dry-run');
const isVerbose = process.argv.includes('--verbose');

/**
 * Flatten nested object keys into dot notation
 */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...flattenKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Load translation object from JS file
 */
function loadTranslations(filename) {
  const filePath = path.join(TRANSLATIONS_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract the object from the module
  const match = content.match(/const \w+ = ({[\s\S]*});?\s*(?:module\.exports|export default)/);
  if (!match) {
    throw new Error(`Could not parse translations from ${filename}`);
  }

  // Use eval to parse the object (safe since we control the file)
  const translations = eval(`(${match[1]})`);
  return translations;
}

/**
 * Find all used translation keys in the codebase
 */
function findUsedKeys() {
  const usedKeys = new Set();
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const excludeDirs = ['node_modules', '.next', 'dist', 'coverage', 'translations', '.git'];

  function searchDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          searchDir(fullPath);
        }
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');

          // Match t('key'), t("key"), t(`key`) - but not dynamic keys with ${
          const regex = /\bt\(\s*['"`]([^'"`${}]+)['"`]\s*\)/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            usedKeys.add(match[1]);
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  searchDir(SRC_DIR);
  return usedKeys;
}

/**
 * Check if a key matches dynamic patterns
 */
function isDynamicKey(key) {
  return DYNAMIC_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Remove unused keys from translation object
 */
function removeUnusedKeys(obj, unusedKeys, prefix = '') {
  const result = {};
  let removedCount = 0;

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      const [cleaned, count] = removeUnusedKeys(obj[key], unusedKeys, fullKey);
      removedCount += count;

      // Only keep object if it still has children
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned;
      } else {
        removedCount++;
      }
    } else {
      if (!unusedKeys.has(fullKey)) {
        result[key] = obj[key];
      } else {
        removedCount++;
      }
    }
  }

  return [result, removedCount];
}

/**
 * Convert object back to JS file content
 */
function toJsFileContent(obj, varName) {
  const jsonStr = JSON.stringify(obj, null, 2);
  return `// ${varName.charAt(0).toUpperCase() + varName.slice(1)} translations
const ${varName} = ${jsonStr};

module.exports = { ${varName} };
`;
}

/**
 * Main function
 */
function main() {
  console.log('='.repeat(60));
  console.log('Unused Translation Key Remover');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
  console.log('');

  // Step 1: Load English translations (source of truth)
  console.log('Loading English translations...');
  const enTranslations = loadTranslations('en.js');
  const allKeys = flattenKeys(enTranslations);
  console.log(`Found ${allKeys.length} total keys in en.js`);

  // Step 2: Find used keys in codebase
  console.log('\nSearching codebase for used translation keys...');
  const usedKeys = findUsedKeys();
  console.log(`Found ${usedKeys.size} unique keys used in code`);

  // Step 3: Find unused keys
  const unusedKeys = new Set();
  for (const key of allKeys) {
    // Skip keys that should always be kept
    if (ALWAYS_KEEP.has(key)) continue;

    // Skip SEO keys (used in metadata)
    if (key.startsWith('seo.')) continue;

    // Skip dynamic keys
    if (isDynamicKey(key)) continue;

    // Check if key or any parent key is used dynamically
    const parts = key.split('.');
    let isDynamic = false;
    for (let i = 1; i <= parts.length; i++) {
      const partialKey = parts.slice(0, i).join('.');
      if (usedKeys.has(partialKey)) {
        isDynamic = true;
        break;
      }
    }

    if (!isDynamic && !usedKeys.has(key)) {
      unusedKeys.add(key);
    }
  }

  console.log(`\nFound ${unusedKeys.size} unused keys`);

  if (unusedKeys.size === 0) {
    console.log('\nNo unused keys found. Nothing to remove.');
    return;
  }

  // Group by namespace for display
  const byNamespace = {};
  for (const key of unusedKeys) {
    const namespace = key.split('.')[0];
    if (!byNamespace[namespace]) byNamespace[namespace] = [];
    byNamespace[namespace].push(key);
  }

  console.log('\nUnused keys by namespace:');
  console.log('-'.repeat(40));
  const sortedNamespaces = Object.entries(byNamespace).sort((a, b) => b[1].length - a[1].length);
  for (const [namespace, keys] of sortedNamespaces.slice(0, 20)) {
    console.log(`  ${namespace}: ${keys.length} keys`);
    if (isVerbose) {
      for (const key of keys.slice(0, 5)) {
        console.log(`    - ${key}`);
      }
      if (keys.length > 5) {
        console.log(`    ... and ${keys.length - 5} more`);
      }
    }
  }
  if (sortedNamespaces.length > 20) {
    console.log(`  ... and ${sortedNamespaces.length - 20} more namespaces`);
  }

  if (isDryRun) {
    console.log('\n[DRY RUN] Would remove these keys from all translation files.');
    console.log('Run without --dry-run to apply changes.');

    // Write report to file
    const reportPath = path.join(__dirname, '../unused-translations-report.txt');
    const report = Array.from(unusedKeys).sort().join('\n');
    fs.writeFileSync(reportPath, report);
    console.log(`\nFull list saved to: ${reportPath}`);
    return;
  }

  // Step 4: Remove keys from all translation files
  console.log('\nRemoving unused keys from translation files...');

  for (const filename of TRANSLATION_FILES) {
    const filePath = path.join(TRANSLATIONS_DIR, filename);
    const varName = filename.replace('.js', '');

    try {
      const translations = loadTranslations(filename);
      const [cleaned, removedCount] = removeUnusedKeys(translations, unusedKeys);

      const newContent = toJsFileContent(cleaned, varName);
      fs.writeFileSync(filePath, newContent, 'utf8');

      console.log(`  ${filename}: removed ${removedCount} keys`);
    } catch (e) {
      console.error(`  ${filename}: ERROR - ${e.message}`);
    }
  }

  console.log('\nDone! Unused translations have been removed.');
  console.log('Please run `npm run lint` and `npm run build` to verify.');
}

main();
