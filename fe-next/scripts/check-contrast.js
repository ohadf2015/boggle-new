#!/usr/bin/env node

/**
 * Contrast Issue Checker
 * Scans TSX/CSS files for potential contrast issues based on known problematic patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns that indicate potential contrast issues
const PROBLEMATIC_PATTERNS = [
  // CRITICAL: Text with very low opacity (50% or below) - definitely problematic
  { pattern: /text-[a-z-]+\/[1-5]0(?!\d)/g, severity: 'high', desc: 'Text with opacity 50% or below - fix required' },

  // Text with 60% opacity is borderline - flag for review
  { pattern: /text-[a-z-]+\/60(?!\d)/g, severity: 'medium', desc: 'Text with 60% opacity - borderline contrast' },

  // Element opacity is often intentional (disabled states, decorative backgrounds)
  // Only flag very low opacity as medium, and 50%+ as info-only
  { pattern: /opacity-[1-3]0(?!\d)/g, severity: 'low', desc: 'Element with low opacity (likely decorative/disabled)' },

  // Gray text that may have poor contrast
  { pattern: /text-gray-[34]00(?!\d)/g, severity: 'medium', desc: 'Light gray text (gray-300/400) - check dark mode' },
  { pattern: /dark:text-gray-[45]00(?!\d)/g, severity: 'medium', desc: 'Gray text in dark mode - may be too dark' },

  // White text with low opacity in dark mode
  { pattern: /dark:text-white\/[1-5]0(?!\d)/g, severity: 'high', desc: 'White text with low opacity in dark mode' },
  { pattern: /dark:text-neo-white\/[1-5]0(?!\d)/g, severity: 'high', desc: 'Neo-white text with low opacity in dark mode' },
  { pattern: /dark:text-neo-cream\/[1-5]0(?!\d)/g, severity: 'high', desc: 'Neo-cream text with low opacity in dark mode' },

  // Black text with low opacity
  { pattern: /text-neo-black\/[1-5]0(?!\d)/g, severity: 'high', desc: 'Neo-black text with low opacity' },
  { pattern: /text-black\/[1-5]0(?!\d)/g, severity: 'high', desc: 'Black text with low opacity' },

  // Potential dark-on-dark or light-on-light
  { pattern: /bg-gray-[789]00[^/].*text-gray-[456]00/g, severity: 'medium', desc: 'Dark gray bg with medium gray text' },
  { pattern: /bg-slate-[789]00[^/].*text-gray-[456]00/g, severity: 'medium', desc: 'Dark slate bg with medium gray text' },

  // Missing dark mode text color
  { pattern: /text-neo-black(?!\/| dark:| ")(?![a-z])/g, severity: 'low', desc: 'Neo-black text without dark mode variant' },
  { pattern: /text-gray-[789]00(?! dark:)/g, severity: 'low', desc: 'Dark gray text without dark mode variant' },

  // Slate colors that might not contrast well
  { pattern: /text-slate-[34]00(?!\d)/g, severity: 'medium', desc: 'Light slate text - verify contrast' },
  { pattern: /dark:text-slate-[456]00(?!\d)/g, severity: 'medium', desc: 'Slate text in dark mode - may be too dark' },
];

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  '.git',
  'check-contrast.js', // This script
];

// File extensions to check
const EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js', '.css'];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    PROBLEMATIC_PATTERNS.forEach(({ pattern, severity, desc }) => {
      // Reset regex state
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        issues.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          match: match[0],
          severity,
          description: desc,
          context: line.trim().substring(0, 120),
        });
      }
    });
  });

  return issues;
}

function scanDirectory(dir) {
  let allIssues = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (shouldExclude(fullPath)) continue;

    if (item.isDirectory()) {
      allIssues = allIssues.concat(scanDirectory(fullPath));
    } else if (item.isFile() && EXTENSIONS.some(ext => item.name.endsWith(ext))) {
      allIssues = allIssues.concat(scanFile(fullPath));
    }
  }

  return allIssues;
}

function formatIssue(issue, baseDir) {
  const relativePath = path.relative(baseDir, issue.file);
  const severityIcon = {
    high: '🔴',
    medium: '🟡',
    low: '🔵',
  }[issue.severity];

  return `${severityIcon} [${issue.severity.toUpperCase()}] ${relativePath}:${issue.line}
   Match: "${issue.match}"
   Issue: ${issue.description}
   Context: ${issue.context}`;
}

function main() {
  const baseDir = process.argv[2] || path.join(__dirname, '..');

  console.log('🔍 Scanning for contrast issues...\n');
  console.log(`Base directory: ${baseDir}\n`);

  const issues = scanDirectory(baseDir);

  // Group by severity
  const highSeverity = issues.filter(i => i.severity === 'high');
  const mediumSeverity = issues.filter(i => i.severity === 'medium');
  const lowSeverity = issues.filter(i => i.severity === 'low');

  // Print summary
  console.log('📊 Summary:');
  console.log(`   🔴 High severity: ${highSeverity.length}`);
  console.log(`   🟡 Medium severity: ${mediumSeverity.length}`);
  console.log(`   🔵 Low severity: ${lowSeverity.length}`);
  console.log(`   Total: ${issues.length}\n`);

  // Print high severity issues first
  if (highSeverity.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔴 HIGH SEVERITY ISSUES (should be fixed):');
    console.log('═══════════════════════════════════════════════════════════\n');
    highSeverity.forEach(issue => console.log(formatIssue(issue, baseDir) + '\n'));
  }

  // Print medium severity issues
  if (mediumSeverity.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟡 MEDIUM SEVERITY ISSUES (review recommended):');
    console.log('═══════════════════════════════════════════════════════════\n');
    mediumSeverity.forEach(issue => console.log(formatIssue(issue, baseDir) + '\n'));
  }

  // Print low severity (optional, can be verbose)
  if (process.argv.includes('--all') && lowSeverity.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 LOW SEVERITY ISSUES (informational):');
    console.log('═══════════════════════════════════════════════════════════\n');
    lowSeverity.forEach(issue => console.log(formatIssue(issue, baseDir) + '\n'));
  } else if (lowSeverity.length > 0) {
    console.log(`ℹ️  ${lowSeverity.length} low severity issues found. Run with --all to see them.\n`);
  }

  // Exit with error code if high severity issues found
  if (highSeverity.length > 0) {
    console.log('❌ High severity contrast issues found. Please fix them.');
    process.exit(1);
  } else if (mediumSeverity.length > 0) {
    console.log('⚠️  Medium severity issues found. Review recommended.');
    process.exit(0);
  } else {
    console.log('✅ No significant contrast issues found!');
    process.exit(0);
  }
}

main();
