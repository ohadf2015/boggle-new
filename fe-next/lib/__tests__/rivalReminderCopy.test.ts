import { describe, it, expect } from 'vitest';
import { pickRivalReminderCopy, composeRivalBody, RIVAL_TEMPLATE_COUNT } from '../rivalReminderCopy';
import { RIVAL_REMINDER_TEMPLATES_BY_LOCALE } from '../rivalReminderTemplates';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

describe('pickRivalReminderCopy — truthful event-based copy', () => {
  it('returns title, body, deepLink, variant and mentions the rival', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 4, locale: 'en',
      rivalUsername: 'Maya', mode: 'wordHunt',
    });
    expect(c.title).toBeTruthy();
    expect(c.body).toBeTruthy();
    expect(`${c.title} ${c.body}`).toContain('Maya');
    expect(c.deepLink).toContain('/daily');
    expect(c.deepLink).toContain('src=push');
    expect(c.deepLink).toContain('kind=rival');
    expect(c.deepLink).toContain(`v=${c.variant}`);
  });

  // THE bug: a leader was told "you're tied with X". The rival push must never
  // assert a tie or a points gap — those numbers have no valid data source.
  it.each(LOCALES)('%s: never claims a tie or a points gap', (loc) => {
    for (let i = 0; i < 12; i++) {
      const c = pickRivalReminderCopy({
        userId: `u${i}`, date: '2026-07-03', hoursLeft: [2, 8, 20][i % 3],
        locale: loc, rivalUsername: 'Maya', mode: 'wordHunt',
      });
      const blob = `${c.title} ${c.body}`;
      // English tie/gap vocabulary
      expect(blob.toLowerCase()).not.toMatch(/\btied\b|\bmatched your score\b|\bdead even\b|ahead by|behind by/);
      // Hebrew tie words
      expect(blob).not.toContain('תיקו');
      expect(blob).not.toContain('שוויון');
      // no unfilled placeholders ever
      expect(blob).not.toContain('{');
    }
  });

  it('states the event (rival + reset/turn framing), not a comparison', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 20, locale: 'en',
      rivalUsername: 'Maya', mode: 'wordHunt',
    });
    // never leaks {gap}/{rivalScore}/{rankDelta} — those inputs are gone
    expect(c.body).not.toContain('{');
    expect(c.deepLink).not.toContain('tied=1');
    expect(c.deepLink).not.toContain('dir=');
    expect(c.deepLink).not.toContain('rs=');
    expect(c.deepLink).not.toContain('rd=');
  });

  it('is deterministic per user+date+mode', () => {
    const a = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 4, locale: 'en',
      rivalUsername: 'Maya', mode: 'wordHunt',
    });
    const b = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 4, locale: 'en',
      rivalUsername: 'Maya', mode: 'wordHunt',
    });
    expect(a.variant).toBe(b.variant);
    expect(a.title).toBe(b.title);
  });

  it('falls back to en when locale unknown', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 4,
      locale: 'fr' as never, rivalUsername: 'Maya', mode: 'wordHunt',
    });
    expect(c.title).toBeTruthy();
    expect(`${c.title} ${c.body}`).not.toContain('{');
  });

  it.each(LOCALES)('has a full %s template array', (loc) => {
    const set = RIVAL_REMINDER_TEMPLATES_BY_LOCALE[loc];
    expect(set.length).toBe(RIVAL_TEMPLATE_COUNT);
    for (const t of set) {
      expect(t.title).toBeTruthy();
      expect(t.body).toBeTruthy();
    }
  });

  it.each(LOCALES)('%s: fills every placeholder', (loc) => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 7, locale: loc,
      rivalUsername: 'Zara', mode: 'both', additionalCount: 2,
    });
    expect(c.title).not.toContain('{');
    expect(c.body).not.toContain('{');
  });

  it('clamps hoursLeft to >=1 in deep link', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 0, locale: 'en',
      rivalUsername: 'Maya', mode: 'wordHunt',
    });
    expect(c.deepLink).toContain('h=1');
  });

  describe('urgency tier routing', () => {
    it('urgent-tier variant (4|5) when hoursLeft ≤ 3', () => {
      for (let i = 0; i < 20; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-07-03', hoursLeft: 2, locale: 'en',
          rivalUsername: 'Maya', mode: 'wordHunt',
        });
        expect([4, 5]).toContain(c.variant);
      }
    });
    it('midday-tier variant (2|3) when 3 < hoursLeft ≤ 12', () => {
      for (let i = 0; i < 20; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-07-03', hoursLeft: 8, locale: 'en',
          rivalUsername: 'Maya', mode: 'wordHunt',
        });
        expect([2, 3]).toContain(c.variant);
      }
    });
    it('morning-tier variant (0|1) when hoursLeft > 12', () => {
      for (let i = 0; i < 20; i++) {
        const c = pickRivalReminderCopy({
          userId: `u${i}`, date: '2026-07-03', hoursLeft: 20, locale: 'en',
          rivalUsername: 'Maya', mode: 'wordHunt',
        });
        expect([0, 1]).toContain(c.variant);
      }
    });
    it('encodes tier in deep link', () => {
      expect(pickRivalReminderCopy({ userId: 'u1', date: '2026-07-03', hoursLeft: 1, locale: 'en', rivalUsername: 'M', mode: 'both' }).deepLink).toContain('t=urgent');
      expect(pickRivalReminderCopy({ userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'en', rivalUsername: 'M', mode: 'both' }).deepLink).toContain('t=midday');
      expect(pickRivalReminderCopy({ userId: 'u1', date: '2026-07-03', hoursLeft: 20, locale: 'en', rivalUsername: 'M', mode: 'both' }).deepLink).toContain('t=morning');
    });
  });

  describe('multi-rival social proof', () => {
    it('appends "N more" clause when additionalCount > 0 (en)', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', mode: 'wordHunt', additionalCount: 3,
      });
      expect(c.body.toLowerCase()).toContain('3 more');
    });
    it('omits the clause when additionalCount = 0', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', mode: 'wordHunt', additionalCount: 0,
      });
      expect(c.body).not.toMatch(/\d+ more/);
    });
    it.each(['he', 'sv', 'ja', 'es', 'ru'] as const)('localized N-more clause for %s', (loc) => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: loc,
        rivalUsername: 'Maya', mode: 'wordHunt', additionalCount: 2,
      });
      expect(c.body).toContain('2');
    });
    it('encodes additionalCount in deep link as n=N', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Maya', mode: 'wordHunt', additionalCount: 4,
      });
      expect(c.deepLink).toContain('n=4');
    });
  });

  it('exposes mode in deep link', () => {
    const c = pickRivalReminderCopy({
      userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'en',
      rivalUsername: 'Maya', mode: 'wordHunt',
    });
    expect(c.deepLink).toContain('m=wordHunt');
  });

  describe('hebrew bidi isolation', () => {
    it('wraps a latin rival name with U+2068/U+2069 in Hebrew', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'he',
        rivalUsername: 'Maya', mode: 'wordHunt',
      });
      expect(`${c.title}\n${c.body}`).toContain('⁨Maya⁩');
    });
    it('does NOT wrap in en/sv/ja/es/ru', () => {
      for (const loc of ['en', 'sv', 'ja', 'es', 'ru'] as const) {
        const c = pickRivalReminderCopy({
          userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: loc,
          rivalUsername: 'Maya', mode: 'wordHunt',
        });
        const blob = `${c.title}\n${c.body}`;
        expect(blob).not.toContain('⁨');
        expect(blob).toContain('Maya');
      }
    });
  });

  describe('no recoverable name → localized generic rival noun', () => {
    it('en: empty username renders "a rival", no leftover placeholder/double-space', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'en',
        rivalUsername: '', mode: 'wordHunt',
      });
      const blob = `${c.title} ${c.body}`;
      expect(blob).toContain('a rival');
      expect(blob).not.toContain('{');
      expect(c.body).not.toMatch(/ {2,}/);
      expect(c.title).not.toMatch(/ {2,}/);
    });
    it('genericizes a placeholder that slipped through', () => {
      const c = pickRivalReminderCopy({
        userId: 'u1', date: '2026-07-03', hoursLeft: 8, locale: 'en',
        rivalUsername: 'Player_00952ce3', mode: 'wordHunt',
      });
      const blob = `${c.title} ${c.body}`;
      expect(blob).not.toContain('Player_00952ce3');
      expect(blob).toContain('a rival');
    });
  });

  describe('composeRivalBody (no double-time, clean boundaries)', () => {
    it('drops urgency suffix when body already states hours', () => {
      const out = composeRivalBody({
        bodyBase: "Maya cleared today's Word Hunt. 8h left.",
        othersClause: '', urgencySuffix: '8h left today.', bodyHasHours: true,
      });
      expect(out).toBe("Maya cleared today's Word Hunt. 8h left.");
    });
    it('appends urgency suffix when body has no hours', () => {
      const out = composeRivalBody({
        bodyBase: "Maya cleared today's Word Hunt.",
        othersClause: '', urgencySuffix: 'Resets at midnight.', bodyHasHours: false,
      });
      expect(out).toBe("Maya cleared today's Word Hunt. Resets at midnight.");
    });
    it('places the N-more clause as its own sentence', () => {
      const out = composeRivalBody({
        bodyBase: "Maya cleared today's Word Hunt.",
        othersClause: '+3 more cleared today.', urgencySuffix: 'Resets at midnight.', bodyHasHours: false,
      });
      expect(out).toBe("Maya cleared today's Word Hunt. +3 more cleared today. Resets at midnight.");
      expect(out).not.toMatch(/\S\.\S/);
    });
    it('collapses spacing and trims', () => {
      expect(composeRivalBody({ bodyBase: '  Maya played.  ', othersClause: '', urgencySuffix: '', bodyHasHours: true })).toBe('Maya played.');
    });
  });
});

