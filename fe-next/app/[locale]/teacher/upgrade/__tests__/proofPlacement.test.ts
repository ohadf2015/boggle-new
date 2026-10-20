/**
 * The cross-teacher proof line must sit where the decision is made: in the page header, before
 * any plan card. In a real browser it rendered fine but landed below the whole plan card on a
 * phone and below the fold on desktop (checked by screenshot), so it was invisible to the person
 * about to tap "Start 14-day free trial". Placed inline with the eyebrow so the one-screen
 * layout (compactLayout.test.ts) gains no height.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../PageClient.tsx'), 'utf8');

describe('upgrade page social-proof placement', () => {
  it('renders the line exactly once', () => {
    expect(src.match(/<TeacherProofLine/g)).toHaveLength(1);
  });

  it('puts it in the header, before the plan cards and the tab panels', () => {
    const proof = src.indexOf('<TeacherProofLine');
    expect(proof).toBeGreaterThan(src.indexOf('upgrade-value-eyebrow'));
    expect(proof).toBeLessThan(src.indexOf('<UpgradePlanCards'));
    expect(proof).toBeLessThan(src.indexOf("tab === 'teacher' ? ("));
  });

  it('shares the eyebrow row, so it adds no height to the compact desktop layout', () => {
    const eyebrow = src.indexOf('upgrade-value-eyebrow');
    const headline = src.indexOf('upgradePricingTitle');
    expect(src.indexOf('<TeacherProofLine')).toBeLessThan(headline);
    expect(src.indexOf('<TeacherProofLine')).toBeGreaterThan(eyebrow);
  });
});
