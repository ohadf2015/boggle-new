#!/usr/bin/env node

/**
 * Color Audit Script
 *
 * Scans the entire codebase to identify all color usage patterns:
 * - Hex colors (#RRGGBB or #RGB)
 * - RGB/RGBA colors
 * - Tailwind color classes (bg-*, text-*, border-*, from-*, to-*, via-*)
 * - CSS variable references (var(--*))
 *
 * Outputs a JSON report with categorized color instances for ChromaDB ingestion.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Patterns to detect
const COLOR_PATTERNS = {
  hex: /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g,
  rgb: /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)/g,
  tailwindGradient: /(?:from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+/g,
  tailwindColor: /(?:bg|text|border|ring)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+/g,
  cssVar: /var\(--[\w-]+\)/g,
};

// Categories for classification
const CATEGORIES = {
  brand: ['google', 'discord', 'apple', 'whatsapp', 'facebook', 'twitter', 'linkedin'],
  tier: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
  avatar: ['avatar', 'broccoli', 'drippy', 'sunny', 'cloudy', 'octo', 'pizza', 'prickly', 'melon', 'avo', 'frosty', 'flaky', 'eggy', 'slimy', 'starry', 'shroom'],
  gradient: ['gradient', 'from-', 'to-', 'via-'],
  semantic: ['primary', 'secondary', 'accent', 'destructive', 'muted', 'popover', 'card', 'border', 'input', 'ring'],
  decorative: ['glow', 'overlay', 'shadow'],
};

// Known hardcoded colors for quick identification
const KNOWN_COLORS = {
  '#5865F2': { name: 'Discord Blue', token: 'brand-discord', category: 'brand' },
  '#4752C4': { name: 'Discord Blue Hover', token: 'brand-discord-hover', category: 'brand' },
  '#25D366': { name: 'WhatsApp Green', token: 'brand-whatsapp', category: 'brand' },
  '#1ebe5d': { name: 'WhatsApp Green Hover', token: 'brand-whatsapp-hover', category: 'brand' },
  '#4285F4': { name: 'Google Blue', token: 'brand-google', category: 'brand' },
  '#3367D6': { name: 'Google Blue Hover', token: 'brand-google-hover', category: 'brand' },
  '#1877F2': { name: 'Facebook Blue', token: 'brand-facebook', category: 'brand' },
  '#1DA1F2': { name: 'Twitter Blue', token: 'brand-twitter', category: 'brand' },
  '#0A66C2': { name: 'LinkedIn Blue', token: 'brand-linkedin', category: 'brand' },
  '#FFE135': { name: 'Neo Yellow', token: 'neo-yellow', category: 'semantic' },
  '#FF1493': { name: 'Neo Pink', token: 'neo-pink', category: 'semantic' },
  '#00FFFF': { name: 'Neo Cyan', token: 'neo-cyan', category: 'semantic' },
  '#FF3366': { name: 'Neo Red', token: 'neo-red', category: 'semantic' },
  '#BFFF00': { name: 'Neo Lime', token: 'neo-lime', category: 'semantic' },
  '#FF6B35': { name: 'Neo Orange (deprecated)', token: 'neo-orange', category: 'deprecated' },
};

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
];

/**
 * Categorize color usage based on context
 */
function categorizeColor(colorValue, context, filePath) {
  const normalizedColor = colorValue.toUpperCase();

  // Check known colors first
  if (KNOWN_COLORS[normalizedColor]) {
    return KNOWN_COLORS[normalizedColor].category;
  }

  // Check context for category hints
  const lowerContext = context.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    for (const keyword of keywords) {
      if (lowerContext.includes(keyword) || lowerPath.includes(keyword)) {
        return category;
      }
    }
  }

  // Default to unknown
  return 'unknown';
}

/**
 * Get recommended design token for a color value
 */
function getRecommendedToken(colorValue) {
  const normalizedColor = colorValue.toUpperCase();
  return KNOWN_COLORS[normalizedColor]?.token || null;
}

/**
 * Extract color instances from a file
 */
