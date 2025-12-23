#!/usr/bin/env node

/**
 * WCAG Contrast Ratio Checker
 * Analyzes Tailwind classes to find text/background combinations with insufficient contrast
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
 */

const fs = require('fs');
const path = require('path');

// Tailwind color palette (approximate RGB values)
// These are the default Tailwind colors + custom neo-brutalist colors
const COLORS = {
  // Grayscale
  'white': [255, 255, 255],
  'black': [0, 0, 0],
  'gray-50': [249, 250, 251],
  'gray-100': [243, 244, 246],
  'gray-200': [229, 231, 235],
  'gray-300': [209, 213, 219],
  'gray-400': [156, 163, 175],
  'gray-500': [107, 114, 128],
  'gray-600': [75, 85, 99],
  'gray-700': [55, 65, 81],
  'gray-800': [31, 41, 55],
  'gray-900': [17, 24, 39],

  // Slate
  'slate-50': [248, 250, 252],
  'slate-100': [241, 245, 249],
  'slate-200': [226, 232, 240],
  'slate-300': [203, 213, 225],
  'slate-400': [148, 163, 184],
  'slate-500': [100, 116, 139],
  'slate-600': [71, 85, 105],
  'slate-700': [51, 65, 85],
  'slate-800': [30, 41, 59],
  'slate-900': [15, 23, 42],

  // Neo-brutalist custom colors (from tailwind.config.js)
  'neo-black': [18, 18, 18],
  'neo-white': [255, 255, 255],
  'neo-cream': [255, 253, 245],
  'neo-yellow': [255, 220, 0],
  'neo-cyan': [0, 255, 255],
  'neo-pink': [255, 105, 180],
  'neo-purple': [155, 89, 182],
  'neo-orange': [255, 165, 0],
  'neo-lime': [50, 205, 50],
  'neo-red': [239, 68, 68],
  'neo-gray': [75, 85, 99],
  'neo-navy': [30, 41, 59],
  'neo-navy-light': [51, 65, 85],

  // Common Tailwind colors
  'red-500': [239, 68, 68],
  'yellow-400': [250, 204, 21],
  'yellow-500': [234, 179, 8],
  'yellow-600': [202, 138, 4],
  'green-500': [34, 197, 94],
  'blue-500': [59, 130, 246],
  'cyan-400': [34, 211, 238],
  'amber-600': [217, 119, 6],
};

