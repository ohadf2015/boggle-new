import { describe, it, expect } from 'vitest';
import { teacherWeeklyProgressDigest } from '../teacherWeeklyProgressDigest';
import { buildWeeklyTeacherDigest } from '@/lib/education/weeklyTeacherDigest';
import { en } from '../../../../translations/en.js';
import { he } from '../../../../translations/he.js';

const numbers = { played: 12, accuracyPct: 80, coveragePct: null as number | null };

describe('teacherWeeklyProgressDigest', () => {
  it('adds the expired-trial line and a paid upgrade CTA, not another free trial', () => {
    const digest = buildWeeklyTeacherDigest({ ...numbers, hasPro: false, polarTrialExpired: true });
    const { html, subject } = teacherWeeklyProgressDigest({ locale: 'en', teacherName: 'Ada', digest });
    expect(subject).toBe(en.teacher.digest.weeklySubject);
    expect(html).toContain('Ada');
    expect(html).toContain('12');
    expect(html).toContain('80%');
    expect(html).toContain(en.teacher.digest.polarTrialExpiredLine);
    expect(html).toContain(en.teacher.subscription.trialEndedCta);
    expect(html).toContain('https://www.lexiclash.live/en/teacher/upgrade');
    expect(html).not.toContain('trial=true');
    expect(html).not.toContain('trial: true');
  });

  it('Pro teachers get the numbers without the upsell', () => {
    const digest = buildWeeklyTeacherDigest({ ...numbers, hasPro: true, polarTrialExpired: false });
    const { html } = teacherWeeklyProgressDigest({ locale: 'en', teacherName: 'Ada', digest });
    expect(html).toContain('12');
    expect(html).not.toContain(en.teacher.digest.polarTrialExpiredLine);
    expect(html).not.toContain('/teacher/upgrade');
  });

  it('renders the Hebrew line right-to-left', () => {
    const digest = buildWeeklyTeacherDigest({ ...numbers, hasPro: false, polarTrialExpired: true });
    const { html } = teacherWeeklyProgressDigest({ locale: 'he', teacherName: 'דנה', digest });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(he.teacher.digest.polarTrialExpiredLine);
    expect(html).toContain('https://www.lexiclash.live/he/teacher/upgrade');
  });

  it('escapes the teacher name', () => {
    const digest = buildWeeklyTeacherDigest({ ...numbers, hasPro: true, polarTrialExpired: false });
    const { html } = teacherWeeklyProgressDigest({ locale: 'en', teacherName: '<b>A</b>', digest });
    expect(html).not.toContain('<b>A</b>');
    expect(html).toContain('&lt;b&gt;A&lt;/b&gt;');
  });
});