function extractColors(filePath, content) {
  const instances = [];
  const lines = content.split('\n');

  // Process each pattern type
  for (const [patternType, regex] of Object.entries(COLOR_PATTERNS)) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const colorValue = match[0];
      const position = match.index;

      // Find line number and context
      let currentPos = 0;
      let lineNumber = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        if (currentPos + lineLength > position) {
          lineNumber = i + 1;
          break;
        }
        currentPos += lineLength;
      }

      // Extract context (50 chars before and after)
      const contextStart = Math.max(0, position - 50);
      const contextEnd = Math.min(content.length, position + 50);
      const context = content.substring(contextStart, contextEnd).replace(/\n/g, ' ');

      // Get component name from file path
      const componentName = path.basename(filePath, path.extname(filePath));

      // Categorize
      const category = categorizeColor(colorValue, context, filePath);
      const recommendedToken = getRecommendedToken(colorValue);

      instances.push({
        file_path: filePath,
        line_number: lineNumber,
        color_type: patternType,
        color_value: colorValue,
        context: context.trim(),
        component_name: componentName,
        category,
        needs_migration: patternType === 'hex' || patternType === 'rgb',
        recommended_token: recommendedToken,
      });
    }
  }

  return instances;
}

/**
 * Main audit function
 */
async function auditColors() {
  console.log('🎨 Starting color audit...\n');

  const startTime = Date.now();

  // Find all relevant files
  const patterns = [
    'app/**/*.{tsx,ts,jsx,js}',
    'components/**/*.{tsx,ts,jsx,js}',
    'lib/**/*.{tsx,ts,jsx,js}',
    'utils/**/*.{tsx,ts,jsx,js}',
    'hooks/**/*.{tsx,ts,jsx,js}',
    'contexts/**/*.{tsx,ts,jsx,js}',
    'backend/**/*.{tsx,ts,jsx,js}',
    'host/**/*.{tsx,ts,jsx,js}',
    'player/**/*.{tsx,ts,jsx,js}',
    '*.css',
    'app/**/*.css',
    'style/**/*.scss',
  ];

  console.log('📂 Scanning files...');
  const files = await glob(patterns, {
    ignore: EXCLUDE_PATTERNS,
    cwd: process.cwd(),
    absolute: true,
  });

  console.log(`   Found ${files.length} files to analyze\n`);

  // Extract colors from each file
  const allInstances = [];
  let filesProcessed = 0;

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const instances = extractColors(filePath, content);

      if (instances.length > 0) {
        allInstances.push(...instances);
        filesProcessed++;
      }
    } catch (error) {
      console.error(`   ⚠️  Error reading ${filePath}: ${error.message}`);
    }
  }

  console.log(`✅ Processed ${filesProcessed} files with color usage\n`);

  // Generate statistics
  const stats = {
    total_instances: allInstances.length,
    by_type: {},
    by_category: {},
    needs_migration: allInstances.filter(i => i.needs_migration).length,
    files_affected: new Set(allInstances.map(i => i.file_path)).size,
  };

  for (const instance of allInstances) {
    stats.by_type[instance.color_type] = (stats.by_type[instance.color_type] || 0) + 1;
    stats.by_category[instance.category] = (stats.by_category[instance.category] || 0) + 1;
  }

  // Generate report
  const report = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    statistics: stats,
    instances: allInstances,
  };

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), '.claude', 'plans');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write report
  const outputPath = path.join(outputDir, 'color-audit-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('📊 Audit Summary:');
  console.log(`   Total color instances: ${stats.total_instances}`);
  console.log(`   Files affected: ${stats.files_affected}`);
  console.log(`   Needs migration: ${stats.needs_migration}`);
  console.log('\n   By Type:');
  for (const [type, count] of Object.entries(stats.by_type)) {
    console.log(`   - ${type}: ${count}`);
  }
  console.log('\n   By Category:');
  for (const [category, count] of Object.entries(stats.by_category)) {
    console.log(`   - ${category}: ${count}`);
  }
  console.log(`\n✅ Report saved to: ${outputPath}`);
  console.log(`⏱️  Duration: ${(report.duration_ms / 1000).toFixed(2)}s\n`);
}

// Run audit
if (require.main === module) {
  auditColors().catch(error => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
}

module.exports = { auditColors, extractColors, categorizeColor };
