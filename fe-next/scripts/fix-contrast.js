#!/usr/bin/env node

/**
 * Contrast Auto-Fixer
 * Automatically fixes common contrast issues by replacing low opacity text values
 */

const fs = require('fs');
const path = require('path');

// Replacement rules: from -> to
const REPLACEMENTS = [
  // === LOW OPACITY LIGHT TEXT ON DARK BACKGROUNDS ===
  // Fix /30 opacity (very low) to solid color
  { from: /text-neo-cream\/30/g, to: 'text-neo-white' },
  { from: /text-neo-white\/30/g, to: 'text-neo-white' },
  { from: /text-white\/30/g, to: 'text-white' },

  // Fix /40 opacity to solid or near-solid
  { from: /text-neo-cream\/40/g, to: 'text-neo-white' },
  { from: /text-neo-white\/40/g, to: 'text-neo-white' },
  { from: /text-white\/40/g, to: 'text-white' },

  // Fix /50 opacity to /80 or solid
  { from: /text-neo-cream\/50/g, to: 'text-neo-white' },
  { from: /text-neo-white\/50/g, to: 'text-neo-white' },
  { from: /text-white\/50/g, to: 'text-white/80' },

  // Fix /60 opacity to /80
  { from: /text-neo-cream\/60/g, to: 'text-neo-white' },
  { from: /text-neo-white\/60/g, to: 'text-neo-white' },
  { from: /text-white\/60/g, to: 'text-white/80' },

  // Fix /80 cream to solid white (borderline readability)
  { from: /text-neo-cream\/80/g, to: 'text-neo-white' },

  // === LOW OPACITY DARK TEXT ON LIGHT BACKGROUNDS ===
  // Fix /30-50 dark text to solid neo-gray (more readable)
  { from: /text-neo-black\/30/g, to: 'text-neo-gray' },
  { from: /text-black\/30/g, to: 'text-neo-gray' },
  { from: /text-neo-black\/40/g, to: 'text-neo-gray' },
  { from: /text-black\/40/g, to: 'text-neo-gray' },
  { from: /text-neo-black\/50/g, to: 'text-neo-gray' },
  { from: /text-black\/50/g, to: 'text-neo-gray' },

  // Fix /60 dark text to neo-gray
  { from: /text-neo-black\/60/g, to: 'text-neo-gray' },
  { from: /text-black\/60/g, to: 'text-neo-gray' },

  // Fix /70-75 dark text to neo-gray (borderline but often hard to read)
  { from: /text-neo-black\/70/g, to: 'text-neo-gray' },
  { from: /text-black\/70/g, to: 'text-neo-gray' },
  { from: /text-neo-black\/75/g, to: 'text-neo-gray' },
  { from: /text-black\/75/g, to: 'text-neo-gray' },

  // === CYAN TEXT ===
  { from: /text-neo-cyan\/30/g, to: 'text-neo-cyan/60' },
  { from: /text-neo-cyan\/50/g, to: 'text-neo-cyan/70' },

  // Fix dark mode variants
  { from: /dark:text-neo-cream\/30/g, to: 'dark:text-neo-cream/60' },
  { from: /dark:text-neo-cream\/40/g, to: 'dark:text-neo-cream/60' },
  { from: /dark:text-neo-cream\/50/g, to: 'dark:text-neo-cream/70' },
  { from: /dark:text-neo-cream\/60/g, to: 'dark:text-neo-cream/75' },
  { from: /dark:text-neo-white\/30/g, to: 'dark:text-neo-white/60' },
  { from: /dark:text-neo-white\/40/g, to: 'dark:text-neo-white/60' },
  { from: /dark:text-neo-white\/50/g, to: 'dark:text-neo-white/70' },
  { from: /dark:text-neo-white\/60/g, to: 'dark:text-neo-white/75' },
  { from: /dark:text-white\/30/g, to: 'dark:text-white/60' },
  { from: /dark:text-white\/40/g, to: 'dark:text-white/60' },
  { from: /dark:text-white\/50/g, to: 'dark:text-white/70' },
  { from: /dark:text-white\/60/g, to: 'dark:text-white/75' },

  // Fix gray text that's too light for dark mode
  { from: /dark:text-gray-400/g, to: 'dark:text-gray-300' },
  { from: /dark:text-gray-500/g, to: 'dark:text-gray-300' },
  { from: /dark:text-slate-400/g, to: 'dark:text-slate-300' },
  { from: /dark:text-slate-500/g, to: 'dark:text-slate-300' },

  // Fix gray text that's too light for light mode
  { from: /(?<!dark:)text-gray-400(?!\d)/g, to: 'text-gray-600' },
  { from: /(?<!dark:)text-gray-500(?!\d)/g, to: 'text-gray-600' },
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  '.git',
  'fix-contrast.js',
  'check-contrast.js',
];

// File extensions to process
const EXTENSIONS = ['.tsx', '.jsx'];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  let changeCount = 0;

  for (const { from, to } of REPLACEMENTS) {
    const matches = content.match(from);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(from, to);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return changeCount;
  }

  return 0;
}

function processDirectory(dir) {
  let totalChanges = 0;
  const changedFiles = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (shouldExclude(fullPath)) continue;

    if (item.isDirectory()) {
      const result = processDirectory(fullPath);
      totalChanges += result.totalChanges;
      changedFiles.push(...result.changedFiles);
    } else if (item.isFile() && EXTENSIONS.some(ext => item.name.endsWith(ext))) {
      const changes = processFile(fullPath);
      if (changes > 0) {
        totalChanges += changes;
        changedFiles.push({ path: fullPath, changes });
      }
    }
  }

  return { totalChanges, changedFiles };
}

function main() {
  const baseDir = process.argv[2] || path.join(__dirname, '..');

  console.log('🔧 Auto-fixing contrast issues...\n');
  console.log(`Base directory: ${baseDir}\n`);

  const { totalChanges, changedFiles } = processDirectory(baseDir);

  if (changedFiles.length > 0) {
    console.log('📝 Modified files:\n');
    changedFiles.forEach(({ path: filePath, changes }) => {
      const relativePath = path.relative(baseDir, filePath);
      console.log(`   ✅ ${relativePath} (${changes} changes)`);
    });
    console.log(`\n✅ Fixed ${totalChanges} contrast issues in ${changedFiles.length} files.`);
  } else {
    console.log('✅ No contrast issues to fix!');
  }
}

main();
