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

  it('t+14 tells a teacher with classes that they are still there, with real numbers', () => {
    const { subject, html } = teacherPolarTrialExpiry({
      full_name: 'Maya',
      locale: 'en',
      bucket: 't+14',
      trialExpiresAt: '2026-10-01T00:00:00.000Z',
      stats: { classrooms: 3, gamesLast30d: 7 },
    });
    expect(subject).toBe('Your classes are still here');
    expect(html).toContain('Your 3 classes are still on LexiClash');
    expect(html).toContain('7 live games in the last 30 days');
    expect(html).toContain(polarTrialExpiryUpgradeUrl('en', 't+14'));
  });

  it('uses singular copy for one class and one game', () => {
    const { html } = teacherPolarTrialExpiry({
      full_name: 'Maya',
      locale: 'en',
      bucket: 't+30',
      trialExpiresAt: '2026-09-15T00:00:00.000Z',
      stats: { classrooms: 1, gamesLast30d: 1 },
    });
    expect(html).toContain('Your class is still on LexiClash');
    expect(html).toContain('1 live game in the last 30 days');
    expect(html).toContain(polarTrialExpiryUpgradeUrl('en', 't+30'));
  });

  it('omits the games line when no games were played', () => {
    const { html } = teacherPolarTrialExpiry({
      full_name: 'Maya',
      locale: 'en',
      bucket: 't+14',
      trialExpiresAt: '2026-10-01T00:00:00.000Z',
      stats: { classrooms: 2, gamesLast30d: 0 },
    });
    expect(html).toContain('Your 2 classes');
    expect(html).not.toContain('live game');
  });

  it.each([
    ['no classes', { classrooms: 0, gamesLast30d: 0 }],
    ['stats unavailable', null],
  ])('never claims classes exist when there are %s', (_label, stats) => {
    const { subject, html } = teacherPolarTrialExpiry({
      full_name: 'Maya',
      locale: 'en',
      bucket: 't+14',
      trialExpiresAt: '2026-10-01T00:00:00.000Z',
      stats,
    });
    expect(subject).not.toMatch(/classes/i);
    expect(html).not.toMatch(/classes are still|class is still/);
    expect(html).toContain('ended on');
  });

  it('renders Hebrew win-back with counts', () => {
    const { subject, html } = teacherPolarTrialExpiry({
      full_name: 'מורה',
      locale: 'he',
      bucket: 't+30',
      trialExpiresAt: '2026-09-15T00:00:00.000Z',
      stats: { classrooms: 2, gamesLast30d: 5 },
    });
    expect(html).toContain('dir="rtl"');
    expect(subject).toBe('הכיתות שלך עדיין מחכות');
    expect(html).toContain('2 הכיתות שלך');
    expect(html).toContain('5 משחקים חיים');
  });
});
