import { describe, it, expect } from 'vitest';
import {
  pickDailyReminderCopy,
  DAILY_REMINDER_TEMPLATES,
} from '../dailyReminderCopy';
import {
  DAILY_REMINDER_TEMPLATES_BY_LOCALE,
  DAILY_REMINDER_TEMPLATE_COUNT,
} from '../dailyReminderTemplates';

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
    // Spanish copy must NOT match the English variant for the same hash slot —
    // proves locale routing pulled from the ES table, not the EN fallback.
    const enCopy = pickDailyReminderCopy({
      userId: 'user-es',
      date: '2026-04-21',
      hoursLeft: 5,
      locale: 'en',
    });
    expect(copy.title).not.toBe(enCopy.title);
  });

  it('every Spanish template contains a Spanish-specific marker', () => {
    // Catches an EN copy-paste regression in the ES table — every ES variant
    // should have at least one accented char OR inverted punctuation.
    for (const t of DAILY_REMINDER_TEMPLATES_BY_LOCALE.es) {
      const combined = `${t.title} ${t.body}`;
      expect(combined).toMatch(/[áéíñóúüÁÉÍÑÓÚÜ¿¡]/);
    }
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
    const enCopy = pickDailyReminderCopy({
      userId: 'user-sv',
      date: '2026-04-21',
      hoursLeft: 5,
      locale: 'en',
    });
    expect(copy.title).not.toBe(enCopy.title);
  });

  it('every locale provides 15 templates so variant rotation matches', () => {
    // Variant index = hash %% N. If a locale has fewer templates than EN,
    // analytics buckets misalign across locales.
    expect(DAILY_REMINDER_TEMPLATES_BY_LOCALE.he.length).toBe(DAILY_REMINDER_TEMPLATE_COUNT);
    expect(DAILY_REMINDER_TEMPLATES_BY_LOCALE.sv.length).toBe(DAILY_REMINDER_TEMPLATE_COUNT);
    expect(DAILY_REMINDER_TEMPLATES_BY_LOCALE.ja.length).toBe(DAILY_REMINDER_TEMPLATE_COUNT);
    expect(DAILY_REMINDER_TEMPLATES_BY_LOCALE.es.length).toBe(DAILY_REMINDER_TEMPLATE_COUNT);
  });

  it('locale-specific templates render {hoursLeft} placeholders', () => {
    // Sample many users in each locale to exercise placeholder substitution
    // across templates that contain {hoursLeft}.
    for (const locale of ['he', 'sv', 'ja', 'es'] as const) {
      for (let i = 0; i < 30; i++) {
        const c = pickDailyReminderCopy({
          userId: `${locale}-${i}`,
          date: '2026-04-21',
          hoursLeft: 7,
          locale,
        });
        expect(c.title).not.toContain('{hoursLeft}');
        expect(c.body).not.toContain('{hoursLeft}');
      }
    }
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

  describe('gender-aware grammar', () => {
    const heTable = DAILY_REMINDER_TEMPLATES_BY_LOCALE.he;
    const heFemaleBodyIdx = heTable.findIndex((t) => t.bodyFemale);
    const heFemaleTitleIdx = heTable.findIndex((t) => t.titleFemale);

    function findUserForVariant(targetIdx: number, locale: 'he' | 'es'): string {
      for (let i = 0; i < 2000; i++) {
        const uid = `seed-${locale}-${i}`;
        const c = pickDailyReminderCopy({ userId: uid, date: '2026-05-17', hoursLeft: 5, locale });
        if (c.variant === targetIdx) return uid;
      }
      throw new Error('no userId found for variant ' + targetIdx);
    }

    it('he female avatar picks bodyFemale when template provides one', () => {
      const userId = findUserForVariant(heFemaleBodyIdx, 'he');
      const male = pickDailyReminderCopy({ userId, date: '2026-05-17', hoursLeft: 5, locale: 'he', gender: 'male' });
      const female = pickDailyReminderCopy({ userId, date: '2026-05-17', hoursLeft: 5, locale: 'he', gender: 'female' });
      expect(female.body).toBe((heTable[heFemaleBodyIdx].bodyFemale as string).replace(/\{hoursLeft\}/g, '5'));
      expect(female.body).not.toBe(male.body);
    });

    it('he female avatar picks titleFemale when template provides one', () => {
      const userId = findUserForVariant(heFemaleTitleIdx, 'he');
      const male = pickDailyReminderCopy({ userId, date: '2026-05-17', hoursLeft: 5, locale: 'he', gender: 'male' });
      const female = pickDailyReminderCopy({ userId, date: '2026-05-17', hoursLeft: 5, locale: 'he', gender: 'female' });
      expect(female.title).not.toBe(male.title);
    });

    it('missing gender falls through to neutral/masculine default', () => {
      const userId = findUserForVariant(heFemaleBodyIdx, 'he');
      const def = pickDailyReminderCopy({ userId, date: '2026-05-17', hoursLeft: 5, locale: 'he' });
      const male = pickDailyReminderCopy({ userId, date: '2026-05-17', hoursLeft: 5, locale: 'he', gender: 'male' });
      expect(def.body).toBe(male.body);
    });

    it('locales with no gendered overrides return identical copy for male/female', () => {
      for (const locale of ['en', 'sv', 'ja'] as const) {
        for (let i = 0; i < 20; i++) {
          const a = pickDailyReminderCopy({ userId: `u-${i}`, date: '2026-05-17', hoursLeft: 5, locale, gender: 'male' });
          const b = pickDailyReminderCopy({ userId: `u-${i}`, date: '2026-05-17', hoursLeft: 5, locale, gender: 'female' });
          expect(a.title).toBe(b.title);
          expect(a.body).toBe(b.body);
        }
      }
    });

    it('es template "campeón" -> "campeona" for female avatar', () => {
      const esTable = DAILY_REMINDER_TEMPLATES_BY_LOCALE.es;
      const idx = esTable.findIndex((t) => t.body.includes('campeón'));
      expect(idx).toBeGreaterThan(-1);
      const userId = findUserForVariant(idx, 'es');
      const female = pickDailyReminderCopy({ userId, date: '2026-05-17', hoursLeft: 5, locale: 'es', gender: 'female' });
      expect(female.body).toContain('campeona');
      expect(female.body).not.toContain('campeón');
    });
  });
});
