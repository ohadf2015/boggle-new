#!/usr/bin/env node

/**
 * Accessibility Audit Script
 *
 * Checks WCAG 2.1 AA compliance for all color combinations in the design system.
 * Tests contrast ratios for:
 * - Neo-Brutalist 5-color palette on backgrounds
 * - Brand colors on various backgrounds
 * - Gradient text overlays
 * - Avatar colors on card backgrounds
 *
 * Outputs a JSON report with violations categorized by severity.
 */

const fs = require('fs');
const path = require('path');

// WCAG 2.1 AA Requirements
const WCAG_REQUIREMENTS = {
  NORMAL_TEXT: 4.5,    // Normal text (< 18pt)
  LARGE_TEXT: 3.0,     // Large text (≥ 18pt or 14pt bold)
  UI_COMPONENT: 3.0,   // UI components and graphics
};

// Color definitions
const COLORS = {
  // Neo-Brutalist Palette
  'neo-yellow': '#FFE135',
  'neo-yellow-hover': '#FFD000',
  'neo-pink': '#FF1493',
  'neo-pink-light': '#FF69B4',
  'neo-cyan': '#00FFFF',
  'neo-cyan-muted': '#4dd9d9',
  'neo-red': '#FF3366',
  'neo-lime': '#BFFF00',

  // Brand Colors
  'brand-google': '#4285F4',
  'brand-google-hover': '#3367D6',
  'brand-discord': '#5865F2',
  'brand-discord-hover': '#4752C4',
  'brand-apple': '#000000',
  'brand-whatsapp': '#25D366',
  'brand-whatsapp-hover': '#1ebe5d',
  'brand-facebook': '#1877F2',
  'brand-twitter': '#1DA1F2',
  'brand-linkedin': '#0A66C2',

  // Backgrounds
  'neo-navy': '#1a1a2e',
  'neo-navy-light': '#16213e',
  'neo-gray': '#2d2d44',
  'neo-cream': '#FFFEF0',
  'white': '#FFFFFF',
  'black': '#000000',

  // Deprecated
  'neo-orange': '#FF6B35',
};

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return 0;
  }

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get WCAG level for a contrast ratio
 */
function getWcagLevel(ratio, textSize = 'normal') {
  const requirement = textSize === 'large'
    ? WCAG_REQUIREMENTS.LARGE_TEXT
    : WCAG_REQUIREMENTS.NORMAL_TEXT;

  if (ratio >= 7.0) return 'AAA';
  if (ratio >= requirement) return 'AA';
  return 'FAIL';
}

/**
 * Get severity based on how far below requirement
 */
function getSeverity(actual, required) {
  const ratio = actual / required;
  if (ratio >= 1.0) return null; // Passes
  if (ratio >= 0.9) return 'low';
  if (ratio >= 0.75) return 'medium';
  if (ratio >= 0.5) return 'high';
  return 'critical';
}

/**
 * Suggest color adjustment to meet contrast requirements
 */
function suggestFix(foreground, background, currentRatio, requiredRatio) {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  const fgLum = getLuminance(fgRgb);
  const bgLum = getLuminance(bgRgb);

  if (fgLum > bgLum) {
    // Foreground is lighter - suggest lightening it more or darkening background
    return `Lighten foreground by 10% or darken background to improve contrast`;
  } else {
    // Foreground is darker - suggest darkening it more or lightening background
    return `Darken foreground by 10% or lighten background to improve contrast`;
  }
}

/**
 * Test all color pairs
 */