describe('rival template naturalness (all locales, event-framed)', () => {
  it.each(LOCALES)('%s: every template keeps {rival} and uses no gap/direction tokens', (loc) => {
    const blob = RIVAL_REMINDER_TEMPLATES_BY_LOCALE[loc].map((t) => `${t.title}\n${t.body}`).join('\n');
    expect(blob).toContain('{rival}');
    expect(blob).not.toContain('{gap}');
    expect(blob).not.toContain('{rivalScore}');
    expect(blob).not.toContain('{rankDelta}');
  });

  it('hebrew: no rival-gendered masculine verbs, correct spelling', () => {
    const blob = RIVAL_REMINDER_TEMPLATES_BY_LOCALE.he.map((t) => `${t.title}\n${t.body}`).join('\n');
    for (const verb of ['הקדים', 'שיחק', 'סגר', 'פתר']) expect(blob).not.toContain(verb);
    expect(blob).not.toContain('שיוויון');
  });

  it('russian: no rival-gendered masculine past-tense verbs', () => {
    const blob = RIVAL_REMINDER_TEMPLATES_BY_LOCALE.ru.map((t) => `${t.title}\n${t.body}`).join('\n');
    for (const verb of ['прошёл', 'сыграл', 'решил', 'обошёл', 'закрыл']) expect(blob).not.toContain(verb);
  });
});
