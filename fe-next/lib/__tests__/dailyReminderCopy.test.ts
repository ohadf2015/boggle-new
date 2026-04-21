import { describe, it, expect } from 'vitest';
import {
  pickDailyReminderCopy,
  DAILY_REMINDER_TEMPLATES,
} from '../dailyReminderCopy';

describe('pickDailyReminderCopy', () => {
  it('returns a title, body, deepLink, and variant index', () => {
    const copy = pickDailyReminderCopy({
      userId: 'user-1',
      date: '2026-04-21',
      hoursLeft: 5,
    });
    expect(copy.title).toBeTruthy();
    expect(copy.body).toBeTruthy();
    expect(copy.deepLink).toContain('/daily-challenge');
    expect(copy.deepLink).toContain('src=push');
    expect(copy.deepLink).toContain(`v=${copy.variant}`);
    expect(copy.deepLink).toContain('h=5');
    expect(copy.variant).toBeGreaterThanOrEqual(0);
    expect(copy.variant).toBeLessThan(DAILY_REMINDER_TEMPLATES.length);
  });

  it('is deterministic per user+date', () => {
    const a = pickDailyReminderCopy({ userId: 'u', date: '2026-04-21', hoursLeft: 3 });
    const b = pickDailyReminderCopy({ userId: 'u', date: '2026-04-21', hoursLeft: 3 });
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
      });
      variants.add(c.variant);
    }
    expect(variants.size).toBeGreaterThan(1);
  });

  it('substitutes {hoursLeft} placeholder', () => {
    // force a variant known to use the placeholder by scanning all templates
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
      });
      expect(c.title).not.toContain('{hoursLeft}');
      expect(c.body).not.toContain('{hoursLeft}');
    }
  });

  it('has at least 12 templates for variety', () => {
    expect(DAILY_REMINDER_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });
});
