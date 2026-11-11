import { describe, it, expect } from 'vitest';
import { playerReengagement, getReengagementSubject, SUBJECT_LINES } from '../playerReengagement';
import { getWelcomeEmailModes } from '@/lib/email/welcomeModes';

const BASE = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

type Args = Parameters<typeof playerReengagement>[0];
const base: Args = {
  recipientName: 'Ohad',
  firstLetter: 'S',
  language: 'en',
  unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=abc',
  playUrl: 'https://lexiclash.live/en/daily',
};
const html = (o: Partial<Args> = {}) => playerReengagement({ ...base, ...o }).html;
const tiles = (h: string) => (h.match(/data-tile/g) || []).length;

describe('playerReengagement layout', () => {
  it.each(LOCALES)('%s uses the neo layout with the miss-you art and a hard-shadow button', (language) => {
    const h = html({ language });
    expect(h).toContain('/email/art/miss-you.png');
    expect(h).toMatch(/border-(right|left)-width:6px/);
    expect(h).not.toMatch(/undefined|\[object|NaN/);
    expect(h).toMatch(/unsubscribe/i);
    expect(h).toContain(`href="https://www.lexiclash.live/${language}/privacy"`);
  });

  it('wires play + unsubscribe URLs into the markup', () => {
    const h = html();
    expect(h).toContain('href="https://lexiclash.live/en/daily"');
    expect(h).toContain('https://lexiclash.live/api/email/unsubscribe?token=abc');
    expect(h).toContain('Ohad');
  });

  it('renders Hebrew right-to-left and isolates a Latin name', () => {
    const h = html({ language: 'he', recipientName: 'Fish' });
    expect(h).toContain('dir="rtl"');
    expect(h).toContain('\u2068Fish\u2069');
  });

  it('falls back to English for an unknown language', () => {
    expect(html({ language: 'fr' })).toBe(html({ language: 'en' }));
  });

  it('escapes a hostile display name', () => {
    const h = html({ recipientName: '<img src=x>' });
    expect(h).not.toContain('<img src=x>');
  });
});

describe('playerReengagement puzzle row', () => {
  it('shows the first letter then one blank tile per remaining letter', () => {
    const h = html({ firstLetter: 'Q', wordLength: 5 });
    expect(h).toMatch(/>Q<\/div>/);
    expect(tiles(h)).toBe(5);
  });

  it('defaults to 4 tiles and clamps to 2..8', () => {
    expect(tiles(html())).toBe(4);
    expect(tiles(html({ wordLength: 99 }))).toBe(8);
    expect(tiles(html({ wordLength: 1 }))).toBe(2);
  });
});

describe('playerReengagement personalization hooks', () => {
  it('shows days away only from 7 days', () => {
    expect(html({ daysSinceLastPlay: 14 })).toMatch(/14 days/);
    expect(html({ daysSinceLastPlay: 3 })).not.toMatch(/3 days/);
  });

  it('shows the players-today count only from 50, grouped per locale', () => {
    expect(html({ playersToday: 1847 })).toContain('1,847');
    expect(html({ playersToday: 12 })).not.toMatch(/>12</);
    expect(html({ language: 'ja', playersToday: 1200 })).toContain('1,200');
  });

  it('shows hours to reset only when under 12', () => {
    expect(html({ hoursUntilReset: 6 })).toMatch(/>6h</);
    expect(html({ hoursUntilReset: 18 })).not.toMatch(/>18h</);
    expect(html({ hoursUntilReset: 0 })).not.toMatch(/>0h</);
  });

  it('localizes the hooks', () => {
    expect(html({ language: 'he', daysSinceLastPlay: 21 })).toMatch(/21 ימים/);
    expect(html({ language: 'sv', daysSinceLastPlay: 18 })).toMatch(/18 dagar/);
    expect(html({ language: 'ru', daysSinceLastPlay: 9 })).toMatch(/9 дней/);
  });
});

describe('playerReengagement mode chips', () => {
  it('omits the section when no modes are passed', () => {
    expect(html()).not.toContain('/en/multiplayer');
  });

  it('links every public mode, sitting above the daily CTA', () => {
    const modes = getWelcomeEmailModes('en', BASE);
    const h = html({ modes });
    for (const m of modes) expect(h).toContain(`href="${m.href}"`);
    expect(h).not.toContain('/modes/cubes/crossword.png');
    expect(h.lastIndexOf(modes[modes.length - 1].href)).toBeLessThan(h.indexOf('href="https://lexiclash.live/en/daily"'));
  });
});

describe('reengagement subjects', () => {
  it.each(LOCALES)('%s has 6 short variants using the letter or the name', (lang) => {
    const lines = SUBJECT_LINES[lang].map((fn) => fn('Z', 'Ohad'));
    expect(lines).toHaveLength(6);
    expect(lines.some((s) => s.includes('Z'))).toBe(true);
    expect(lines.some((s) => s.includes('Ohad'))).toBe(true);
    for (const s of lines) expect(s.length).toBeLessThanOrEqual(55);
  });

  it('falls back to English for an unknown language', () => {
    const en = SUBJECT_LINES.en.map((fn) => fn('S', 'Ohad'));
    expect(en).toContain(getReengagementSubject('fr', 'S', 'Ohad'));
  });

  it('returns the same subject the render returns', () => {
    expect(playerReengagement(base).subject).toBe(getReengagementSubject('en', 'S', 'Ohad'));
  });

  it('has no death or crisis metaphors and spells the mascot לקסי', () => {
    const banned: Record<string, string[]> = {
      en: ['life support', 'dying', 'last chance', "don't lose"],
      he: ['תלוי בחוט', 'בטיפול נמרץ', 'גוסס', 'וקסי'],
      sv: ['intensiven', 'akuten', 'döende'],
      ja: ['瀕死', '危篤'],
      es: ['terapia intensiva', 'cuelga de un hilo', 'agonizando'],
      ru: ['реанимац', 'последний шанс'],
    };
    for (const [lang, phrases] of Object.entries(banned)) {
      const text = html({ language: lang }) + SUBJECT_LINES[lang].map((fn) => fn('S', 'Ohad')).join(' ');
      for (const p of phrases) expect(text).not.toContain(p);
    }
  });
});
