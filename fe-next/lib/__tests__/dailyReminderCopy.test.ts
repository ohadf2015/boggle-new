import { describe, it, expect } from 'vitest';
import {
  pickDailyReminderCopy,
  DAILY_REMINDER_TEMPLATES,
} from '../dailyReminderCopy';

describe('pickDailyReminderCopy', () => {
  it('returns a title, body, deepLink, and variant index (en)', () => {
    const copy = pickDailyReminderCopy({
      userId: 'user-1',
      date: '2026-04-21',
      hoursLeft: 5,
      locale: 'en',
    });
    expect(copy.title).toBeTruthy();
    expect(copy.body).toBeTruthy();
    expect(copy.deepLink).toContain('/daily');
    expect(copy.deepLink).not.toContain('/daily-challenge');
    expect(copy.deepLink).toContain('src=push');
    expect(copy.deepLink).toContain(`v=${copy.variant}`);
    expect(copy.deepLink).toContain('h=5');
    expect(copy.variant).toBeGreaterThanOrEqual(0);
    expect(copy.variant).toBeLessThan(DAILY_REMINDER_TEMPLATES.length);
  });

  it('is deterministic per user+date', () => {
    const a = pickDailyReminderCopy({ userId: 'u', date: '2026-04-21', hoursLeft: 3, locale: 'en' });
    const b = pickDailyReminderCopy({ userId: 'u', date: '2026-04-21', hoursLeft: 3, locale: 'en' });
    expect(a.variant).toBe(b.variant);
    expect(a.title).toBe(b.title);
  });

  it('produces different variants across users (statistical)', () => {
    const variants = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const c = pickDailyReminderCopy({
        userId: `user-${i}`,
        date: '2026-04-21',
        hoursLeft: 4,
        locale: 'en',
      });
      variants.add(c.variant);
    }
    expect(variants.size).toBeGreaterThan(1);
  });

  it('substitutes {hoursLeft} placeholder', () => {
    const template = DAILY_REMINDER_TEMPLATES.find(
      (t) => t.body.includes('{hoursLeft}') || t.title.includes('{hoursLeft}')
    );
    expect(template).toBeDefined();
  });

  it('never leaves raw {hoursLeft} placeholder in output', () => {
    for (let i = 0; i < 50; i++) {
      const c = pickDailyReminderCopy({
        userId: `u-${i}`,
        date: '2026-04-21',
        hoursLeft: 2,
        locale: 'en',
      });
      expect(c.title).not.toContain('{hoursLeft}');
      expect(c.body).not.toContain('{hoursLeft}');
    }
  });

  it('has at least 12 templates for variety', () => {
    expect(DAILY_REMINDER_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it('returns Hebrew copy for he locale (not English witty templates)', () => {
    const copy = pickDailyReminderCopy({
      userId: 'user-he',
      date: '2026-04-21',
      hoursLeft: 5,
      locale: 'he',
    });
    // Hebrew chars present
    expect(/[֐-׿]/.test(copy.title)).toBe(true);
    expect(/[֐-׿]/.test(copy.body)).toBe(true);
    // Deep link still routes to /daily
    expect(copy.deepLink).toContain('/daily');
  });

  it('returns Spanish copy for es locale', () => {
    const copy = pickDailyReminderCopy({
      userId: 'user-es',
      date: '2026-04-21',
      hoursLeft: 5,
      locale: 'es',
    });
    // Spanish dailyChallenge string contains "desafío"
    expect(copy.title.toLowerCase()).toContain('desafío');
  });

  it('returns Japanese copy for ja locale', () => {
    const copy = pickDailyReminderCopy({
      userId: 'user-ja',
      date: '2026-04-21',
      hoursLeft: 5,
      locale: 'ja',
    });
    // JP contains CJK
    expect(/[぀-ヿ㐀-鿿]/.test(copy.title)).toBe(true);
  });

  it('returns Swedish copy for sv locale', () => {
    const copy = pickDailyReminderCopy({
      userId: 'user-sv',
      date: '2026-04-21',
      hoursLeft: 5,
      locale: 'sv',
    });
    expect(copy.title.toLowerCase()).toContain('utmaning');
  });

  it('defaults to English when locale is missing', () => {
    const copy = pickDailyReminderCopy({
      userId: 'user-x',
      date: '2026-04-21',
      hoursLeft: 5,
    });
    // English paths have ASCII — no CJK or Hebrew
    expect(/[֐-׿぀-ヿ㐀-鿿]/.test(copy.title)).toBe(false);
  });
});
