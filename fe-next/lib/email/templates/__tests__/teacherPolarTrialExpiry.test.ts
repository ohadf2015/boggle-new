import { describe, it, expect } from 'vitest';
import { teacherPolarTrialExpiry } from '../teacherPolarTrialExpiry';
import { polarTrialExpiryUpgradeUrl } from '@/lib/education/polarTrialExpiryJourney';

describe('teacherPolarTrialExpiry', () => {
  it('puts the t-0 Polar upgrade URL in the CTA', () => {
    const { subject, html } = teacherPolarTrialExpiry({
      full_name: 'Maya',
      locale: 'en',
      bucket: 't-0',
      trialExpiresAt: '2026-10-15T00:00:00.000Z',
    });
    expect(subject.toLowerCase()).toContain('today');
    expect(html).toContain(polarTrialExpiryUpgradeUrl('en', 't-0'));
    expect(html).toContain('Maya');
    expect(html).toContain('$9');
  });

  it('renders Hebrew RTL winback copy', () => {
    const { html } = teacherPolarTrialExpiry({
      full_name: 'מורה',
      locale: 'he',
      bucket: 't+3',
      trialExpiresAt: '2026-10-12T00:00:00.000Z',
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(polarTrialExpiryUpgradeUrl('he', 't+3'));
    expect(html).not.toContain('Keep Teacher Pro');
  });

  it('escapes a hostile display name', () => {
    const { html } = teacherPolarTrialExpiry({
      full_name: '<script>alert(1)</script>',
      locale: 'en',
      bucket: 't-0',
      trialExpiresAt: '2026-10-15T00:00:00.000Z',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
