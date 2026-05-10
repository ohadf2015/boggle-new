import { describe, it, expect } from 'vitest';
import { pickRivalReminderCopy, RIVAL_TEMPLATE_COUNT_PER_DIRECTION } from '../rivalReminderCopy';
import {
  RIVAL_REMINDER_TEMPLATES_BY_LOCALE,
} from '../rivalReminderTemplates';

describe('pickRivalReminderCopy', () => {
  it('returns title, body, deepLink, variant, mentions rival username', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1',
      date: '2026-05-10',
      hoursLeft: 4,
      locale: 'en',
      rivalUsername: 'Maya',
      direction: 'above',
      scoreGap: 250,
    });
    expect(c.title).toBeTruthy();
    expect(c.body).toBeTruthy();
    expect(c.body + ' ' + c.title).toContain('Maya');
    expect(c.deepLink).toContain('/daily');
    expect(c.deepLink).toContain('src=push');
    expect(c.deepLink).toContain('kind=rival');
    expect(c.deepLink).toContain('dir=above');
    expect(c.deepLink).toContain(`v=${c.variant}`);
  });

  it('is deterministic per user+date+direction', () => {
    const a = pickRivalReminderCopy({
      userId: 'u1', date: '2026-05-10', hoursLeft: 4, locale: 'en',
      rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
    });
    const b = pickRivalReminderCopy({
      userId: 'u1', date: '2026-05-10', hoursLeft: 4, locale: 'en',
      rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
    });
    expect(a.variant).toBe(b.variant);
    expect(a.title).toBe(b.title);
  });

  it('uses different templates for above vs below', () => {
    const above = pickRivalReminderCopy({
      userId: 'u1', date: '2026-05-10', hoursLeft: 4, locale: 'en',
      rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
    });
    const below = pickRivalReminderCopy({
      userId: 'u1', date: '2026-05-10', hoursLeft: 4, locale: 'en',
      rivalUsername: 'Maya', direction: 'below', scoreGap: 100,
    });
    expect(above.deepLink).toContain('dir=above');
    expect(below.deepLink).toContain('dir=below');
    // Different template tables
    expect(above.title === below.title && above.body === below.body).toBe(false);
  });

  it('falls back to en when locale unknown', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-05-10', hoursLeft: 4,
      locale: 'fr' as never,
      rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
    });
    expect(c.title).toBeTruthy();
  });

  it.each(['en', 'he', 'sv', 'ja', 'es'] as const)(
    'has full template set for %s locale (above + below)',
    (loc) => {
      const above = RIVAL_REMINDER_TEMPLATES_BY_LOCALE[loc].above;
      const below = RIVAL_REMINDER_TEMPLATES_BY_LOCALE[loc].below;
      expect(above.length).toBe(RIVAL_TEMPLATE_COUNT_PER_DIRECTION);
      expect(below.length).toBe(RIVAL_TEMPLATE_COUNT_PER_DIRECTION);
      for (const t of [...above, ...below]) {
        expect(t.title).toBeTruthy();
        expect(t.body).toBeTruthy();
      }
    }
  );

  it('replaces {rival} {gap} {hoursLeft} placeholders', () => {
    // Force a known variant by constructing many calls and checking at least one uses each placeholder
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-05-10', hoursLeft: 7, locale: 'en',
      rivalUsername: 'Zara', direction: 'above', scoreGap: 333,
    });
    expect(c.title).not.toContain('{rival}');
    expect(c.title).not.toContain('{gap}');
    expect(c.title).not.toContain('{hoursLeft}');
    expect(c.body).not.toContain('{rival}');
    expect(c.body).not.toContain('{gap}');
    expect(c.body).not.toContain('{hoursLeft}');
  });

  it('clamps hoursLeft to >=1 in deep link', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-05-10', hoursLeft: 0, locale: 'en',
      rivalUsername: 'Maya', direction: 'above', scoreGap: 50,
    });
    expect(c.deepLink).toContain('h=1');
  });
});
