import { describe, it, expect } from 'vitest';
import { pickRivalReminderCopy, composeRivalBody, RIVAL_TEMPLATE_COUNT_PER_DIRECTION } from '../rivalReminderCopy';
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

  describe('no recoverable name → localized generic rival noun', () => {
    it('en: empty username renders "a rival", never a leftover {rival} or bare gap', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: '', direction: 'above', scoreGap: 100,
      });
      const blob = `${c.title} ${c.body}`;
      expect(blob).toContain('a rival');
      expect(blob).not.toContain('{rival}');
      // no doubled spaces from an empty interpolation
      expect(c.body).not.toMatch(/ {2,}/);
      expect(c.title).not.toMatch(/ {2,}/);
    });

    it('he: empty username renders the generic noun "יריב" (bidi-wrapped)', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'he',
        rivalUsername: '', direction: 'above', scoreGap: 100,
      });
      expect(`${c.title} ${c.body}`).toContain('יריב');
    });

    it('still genericizes if a placeholder slipped through to the copy layer', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-05-10', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Player_00952ce3', direction: 'above', scoreGap: 100,
      });
      expect(`${c.title} ${c.body}`).not.toContain('Player_00952ce3');
      expect(`${c.title} ${c.body}`).toContain('a rival');
    });
  });

  describe('composeRivalBody (no double-time, clean sentence boundaries)', () => {
    it('drops the urgency suffix when the body already states the hours', () => {
      // This is the exact screenshot bug: "...8 שעות לעקוף." + "נשארו 8 שעות."
      const out = composeRivalBody({
        bodyBase: 'Maya pulled even. 8h to pull ahead.',
        othersClause: '',
        urgencySuffix: '8h left today.',
        bodyHasHours: true,
      });
      expect(out).toBe('Maya pulled even. 8h to pull ahead.');
    });

    it('appends the urgency suffix when the body does NOT mention hours', () => {
      const out = composeRivalBody({
        bodyBase: 'Maya matched your score.',
        othersClause: '',
        urgencySuffix: '8h left today.',
        bodyHasHours: false,
      });
      expect(out).toBe('Maya matched your score. 8h left today.');
    });

    it('places the multi-rival clause as its own sentence, never glued mid-run', () => {
      const out = composeRivalBody({
        bodyBase: 'Maya matched your score.',
        othersClause: '+3 more in range.',
        urgencySuffix: '8h left today.',
        bodyHasHours: false,
      });
      expect(out).toBe('Maya matched your score. +3 more in range. 8h left today.');
      // never the run-on the user reported ("…3 more 8h left…"): a clause
      // count is never directly followed by the next clause's hour figure.
      expect(out).not.toMatch(/\d+\s+\d+h/);
      expect(out).not.toMatch(/\S\.\S/); // a period is always followed by space/end
    });

    it('collapses to clean single spacing and trims', () => {
      const out = composeRivalBody({
        bodyBase: '  Maya played.  ',
        othersClause: '',
        urgencySuffix: '',
        bodyHasHours: true,
      });
      expect(out).toBe('Maya played.');
    });
  });
});

describe('hebrew copy naturalness — gender-neutral, singular address, no calques', () => {
  const he = RIVAL_REMINDER_TEMPLATES_BY_LOCALE.he;
  const allHeStrings = [...he.above, ...he.below, ...he.tied].flatMap((t) => [
    t.title,
    t.body,
  ]);
  const blob = allHeStrings.join('\n');

  // Verbs that conjugate by the RIVAL's gender. Templates fill {rival} with a
  // name of unknown gender, so a masculine-singular verb reads grammatically
  // wrong for a female rival ("Maya הקדים"). Rival references must use
  // gender-neutral noun/prepositional phrasing instead.
  it.each(['הקדים', 'מתקרב', 'השווה', 'שיחק'])(
    'contains no rival-gendered masculine verb "%s"',
    (verb) => {
      expect(blob).not.toContain(verb);
    }
  );

  // Reader address must stay singular — no plural imperatives mixed in.
  it('uses singular reader address (no plural imperative "תניחו")', () => {
    expect(blob).not.toContain('תניחו');
  });

  // Literal English→Hebrew calques that read machine-translated.
  it.each(['נגד-מהלך', 'חלון לתפיסה', 'רזרבת'])(
    'contains no machine-translated calque "%s"',
    (calque) => {
      expect(blob).not.toContain(calque);
    }
  );

  // Misspelling — correct Hebrew is שוויון, not שיוויון.
  it('spells "equality/tie" correctly as שוויון (not שיוויון)', () => {
    expect(blob).not.toContain('שיוויון');
  });

  // Guard the prior fixes don't regress: every {rival} slot still present and
  // placeholders never leak literally after a rewrite.
  it('keeps {rival} placeholder intact in the template source', () => {
    expect(blob).toContain('{rival}');
  });
});
