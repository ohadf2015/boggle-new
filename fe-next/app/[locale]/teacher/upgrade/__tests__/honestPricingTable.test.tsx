/**
 * Honest Pricing Table Test
 *
 * Ensures that the upgrade page does NOT advertise dead features or features
 * that are already free. Specifically, `duels` has 0 usage (student_duels: 0 rows ever)
 * and should never appear in any tier list.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Upgrade page — honest feature advertising', () => {
  it('does not advertise the dead duels feature', () => {
    // Read the source file directly
    const pageSource = readFileSync(
      join(__dirname, '../PageClient.tsx'),
      'utf-8'
    );

    // Duels has 0 student_duels rows ever (usage data § 2).
    // It must not appear in any tier list on the upgrade page.
    // This guards against advertising non-working/unused features as part of a plan.

    // freeFeatures list should not include duels
    const freeMatch = pageSource.match(
      /const freeFeatures = \[([\s\S]*?)\];/
    );
    expect(freeMatch).not.toBeNull();
    if (freeMatch) {
      expect(freeMatch[0]).not.toContain('education.landing.pro.duels');
    }
  });

  it('advertises genuinely-free features in the free tier', () => {
    const pageSource = readFileSync(
      join(__dirname, '../PageClient.tsx'),
      'utf-8'
    );

    // Per usage data, customLists (19 created) and noAds are genuinely free.
    // They should appear in the freeFeatures list.
    const freeMatch = pageSource.match(
      /const freeFeatures = \[([\s\S]*?)\];/
    );
    expect(freeMatch).not.toBeNull();
    if (freeMatch) {
      expect(freeMatch[0]).toContain('education.landing.pro.customLists');
      expect(freeMatch[0]).toContain('education.landing.pro.noAds');
    }
  });

  it('references PRO_FEATURES for enforcement', () => {
    // Verify ProGate.tsx defines the enforcement truth
    // __dirname = app/[locale]/teacher/upgrade/__tests__
    // ProGate.tsx = components/teacher/ProGate.tsx
    // So we go up 5 directories to root, then into components
    const cwd = process.cwd();
    const gateSource = readFileSync(
      join(cwd, 'components/teacher/ProGate.tsx'),
      'utf-8'
    );

    // Should only enforce analytics + reports + pressureDials (not customLists, duels, noAds)
    expect(gateSource).toContain("PRO_FEATURES = ['analytics', 'reports', 'pressureDials']");
  });

  it('sells the calm-mode dials as a Pro outcome, not a paywall ornament', () => {
    // The dials are the pedagogic Pro feature (§8.8: the same game as a hyped
    // game-show or a calm mastery check). If the value prop disappears from the
    // Pro column, Pro is back to selling only headroom and reporting.
    const pageSource = readFileSync(
      join(__dirname, '../PageClient.tsx'),
      'utf-8'
    );
    const proMatch = pageSource.match(/const proFeatures = \[([\s\S]*?)\];/);
    expect(proMatch).not.toBeNull();
    expect(proMatch![0]).toContain('teacher.subscription.featureOutcome5');
  });
});
