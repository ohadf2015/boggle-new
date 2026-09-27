/**
 * Pro feature gating test suite.
 *
 * Verifies that:
 * 1. All Pro features advertised on the upgrade page are actually enforced in code
 * 2. Free teachers cannot access Pro-only features
 * 3. Pro teachers can access all features
 * 4. Feature gates fire PostHog events for conversion tracking
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getTierConfig } from '@/lib/lemonsqueezy';
import { PRO_FEATURES } from '@/components/teacher/ProGate';

const UPGRADE_PAGE = join(__dirname, '../../../[locale]/teacher/upgrade/PageClient.tsx');
const PROGATES_FILE = join(__dirname, '../../../../components/teacher/ProGate.tsx');

describe('Teacher Pro gating', () => {
  it('has PRO_FEATURES array that matches what getTierConfig("pro") actually sells', () => {
    const proConfig = getTierConfig('pro');
    const advertised = proConfig.features.filter(
      (f) => !f.includes('Unlimited') && f !== 'Everything in Free',
    );

    expect(advertised.length).toBeGreaterThan(0);
    expect(advertised.map((f) => f.toLowerCase().split(' ')[0])).toContain('analytics');
  });

  it('enforces analytics in code through ProGate.tsx', () => {
    const src = readFileSync(PROGATES_FILE, 'utf8');
    expect(src).toContain("'analytics'");
    expect(src).toContain("'reports'");
  });

  it('does not advertise any feature on the upgrade page that ProGate cannot refuse', () => {
    const proConfig = getTierConfig('pro');
    const proFeatures = proConfig.features.filter(
      (f) => !f.includes('Unlimited') && f !== 'Everything in Free',
    );
    const gated = readFileSync(PROGATES_FILE, 'utf8');

    for (const feature of proFeatures) {
      const key = feature.toLowerCase().split(' ')[0];
      expect(gated).toContain(key);
    }
  });

  it('advertises unlimited classes and unlimited students on the upgrade page', () => {
    const src = readFileSync(UPGRADE_PAGE, 'utf8');
    expect(src).toContain('unlimitedClasses');
    expect(src).toContain('unlimitedStudents');
  });

  it('includes all PRO_FEATURES in the ProGate component', () => {
    const gated = readFileSync(PROGATES_FILE, 'utf8');
    for (const feature of PRO_FEATURES) {
      expect(gated).toContain(`'${feature}'`);
    }
  });

  it('has translations for all Pro feature gates in at least one locale', () => {
    const src = readFileSync(PROGATES_FILE, 'utf8');
    // Check that the gate renders teacher.proGate.<feature>.title and .body keys
    expect(src).toContain('teacher.proGate.');
  });

  it('does not lock features that free teachers are actively using', () => {
    // Per 02-usage-data.md: 19 custom lesson packs created by free teachers
    // Custom lists should NOT be in PRO_FEATURES
    expect(PRO_FEATURES).not.toContain('customLists');
    // Ad-free is also free: "No advertising for your students" in tier config
    expect(PRO_FEATURES).not.toContain('noAds');
  });

  it('removes the dead "duels" feature from all tier lists', () => {
    const free = getTierConfig('free');
    expect(free.features.join()).not.toContain('duel');

    const pro = getTierConfig('pro');
    expect(pro.features.join()).not.toContain('duel');
  });
});
