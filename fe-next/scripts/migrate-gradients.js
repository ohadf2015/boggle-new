#!/usr/bin/env node

/**
 * Automated Gradient Migration Script
 * Phase 4: Standardize arbitrary Tailwind gradients to Neo-Brutalist design system
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Migration rules - order matters (most specific first)
const migrationRules = [
  // Background gradients (3-stop) -> solid dark
  {
    pattern: /bg-gradient-to-b(r)?\s+from-slate-\d+\/?\d*\s+via-slate-\d+\/?\d*\s+to-slate-\d+\/?\d*/g,
    replacement: 'bg-neo-navy',
    description: '3-stop slate gradient -> bg-neo-navy'
  },
  {
    pattern: /bg-gradient-to-b(r)?\s+from-gray-\d+\/?\d*\s+via-gray-\d+\/?\d*\s+to-gray-\d+\/?\d*/g,
    replacement: 'bg-neo-navy',
    description: '3-stop gray gradient -> bg-neo-navy'
  },

  // Background gradients (2-stop) -> solid colors
  {
    pattern: /bg-gradient-to-br?\s+from-slate-([89]\d+)\/?\d*\s+to-slate-\d+\/?\d*/g,
    replacement: 'bg-neo-navy',
    description: '2-stop dark slate gradient -> bg-neo-navy'
  },
  {
    pattern: /bg-gradient-to-br?\s+from-slate-([1-7]\d+|50)\/?\d*\s+to-(slate|gray)-\d+\/?\d*/g,
    replacement: (match, firstNum) => {
      const num = parseInt(firstNum);
      if (num <= 200) return 'bg-gray-100';
      if (num <= 400) return 'bg-gray-300';
      return 'bg-gray-500';
    },
    description: '2-stop light slate gradient -> bg-gray-X'
  },
  {
    pattern: /bg-gradient-to-br?\s+from-gray-([89]\d+)\/?\d*\s+to-gray-\d+\/?\d*/g,
    replacement: 'bg-neo-navy',
    description: '2-stop dark gray gradient -> bg-neo-navy'
  },

  // White/light backgrounds
  {
    pattern: /bg-gradient-to-br?\s+from-white\/?\d*\s+via-(white|gray-50)\/?\d*\s+to-gray-50\/?\d*/g,
    replacement: 'bg-white',
    description: 'White gradient -> bg-white'
  },
  {
    pattern: /bg-gradient-to-br?\s+from-white\/?\d*\s+to-(gray-50|white)\/?\d*/g,
    replacement: 'bg-white',
    description: 'White/gray gradient -> bg-white'
  },

  // Text gradients (yellow/amber/orange) -> text-neo-yellow
  {
    pattern: /text-transparent\s+bg-clip-text\s+bg-gradient-to-r\s+from-(amber|yellow)-\d+\s+via-(orange|yellow)-\d+\s+to-(amber|yellow)-\d+/g,
    replacement: 'text-neo-yellow',
    description: 'Yellow text gradient -> text-neo-yellow'
  },
  {
    pattern: /text-transparent\s+bg-clip-text\s+bg-gradient-to-r\s+from-(amber|yellow)-\d+\s+to-(orange|yellow)-\d+/g,
    replacement: 'text-neo-yellow',
    description: 'Yellow text gradient -> text-neo-yellow'
  },

  // Decorative glows (background effects)
  {
    pattern: /bg-gradient-to-b\s+from-(yellow|amber|orange)-\d+\/\d+\s+to-transparent/g,
    replacement: (match) => {
      const opacityMatch = match.match(/\/(\d+)/);
      const opacity = opacityMatch ? Math.max(10, parseInt(opacityMatch[1]) / 2) : 10;
      const color = match.includes('yellow') ? 'yellow' : match.includes('amber') ? 'amber' : 'orange';
      return `bg-${color}-500/${opacity}`;
    },
    description: 'Decorative glow gradient -> solid with opacity'
  },

  // Purple/indigo gradients -> bg-neo-purple
  {
    pattern: /bg-gradient-to-br?\s+from-(purple|violet|indigo)-\d+\s+to-(purple|indigo)-\d+/g,
    replacement: 'bg-neo-purple',
    description: 'Purple gradient -> bg-neo-purple'
  },

  // Remove dark: variants that duplicate functionality
  {
    pattern: /\s+dark:from-slate-\d+\/?\d*\s+dark:via-slate-\d+\/?\d*\s+dark:to-slate-\d+\/?\d*/g,
    replacement: '',
    description: 'Remove redundant dark slate gradient'
  },
  {
    pattern: /\s+dark:from-gray-\d+\/?\d*\s+dark:via-gray-\d+\/?\d*\s+dark:to-gray-\d+\/?\d*/g,
    replacement: '',
    description: 'Remove redundant dark gray gradient'
  }
];

// Files to skip (contain semantic/functional gradients we want to preserve)
const skipPatterns = [
  '**/XpProgressBar.tsx', // Prestige tier gradients
  '**/TabbedDailyLeaderboard.tsx', // Rank badge gradients (1st/2nd/3rd)
  '**/DailyLeaderboard.tsx', // Rank badge gradients
  '**/__tests__/**', // Test files
  '**/node_modules/**'
];

// Dry run mode
let dryRun = process.argv.includes('--dry-run');
let verbose = process.argv.includes('--verbose');

async function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  const appliedRules = [];

  // Apply each migration rule
  for (const rule of migrationRules) {
    const before = newContent;

    if (typeof rule.replacement === 'function') {
      newContent = newContent.replace(rule.pattern, rule.replacement);
    } else {
      newContent = newContent.replace(rule.pattern, rule.replacement);
    }

    if (before !== newContent) {
      appliedRules.push(rule.description);
    }
  }

  // Check if changes were made
  if (newContent !== content) {
    if (!dryRun) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
    }
    return { changed: true, rules: appliedRules };
  }

  return { changed: false, rules: [] };
}

async function main() {
  console.log('🎨 Phase 4: Gradient Migration Script\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  // Find all TSX files in components/ and app/
  const files = await glob('{components,app}/**/*.tsx', {
    cwd: process.cwd(),
    ignore: skipPatterns
  });

  console.log(`Found ${files.length} component files\n`);

  const results = {
    total: 0,
    changed: 0,
    unchanged: 0,
    changedFiles: []
  };

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const result = await migrateFile(fullPath);

    results.total++;
    if (result.changed) {
      results.changed++;
      results.changedFiles.push(file);
      console.log(`✅ ${file}`);
      if (verbose) {
        result.rules.forEach(rule => console.log(`   - ${rule}`));
      }
    } else {
      results.unchanged++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total files: ${results.total}`);
  console.log(`Changed: ${results.changed}`);
  console.log(`Unchanged: ${results.unchanged}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No files were modified');
    console.log('Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Migration complete!');
  }

  if (results.changed > 0 && verbose) {
    console.log('\nChanged files:');
    results.changedFiles.forEach(f => console.log(`  - ${f}`));
  }
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
