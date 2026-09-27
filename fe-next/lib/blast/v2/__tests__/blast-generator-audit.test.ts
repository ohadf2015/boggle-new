import { describe, it, expect } from 'vitest';
import { auditGeneratorQuality } from '../blast-generator-audit';

describe('Generator Quality Audit', () => {
  it('should audit EN generator and return quality metrics', async () => {
    const report = await auditGeneratorQuality('en', { levelRange: [31, 35], bucketCount: 10 });

    expect(report).toBeDefined();
    expect(report.locale).toBe('en');
    expect(typeof report.meanInterestingness).toBe('number');
    expect(report.meanInterestingness).toBeGreaterThan(0);
    expect(typeof report.regenRate).toBe('number');
    expect(report.regenRate).toBeLessThanOrEqual(1);
    expect(typeof report.levelCount).toBe('number');
    expect(report.levelCount).toBeGreaterThan(0);
  });

  it('should pass threshold for EN locale', async () => {
    const report = await auditGeneratorQuality('en', { levelRange: [31, 40], bucketCount: 5 });

    expect(report.meanInterestingness).toBeGreaterThanOrEqual(0.6);
    expect(report.regenRate).toBeLessThan(0.3);
  });

  it('should compute cascade rate correctly', async () => {
    const report = await auditGeneratorQuality('en', { levelRange: [31, 35], bucketCount: 3 });

    expect(typeof report.cascadeOpportunityRate).toBe('number');
    expect(report.cascadeOpportunityRate).toBeGreaterThanOrEqual(0);
    expect(report.cascadeOpportunityRate).toBeLessThanOrEqual(1);
  });

  it('should audit multiple locales', async () => {
    const reports = await Promise.all(['en', 'he', 'es'].map((locale) =>
      auditGeneratorQuality(locale as any, { levelRange: [31, 33], bucketCount: 2 })
    ));

    expect(reports).toHaveLength(3);
    for (const report of reports) {
      expect(report.meanInterestingness).toBeGreaterThan(0);
    }
  });
});
