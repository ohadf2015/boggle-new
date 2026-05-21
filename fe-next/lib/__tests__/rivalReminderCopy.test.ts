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

  describe('urgency tier routing', () => {
    it('picks an urgent-tier variant (index 4 or 5) when hoursLeft ≤ 3', () => {
      // Try many user IDs to cover hash space — every one must land in urgent set.
      for (let i = 0; i < 20; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-05-10', hoursLeft: 2, locale: 'en',
          rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        });
        expect([4, 5]).toContain(c.variant);
      }
    });

    it('picks a midday-tier variant (index 2 or 3) when 3 < hoursLeft ≤ 12', () => {
      for (let i = 0; i < 20; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-05-10', hoursLeft: 8, locale: 'en',
          rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        });
        expect([2, 3]).toContain(c.variant);
      }
    });

    it('picks a morning-tier variant (index 0 or 1) when hoursLeft > 12', () => {
      for (let i = 0; i < 20; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-05-10', hoursLeft: 20, locale: 'en',
          rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        });
        expect([0, 1]).toContain(c.variant);
      }
    });

    it('encodes tier in the deep link as t=morning|midday|urgent', () => {
      const urgent = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 1, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
      });
      expect(urgent.deepLink).toContain('t=urgent');

      const midday = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
      });
      expect(midday.deepLink).toContain('t=midday');

      const morning = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 20, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
      });
      expect(morning.deepLink).toContain('t=morning');
    });
  });

  describe('multi-rival framing', () => {
    it('appends " and {N} more" tail when additionalCount > 0 (en)', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        additionalCount: 3,
      });
      expect(c.body.toLowerCase()).toContain('3 more');
    });

    it('omits the tail when additionalCount = 0', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        additionalCount: 0,
      });
      expect(c.body).not.toMatch(/\d+ more/);
    });

    it.each(['he', 'sv', 'ja', 'es'] as const)(
      'localized multi-rival tail renders for %s',
      (loc) => {
        const c = pickRivalReminderCopy({
          userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: loc,
          rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
          additionalCount: 2,
        });
        // Each locale should mention the count "2" in the suffix
        expect(c.body).toContain('2');
      }
    );

    it('encodes additionalCount in the deep link as n=N', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        additionalCount: 4,
      });
      expect(c.deepLink).toContain('n=4');
    });
  });

  describe('sharper placeholders (mode / rivalScore / rankDelta)', () => {
    it('exposes mode in deep link as m=puzzle|wordHunt|both', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        mode: 'wordHunt',
      });
      expect(c.deepLink).toContain('m=wordHunt');
    });

    it('exposes rivalScore in deep link as rs=N', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        rivalScore: 1234,
      });
      expect(c.deepLink).toContain('rs=1234');
    });

    it('exposes rankDelta in deep link as rd=N (preserves sign)', () => {
      const ahead = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        rankDelta: 7,
      });
      expect(ahead.deepLink).toContain('rd=7');

      const behind = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'below', scoreGap: 100,
        rankDelta: -3,
      });
      expect(behind.deepLink).toContain('rd=-3');
    });

    it('does not leave {mode}, {rivalScore}, {rankDelta}, or {others} unfilled in body', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 4, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        mode: 'puzzle', rivalScore: 999, rankDelta: 5, additionalCount: 2,
      });
      expect(c.body).not.toContain('{mode}');
      expect(c.body).not.toContain('{rivalScore}');
      expect(c.body).not.toContain('{rankDelta}');
      expect(c.body).not.toContain('{others}');
      expect(c.body).not.toContain('{hoursLeft}');
    });
  });

  describe('tied (scoreGap === 0)', () => {
    it.each(['en', 'he', 'sv', 'ja', 'es'] as const)(
      '%s: does NOT render "ahead/behind by 0" phrasing when gap is 0',
      (loc) => {
        const c = pickRivalReminderCopy({
          userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: loc,
          rivalUsername: 'Maya', direction: 'above', scoreGap: 0,
        });
        // No stray "0" near gap-mentioning words for any locale
        expect(c.body).not.toMatch(/(?:by|של|av|de|差)\s*0\b/i);
        expect(c.title).not.toMatch(/(?:by|של|av|de|差)\s*0\b/i);
        // Rival name still present
        expect(`${c.title} ${c.body}`).toContain('Maya');
      }
    );

    it('hebrew gap=0 specifically: no "פיגור של 0" or "{gap} נקודות" type phrases', () => {
      for (let i = 0; i < 12; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-05-10', hoursLeft: 8, locale: 'he',
          rivalUsername: 'Maya', direction: 'above', scoreGap: 0,
        });
        const blob = `${c.title} ${c.body}`;
        expect(blob).not.toContain('פיגור של 0');
        expect(blob).not.toMatch(/\b0\s*נקודות/);
        expect(blob).not.toMatch(/פער של 0/);
      }
    });

    it('encodes tied=1 in the deep link when scoreGap === 0', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 0,
      });
      expect(c.deepLink).toContain('tied=1');
    });

    it('omits tied=1 when scoreGap > 0', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 5,
      });
      expect(c.deepLink).not.toContain('tied=1');
    });
  });

  describe('message clarity — no redundant time, clean multi-rival tail', () => {
    it('he midday tied: does not repeat the "שעות" (hours) phrase', () => {
      // Production repro: template body "{hoursLeft} שעות לפרוץ" plus the
      // appended urgency suffix "נשארו {hoursLeft} שעות" rendered "8 שעות" twice.
      for (let i = 0; i < 12; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-05-10', hoursLeft: 8, locale: 'he',
          rivalUsername: 'Maya', direction: 'above', scoreGap: 0,
        });
        const occurrences = (c.body.match(/שעות/g) || []).length;
        expect(occurrences).toBeLessThanOrEqual(1);
      }
    });

    it('en midday tied: does not repeat the hours figure', () => {
      for (let i = 0; i < 12; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-05-10', hoursLeft: 8, locale: 'en',
          rivalUsername: 'Maya', direction: 'above', scoreGap: 0,
        });
        const occurrences = (c.body.match(/8h/g) || []).length;
        expect(occurrences).toBeLessThanOrEqual(1);
      }
    });

    it('en morning tied: does not say "resets at midnight" twice', () => {
      for (let i = 0; i < 12; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-05-10', hoursLeft: 20, locale: 'en',
          rivalUsername: 'Maya', direction: 'above', scoreGap: 0,
        });
        const occurrences = (c.body.toLowerCase().match(/resets at midnight/g) || []).length;
        expect(occurrences).toBeLessThanOrEqual(1);
      }
    });

    it('he tied: multi-rival tail does not glue into a trailing hours phrase', () => {
      // Production repro: "...ועוד 2 כאלה נשארו 8 שעות." — the count clause ran
      // straight into the (duplicate) hours suffix with no sentence boundary.
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'he',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 0,
        additionalCount: 2,
      });
      expect(c.body).not.toContain('כאלה נשארו');
      expect(c.body).toContain('2');
    });
  });

  describe('hebrew bidi isolation', () => {
    it('wraps a latin rival name with U+2068/U+2069 in Hebrew title or body', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'he',
        rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
      });
      const blob = `${c.title}\n${c.body}`;
      expect(blob).toContain('⁨Maya⁩');
    });

    it('does NOT wrap rival name with bidi controls in en/sv/ja/es', () => {
      for (const loc of ['en', 'sv', 'ja', 'es'] as const) {
        const c = pickRivalReminderCopy({
          userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: loc,
          rivalUsername: 'Maya', direction: 'above', scoreGap: 100,
        });
        const blob = `${c.title}\n${c.body}`;
        expect(blob).not.toContain('⁨');
        expect(blob).not.toContain('⁩');
        expect(blob).toContain('Maya');
      }
    });
  });
});