// Calculate relative luminance
function getLuminance(rgb) {
  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio between two colors
function getContrastRatio(rgb1, rgb2) {
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Apply opacity to a color against a background
function applyOpacity(fgColor, bgColor, opacity) {
  return fgColor.map((fg, i) => Math.round(fg * opacity + bgColor[i] * (1 - opacity)));
}

// Parse color from Tailwind class
function parseColor(colorClass) {
  // Handle opacity modifiers like text-neo-black/70
  const opacityMatch = colorClass.match(/(.+)\/(\d+)/);
  let colorName = colorClass;
  let opacity = 1;

  if (opacityMatch) {
    colorName = opacityMatch[1];
    opacity = parseInt(opacityMatch[2]) / 100;
  }

  // Remove prefixes
  colorName = colorName.replace(/^(text-|bg-|border-)/, '');

  const baseColor = COLORS[colorName];
  return baseColor ? { rgb: baseColor, opacity, name: colorName } : null;
}

// Extract text and background classes from a line
function extractColorPairs(line) {
  const pairs = [];

  // Find className strings
  const classNameMatches = line.matchAll(/className[=:]?\s*["'`{]([^"'`}]+)["'`}]/g);

  for (const match of classNameMatches) {
    const classes = match[1];

    // Extract text colors (ignore hover:, focus:, active: states)
    const textMatches = classes.matchAll(/(?<![a-z]:)((?:dark:)?text-[a-z]+-?\d*(?:\/\d+)?)/g);
    // Extract bg colors (ignore hover:, focus:, active: states and very low opacity overlays)
    const bgMatches = classes.matchAll(/(?<![a-z]:)((?:dark:)?bg-[a-z]+-?\d*(?:\/(?:[3-9]\d|\d{3}))?)(?!\/[12]\d\b)/g);

    const textColors = [...textMatches].map(m => m[1]);
    const bgColors = [...bgMatches].map(m => m[1]);

    // Check light mode combinations
    const lightTextColors = textColors.filter(c => !c.startsWith('dark:'));
    const lightBgColors = bgColors.filter(c => !c.startsWith('dark:'));

    // Check dark mode combinations
    const darkTextColors = textColors.filter(c => c.startsWith('dark:')).map(c => c.replace('dark:', ''));
    const darkBgColors = bgColors.filter(c => c.startsWith('dark:')).map(c => c.replace('dark:', ''));

    // Generate pairs
    for (const text of lightTextColors) {
      for (const bg of lightBgColors) {
        pairs.push({ text, bg, mode: 'light' });
      }
      // If no explicit bg, assume white for light mode
      if (lightBgColors.length === 0) {
        pairs.push({ text, bg: 'bg-white', mode: 'light', assumed: true });
      }
    }

    for (const text of darkTextColors) {
      for (const bg of darkBgColors) {
        pairs.push({ text, bg, mode: 'dark' });
      }
      // If no explicit dark bg, assume neo-navy for dark mode
      if (darkBgColors.length === 0 && darkTextColors.length > 0) {
        pairs.push({ text, bg: 'bg-neo-navy', mode: 'dark', assumed: true });
      }
    }
  }

  return pairs;
}

// Analyze a file for contrast issues
function analyzeFile(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const pairs = extractColorPairs(line);

    for (const pair of pairs) {
      const textColor = parseColor(pair.text.replace('text-', ''));
      const bgColor = parseColor(pair.bg.replace('bg-', ''));

      if (!textColor || !bgColor) continue;

      // Apply opacity if present
      let effectiveTextRgb = textColor.rgb;
      if (textColor.opacity < 1) {
        effectiveTextRgb = applyOpacity(textColor.rgb, bgColor.rgb, textColor.opacity);
      }

      let effectiveBgRgb = bgColor.rgb;
      if (bgColor.opacity < 1) {
        // For bg opacity, blend with white (light) or neo-navy (dark)
        const baseBg = pair.mode === 'dark' ? COLORS['neo-navy'] : COLORS['white'];
        effectiveBgRgb = applyOpacity(bgColor.rgb, baseBg, bgColor.opacity);
      }

      const ratio = getContrastRatio(effectiveTextRgb, effectiveBgRgb);

      // WCAG AA requires 4.5:1 for normal text
      if (ratio < 4.5) {
        issues.push({
          file: filePath,
          line: lineIndex + 1,
          text: pair.text,
          bg: pair.bg,
          mode: pair.mode,
          ratio: ratio.toFixed(2),
          severity: ratio < 3 ? 'high' : 'medium',
          assumed: pair.assumed,
          context: line.trim().substring(0, 100),
        });
      }
    }
  });

  return issues;
}

// Scan directory
function scanDirectory(dir) {
  let allIssues = [];
  const exclude = ['node_modules', '.next', 'dist', '.git', 'check-'];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (exclude.some(e => fullPath.includes(e))) continue;

    if (item.isDirectory()) {
      allIssues = allIssues.concat(scanDirectory(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.jsx'))) {
      allIssues = allIssues.concat(analyzeFile(fullPath));
    }
  }

  return allIssues;
}

function main() {
  const baseDir = process.argv[2] || path.join(__dirname, '..');

  console.log('🎨 WCAG Contrast Ratio Checker\n');
  console.log(`Scanning: ${baseDir}\n`);
  console.log('WCAG AA requires 4.5:1 for normal text, 3:1 for large text\n');

  const issues = scanDirectory(baseDir);

  // Filter out assumed backgrounds (less reliable)
  const confirmedIssues = issues.filter(i => !i.assumed);
  const assumedIssues = issues.filter(i => i.assumed);

  const highSeverity = confirmedIssues.filter(i => i.severity === 'high');
  const mediumSeverity = confirmedIssues.filter(i => i.severity === 'medium');

  console.log('📊 Summary (confirmed text+bg combinations):');
  console.log(`   🔴 High (ratio < 3:1): ${highSeverity.length}`);
  console.log(`   🟡 Medium (ratio < 4.5:1): ${mediumSeverity.length}`);
  console.log(`   ℹ️  Assumed bg combinations: ${assumedIssues.length}\n`);

  if (highSeverity.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔴 HIGH SEVERITY (contrast ratio < 3:1):');
    console.log('═══════════════════════════════════════════════════════════\n');

    highSeverity.slice(0, 20).forEach(issue => {
      const relativePath = path.relative(baseDir, issue.file);
      console.log(`${relativePath}:${issue.line}`);
      console.log(`   Text: ${issue.text} on ${issue.bg} (${issue.mode} mode)`);
      console.log(`   Contrast: ${issue.ratio}:1 (need 4.5:1)\n`);
    });

    if (highSeverity.length > 20) {
      console.log(`   ... and ${highSeverity.length - 20} more\n`);
    }
  }

  if (mediumSeverity.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟡 MEDIUM SEVERITY (contrast ratio < 4.5:1):');
    console.log('═══════════════════════════════════════════════════════════\n');

    mediumSeverity.slice(0, 15).forEach(issue => {
      const relativePath = path.relative(baseDir, issue.file);
      console.log(`${relativePath}:${issue.line}`);
      console.log(`   Text: ${issue.text} on ${issue.bg} (${issue.mode} mode)`);
      console.log(`   Contrast: ${issue.ratio}:1 (need 4.5:1)\n`);
    });

    if (mediumSeverity.length > 15) {
      console.log(`   ... and ${mediumSeverity.length - 15} more\n`);
    }
  }

  if (confirmedIssues.length === 0) {
    console.log('✅ No confirmed contrast issues found in explicit text+bg combinations!');
  }
}

main();
