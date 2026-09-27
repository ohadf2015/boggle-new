/**
 * Blast v2 Generator Quality Audit
 * Measures generator performance: interestingness, regen rate, cascade opportunity rate
 */

import type { Locale } from './types';
import { LOCALE_CONFIGS } from './locale-config';
import { GeneratedLevelSource } from './generator/generated-level-source';
import { INTERESTINGNESS_THRESHOLD } from './generator/interestingness';

export interface AuditOptions {
  levelRange?: [number, number]; // [minLevel, maxLevel] inclusive
  bucketCount?: number; // number of user buckets to sample
  verbose?: boolean;
}

export interface AuditReport {
  locale: Locale;
  timestamp: string;
  levelRange: [number, number];
  levelCount: number;
  totalAttempts: number;
  successCount: number;
  regenRate: number; // 0-1, ratio of failed attempts
  scores: number[];
  meanInterestingness: number;
  medianInterestingness: number;
  minInterestingness: number;
  maxInterestingness: number;
  cascadeOpportunityRate: number; // 0-1, levels with potential cascades
  threshold: number;
  thresholdPassed: boolean;
}

const AUDIT_THRESHOLDS = {
  regenRate: 0.3, // < 30% regenerations acceptable
  meanInterestingness: 0.6, // >= 0.6 acceptable
  cascadeOpportunityRate: 0.3, // >= 30% of levels have cascade potential
};

/**
 * Run generator quality audit for a single locale
 * Tests levels 31-80 × bucketCount user buckets
 */
export async function auditGeneratorQuality(
  locale: Locale,
  options: AuditOptions = {}
): Promise<AuditReport> {
  const [minLevel, maxLevel] = options.levelRange || [31, 80];
  const bucketCount = options.bucketCount || 100;
  const verbose = options.verbose || false;

  if (!LOCALE_CONFIGS[locale]) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  const generator = new GeneratedLevelSource(LOCALE_CONFIGS);
  const startTime = Date.now();

  const scores: number[] = [];
  let totalAttempts = 0;
  let regenAttempts = 0;
  let cascadeCount = 0;

  if (verbose) {
    console.log(`\nAuditing ${locale} generator...`);
  }

  for (let level = minLevel; level <= maxLevel; level++) {
    for (let bucket = 0; bucket < bucketCount; bucket++) {
      try {
        totalAttempts++;
        const userIdBucket = `bucket-${bucket}`;
        const genLevel = await generator.resolve(level, locale, userIdBucket);

        if (genLevel.interestingnessScore !== undefined) {
          scores.push(genLevel.interestingnessScore);

          // Check for cascade opportunity (enough columns for cascades)
          if (genLevel.columns.length >= 3) {
            cascadeCount++;
          }
        }
      } catch (e) {
        // Generator failed — count as regen attempt
        regenAttempts++;
      }
    }
  }

  const endTime = Date.now();
  const elapsedSeconds = (endTime - startTime) / 1000;

  const levelCount = maxLevel - minLevel + 1;
  const successCount = scores.length;
  const regenRate = regenAttempts / totalAttempts;

  // Compute statistics
  const meanInterestingness = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const medianInterestingness = sortedScores[Math.floor(sortedScores.length / 2)] || 0;
  const minInterestingness = Math.min(...scores, 0);
  const maxInterestingness = Math.max(...scores, 0);
  const cascadeOpportunityRate = successCount > 0 ? cascadeCount / successCount : 0;

  const report: AuditReport = {
    locale,
    timestamp: new Date().toISOString(),
    levelRange: [minLevel, maxLevel],
    levelCount,
    totalAttempts,
    successCount,
    regenRate,
    scores,
    meanInterestingness,
    medianInterestingness,
    minInterestingness,
    maxInterestingness,
    cascadeOpportunityRate,
    threshold: INTERESTINGNESS_THRESHOLD,
    thresholdPassed: checkThresholds(regenRate, meanInterestingness, cascadeOpportunityRate),
  };

  if (verbose) {
    console.log(`\n✓ Audit complete in ${elapsedSeconds.toFixed(2)}s`);
    console.log(`  Levels: ${levelCount}, Buckets: ${bucketCount}`);
    console.log(`  Success: ${successCount}/${totalAttempts} (regen rate: ${(regenRate * 100).toFixed(1)}%)`);
    console.log(`  Interestingness: mean ${meanInterestingness.toFixed(2)}, median ${medianInterestingness.toFixed(2)}`);
    console.log(`  Cascade opportunities: ${(cascadeOpportunityRate * 100).toFixed(1)}%`);
    console.log(`  Thresholds: ${report.thresholdPassed ? '✓ PASS' : '✗ FAIL'}`);
  }

  return report;
}

/**
 * Check if all thresholds pass
 */
function checkThresholds(regenRate: number, meanInterestingness: number, cascadeRate: number): boolean {
  const regenPass = regenRate < AUDIT_THRESHOLDS.regenRate;
  const interestPass = meanInterestingness >= AUDIT_THRESHOLDS.meanInterestingness;
  const cascadePass = cascadeRate >= AUDIT_THRESHOLDS.cascadeOpportunityRate;

  return regenPass && interestPass && cascadePass;
}

/**
 * Format audit report as markdown
 */
export function formatReportAsMarkdown(report: AuditReport): string {
  const lines = [
    `# Generator Quality Audit — ${report.locale.toUpperCase()}`,
    ``,
    `**Date:** ${report.timestamp}`,
    `**Elapsed:** ${report.timestamp}`,
    ``,
    `## Test Coverage`,
    `- Levels: ${report.levelRange[0]}–${report.levelRange[1]} (${report.levelCount} unique)`,
    `- Total samples: ${report.totalAttempts}`,
    `- Successful: ${report.successCount} (${((report.successCount / report.totalAttempts) * 100).toFixed(1)}%)`,
    ``,
    `## Metrics`,
    `| Metric | Value | Threshold | Status |`,
    `|--------|-------|-----------|--------|`,
    `| Regen rate | ${(report.regenRate * 100).toFixed(1)}% | < 30% | ${report.regenRate < 0.3 ? '✓' : '✗'} |`,
    `| Mean interestingness | ${report.meanInterestingness.toFixed(3)} | ≥ 0.60 | ${report.meanInterestingness >= 0.6 ? '✓' : '✗'} |`,
    `| Cascade opportunity rate | ${(report.cascadeOpportunityRate * 100).toFixed(1)}% | ≥ 30% | ${report.cascadeOpportunityRate >= 0.3 ? '✓' : '✗'} |`,
    ``,
    `## Detailed Stats`,
    `- Min interestingness: ${report.minInterestingness.toFixed(3)}`,
    `- Median interestingness: ${report.medianInterestingness.toFixed(3)}`,
    `- Max interestingness: ${report.maxInterestingness.toFixed(3)}`,
    `- Threshold: ${report.threshold.toFixed(2)}`,
    ``,
    `## Result`,
    `${report.thresholdPassed ? '✓ **PASS** — All thresholds met' : '✗ **FAIL** — One or more thresholds exceeded'}`,
  ];

  return lines.join('\n');
}