function auditColorPairs() {
  console.log('♿ Starting accessibility audit...\n');

  const startTime = Date.now();
  const violations = [];
  const passes = [];

  // Define color pairs to test
  const testPairs = [
    // Neo-Brutalist palette on dark backgrounds
    { fg: 'neo-yellow', bg: 'neo-navy', component: 'Primary CTA', textSize: 'normal' },
    { fg: 'neo-yellow', bg: 'neo-gray', component: 'Primary CTA on cards', textSize: 'normal' },
    { fg: 'neo-pink', bg: 'neo-navy', component: 'Secondary action', textSize: 'normal' },
    { fg: 'neo-pink', bg: 'neo-gray', component: 'Secondary action on cards', textSize: 'normal' },
    { fg: 'neo-cyan', bg: 'neo-navy', component: 'Links', textSize: 'normal' },
    { fg: 'neo-cyan', bg: 'neo-gray', component: 'Links on cards', textSize: 'normal' },
    { fg: 'neo-red', bg: 'neo-navy', component: 'Error messages', textSize: 'normal' },
    { fg: 'neo-red', bg: 'neo-gray', component: 'Error messages on cards', textSize: 'normal' },
    { fg: 'neo-lime', bg: 'neo-navy', component: 'Success messages', textSize: 'normal' },
    { fg: 'neo-lime', bg: 'neo-gray', component: 'Success messages on cards', textSize: 'normal' },

    // Neo-Brutalist palette on light backgrounds (light mode)
    { fg: 'neo-yellow', bg: 'white', component: 'Primary CTA (light mode)', textSize: 'large' },
    { fg: 'neo-yellow', bg: 'neo-cream', component: 'Primary CTA on cream', textSize: 'large' },
    { fg: 'neo-pink', bg: 'white', component: 'Secondary action (light mode)', textSize: 'large' },
    { fg: 'neo-cyan', bg: 'white', component: 'Links (light mode)', textSize: 'normal' },
    { fg: 'neo-red', bg: 'white', component: 'Error messages (light mode)', textSize: 'normal' },
    { fg: 'neo-lime', bg: 'white', component: 'Success messages (light mode)', textSize: 'large' },

    // Brand colors on dark backgrounds
    { fg: 'brand-google', bg: 'neo-navy', component: 'Google OAuth button', textSize: 'normal' },
    { fg: 'brand-discord', bg: 'neo-navy', component: 'Discord OAuth button', textSize: 'normal' },
    { fg: 'brand-whatsapp', bg: 'neo-navy', component: 'WhatsApp share button', textSize: 'large' },
    { fg: 'brand-facebook', bg: 'neo-navy', component: 'Facebook share button', textSize: 'normal' },
    { fg: 'brand-twitter', bg: 'neo-navy', component: 'Twitter share button', textSize: 'normal' },
    { fg: 'brand-linkedin', bg: 'neo-navy', component: 'LinkedIn share button', textSize: 'normal' },

    // Brand colors on white backgrounds
    { fg: 'brand-google', bg: 'white', component: 'Google OAuth (light mode)', textSize: 'normal' },
    { fg: 'brand-discord', bg: 'white', component: 'Discord OAuth (light mode)', textSize: 'normal' },
    { fg: 'brand-whatsapp', bg: 'white', component: 'WhatsApp share (light mode)', textSize: 'large' },
    { fg: 'brand-facebook', bg: 'white', component: 'Facebook share (light mode)', textSize: 'normal' },

    // Text on brand color backgrounds
    { fg: 'white', bg: 'brand-google', component: 'White text on Google blue', textSize: 'normal' },
    { fg: 'white', bg: 'brand-discord', component: 'White text on Discord blue', textSize: 'normal' },
    { fg: 'black', bg: 'brand-whatsapp', component: 'Black text on WhatsApp green', textSize: 'large' },
    { fg: 'white', bg: 'brand-facebook', component: 'White text on Facebook blue', textSize: 'normal' },

    // Gradient text overlays (checking worst case - lightest color)
    { fg: 'black', bg: 'neo-yellow', component: 'Black text on yellow gradient (1st place)', textSize: 'large' },
    { fg: 'black', bg: '#e2e8f0', component: 'Black text on slate gradient (2nd place)', textSize: 'normal' },
    { fg: 'black', bg: '#fbbf24', component: 'Black text on amber gradient (3rd place)', textSize: 'large' },

    // Deprecated colors
    { fg: 'neo-orange', bg: 'neo-navy', component: 'Deprecated orange (to be removed)', textSize: 'normal' },
  ];

  console.log(`🧪 Testing ${testPairs.length} color combinations...\n`);

  for (const pair of testPairs) {
    const fgColor = COLORS[pair.fg];
    const bgColor = COLORS[pair.bg];

    if (!fgColor || !bgColor) {
      console.warn(`⚠️  Unknown color: ${pair.fg} or ${pair.bg}`);
      continue;
    }

    const contrast = getContrastRatio(fgColor, bgColor);
    const required = pair.textSize === 'large'
      ? WCAG_REQUIREMENTS.LARGE_TEXT
      : WCAG_REQUIREMENTS.NORMAL_TEXT;
    const wcagLevel = getWcagLevel(contrast, pair.textSize);
    const severity = getSeverity(contrast, required);

    const result = {
      foreground: pair.fg,
      foreground_hex: fgColor,
      background: pair.bg,
      background_hex: bgColor,
      component_name: pair.component,
      text_size: pair.textSize,
      contrast_ratio: parseFloat(contrast.toFixed(2)),
      required_ratio: required,
      wcag_level: wcagLevel,
      passes: contrast >= required,
    };

    if (severity) {
      result.severity = severity;
      result.suggested_fix = suggestFix(fgColor, bgColor, contrast, required);
      violations.push(result);
    } else {
      passes.push(result);
    }
  }

  // Generate summary
  const summary = {
    total_pairs_tested: testPairs.length,
    passes: passes.length,
    violations: violations.length,
    by_severity: {
      critical: violations.filter(v => v.severity === 'critical').length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length,
    },
  };

  // Generate report
  const report = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    wcag_requirements: WCAG_REQUIREMENTS,
    summary,
    violations,
    passes,
  };

  // Save report
  const outputDir = path.join(process.cwd(), '.claude', 'plans');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'accessibility-audit-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('📊 Accessibility Audit Summary:');
  console.log(`   Total combinations tested: ${summary.total_pairs_tested}`);
  console.log(`   ✅ Passes: ${summary.passes}`);
  console.log(`   ❌ Violations: ${summary.violations}`);

  if (summary.violations > 0) {
    console.log('\n   By Severity:');
    console.log(`   🔴 Critical: ${summary.by_severity.critical}`);
    console.log(`   🟠 High: ${summary.by_severity.high}`);
    console.log(`   🟡 Medium: ${summary.by_severity.medium}`);
    console.log(`   🟢 Low: ${summary.by_severity.low}`);

    console.log('\n   Top 5 Critical Violations:');
    const criticalViolations = violations
      .filter(v => v.severity === 'critical' || v.severity === 'high')
      .slice(0, 5);

    for (const v of criticalViolations) {
      console.log(`   - ${v.component_name}`);
      console.log(`     ${v.foreground} on ${v.background}`);
      console.log(`     Contrast: ${v.contrast_ratio}:1 (requires ${v.required_ratio}:1)`);
      console.log(`     ${v.suggested_fix}`);
      console.log('');
    }
  }

  console.log(`\n✅ Report saved to: ${outputPath}`);
  console.log(`⏱️  Duration: ${(report.duration_ms / 1000).toFixed(2)}s\n`);

  // Return exit code based on critical violations
  return summary.by_severity.critical > 0 ? 1 : 0;
}

// Run audit
if (require.main === module) {
  const exitCode = auditColorPairs();
  process.exit(exitCode);
}

module.exports = {
  getContrastRatio,
  getWcagLevel,
  getSeverity,
  auditColorPairs
};
