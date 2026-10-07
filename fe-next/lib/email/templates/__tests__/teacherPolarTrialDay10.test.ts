import { describe, it, expect } from 'vitest';
import { teacherPolarTrialDay10 } from '../teacherPolarTrialDay10';
import { polarTrialUpgradeUrl } from '@/lib/education/polarTrialDay10';

describe('teacherPolarTrialDay10', () => {
  it('puts the Polar upgrade URL in the CTA and names the remaining days', () => {
    const { subject, html } = teacherPolarTrialDay10({
      full_name: 'Maya',
      locale: 'en',
      trialExpiresAt: '2026-10-15T00:00:00.000Z',
      daysLeft: 4,
    });
    expect(subject.toLowerCase()).toContain('4 days');
    expect(html).toContain(polarTrialUpgradeUrl('en'));
    expect(html).toContain('Maya');
    expect(html).toContain('$9');
  });

  it('renders Hebrew RTL with the Hebrew CTA', () => {
    const { subject, html } = teacherPolarTrialDay10({
      full_name: 'מורה',
      locale: 'he',
      trialExpiresAt: '2026-10-15T00:00:00.000Z',
      daysLeft: 4,
    });
    expect(subject).toMatch(/4/);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(polarTrialUpgradeUrl('he'));
    expect(html).not.toContain('Keep my classroom');
  });

  it('escapes a hostile display name', () => {
    const { html } = teacherPolarTrialDay10({
      full_name: '<script>alert(1)</script>',
      locale: 'en',
      trialExpiresAt: '2026-10-15T00:00:00.000Z',
      daysLeft: 3,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
