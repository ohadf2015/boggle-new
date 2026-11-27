import { describe, it, expect } from 'vitest';
import { getCurrentTheme } from '../data/dateThemedWords';
import { holidayWindows } from '@/lib/holidays/calendar';

const LANGS = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const themeOf = (lang: string, date: Date) => getCurrentTheme(lang, date).nameKey;

const HE_FINALS = /[ךםןףץ]/;
const SCRIPT: Record<string, RegExp> = {
  en: /^[A-Z]+$/,
  es: /^[A-ZÑ]+$/,
  sv: /^[A-Z]+$/,
  ru: /^[А-ЯЬЫЭЮ]+$/,
  he: /^[א-ת]+$/,
  ja: /^[一-鿿]{2}$/,
};

describe('Hanukkah window uses the exact table for every language', () => {
  it.each(LANGS)('%s: 2026 runs Dec 4 to Dec 12 inclusive, any hour', (lang) => {
    expect(themeOf(lang, at(2026, 12, 3, 23))).not.toBe('theme.hanukkah');
    expect(themeOf(lang, at(2026, 12, 4, 0))).toBe('theme.hanukkah');
    if (lang !== 'sv') expect(themeOf(lang, at(2026, 12, 12, 23))).toBe('theme.hanukkah');
    expect(themeOf(lang, at(2026, 12, 13))).not.toBe('theme.hanukkah');
  });

  it('2027 runs Dec 24 to Jan 1 2028 for Hebrew, yielding to New Year on Dec 31 and Jan 1', () => {
    expect(themeOf('he', at(2027, 12, 23))).toBe('theme.christmas');
    expect(themeOf('he', at(2027, 12, 24))).toBe('theme.hanukkah');
    expect(themeOf('he', at(2027, 12, 30))).toBe('theme.hanukkah');
    expect(themeOf('he', at(2028, 1, 1))).toBe('theme.newYear');
  });

  it('2028 runs Dec 12 to Dec 20', () => {
    expect(themeOf('he', at(2028, 12, 11))).not.toBe('theme.hanukkah');
    expect(themeOf('he', at(2028, 12, 12))).toBe('theme.hanukkah');
    expect(themeOf('he', at(2028, 12, 20))).toBe('theme.hanukkah');
    expect(themeOf('he', at(2028, 12, 21))).toBe('theme.christmas');
  });

  it('when Hanukkah overlaps the Christmas window, Hebrew gets Hanukkah and everyone else Christmas', () => {
    expect(themeOf('he', at(2027, 12, 25))).toBe('theme.hanukkah');
    expect(themeOf('en', at(2027, 12, 25))).toBe('theme.christmas');
    expect(themeOf('ru', at(2028, 12, 15))).toBe('theme.christmas');
  });

  it('years outside the table still get a Hanukkah window', () => {
    const hits = Array.from({ length: 60 }, (_, i) => at(2029, 11, 15 + i)).filter(
      (d) => themeOf('he', d) === 'theme.hanukkah'
    );
    expect(hits.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Christmas window runs Dec 13 to Jan 1', () => {
  it.each(['en', 'es', 'ja', 'ru', 'he'])('%s: Dec 13 through Dec 30 is Christmas, Dec 12 is not', (lang) => {
    expect(themeOf(lang, at(2026, 12, 12))).not.toBe('theme.christmas');
    for (let d = 13; d <= 30; d++) expect(themeOf(lang, at(2026, 12, d, 23))).toBe('theme.christmas');
  });

  it('New Year keeps Dec 31 to Jan 2', () => {
    expect(themeOf('en', at(2026, 12, 31))).toBe('theme.newYear');
    expect(themeOf('en', at(2027, 1, 1))).toBe('theme.newYear');
  });

  it('Swedish Lucia keeps Dec 13, Christmas starts after it', () => {
    expect(themeOf('sv', at(2026, 12, 13))).toBe('theme.lucia');
    expect(themeOf('sv', at(2026, 12, 15))).toBe('theme.christmas');
  });
});

describe('holiday word lists match each board alphabet', () => {
  it.each(LANGS)('%s gets native Hanukkah and Christmas words', (lang) => {
    const hanukkah = getCurrentTheme(lang, at(2026, 12, 6)).words;
    const christmas = getCurrentTheme(lang, at(2026, 12, 20)).words;
    for (const words of [hanukkah, christmas]) {
      expect(words.length).toBeGreaterThanOrEqual(10);
      for (const w of words) {
        expect(w, `${lang}:${w}`).toMatch(SCRIPT[lang]);
        if (lang === 'he') expect(w).not.toMatch(HE_FINALS);
        if (lang === 'ru') expect(w).not.toMatch(/[ЁЪ]/);
      }
    }
  });
});

describe('parity with the event calendar', () => {
  it.each([2026, 2027, 2028])('%s: every Hanukkah night in lib/holidays/calendar is a Hanukkah board day for Hebrew', (year) => {
    const win = holidayWindows(year).find((w) => w.key === 'hanukkah')!;
    for (const day of win.trackDays) {
      const [y, m, d] = day.split('-').map(Number);
      const theme = themeOf('he', at(y, m, d));
      expect(['theme.hanukkah', 'theme.newYear'], day).toContain(theme);
    }
  });
});
