import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { BOARDS, SOLVERS } from '../landingCopy';
import { boardMascotCol } from '../arts';
import type { OgLang } from '../brand';
import { OG_IMAGE_BY_LOCALE, defaultOgImageUrl } from '@/lib/seo/defaultOgImage';

const SCRIPT: Record<OgLang, RegExp> = {
  en: /^[A-Z]$/,
  es: /^[A-ZÑ]$/,
  sv: /^[A-ZÅÄÖ]$/,
  he: /^[א-ת]$/,
  ru: /^[А-ЯЁ]$/,
  ja: /^[぀-ゟ]$/,
};
const LANGS = Object.keys(SCRIPT) as OgLang[];

describe('landing card boards', () => {
  it.each(LANGS)('%s board uses its own letters and traces a real path clear of the mascot cell', (lang) => {
    const { rows, path } = BOARDS[lang];
    for (const l of rows.flat()) expect(l).toMatch(SCRIPT[lang]);
    expect(new Set(path.map((p) => p.join())).size).toBe(path.length);
    path.slice(1).forEach(([r, c], i) => {
      const [pr, pc] = path[i];
      expect(Math.max(Math.abs(r - pr), Math.abs(c - pc))).toBe(1);
    });
    expect(path.some(([r, c]) => r === 3 && c === boardMascotCol(lang))).toBe(false);
  });

  it.each(LANGS)('%s solver words are spelled from its rack', (lang) => {
    const { rack, words } = SOLVERS[lang];
    for (const l of rack) expect(l).toMatch(SCRIPT[lang]);
    for (const w of words) {
      const left = [...rack];
      for (const ch of w) {
        const i = left.indexOf(ch);
        expect(i, `${w} needs ${ch}`).toBeGreaterThanOrEqual(0);
        left.splice(i, 1);
      }
    }
  });
});

const ROUTES: [string, string[]][] = [
  ['daily-word-wheel', ['en', 'he']],
  ['play-boggle-online-free', ['en']],
  ['online-word-games-with-friends', ['en']],
  ['juego-de-palabras-multijugador', ['es']],
  ['swedish-multiplayer-word-game', ['sv']],
  ['tools/word-solver', ['en', 'he', 'ja', 'ru']],
];

describe('landing page share images', () => {
  it.each(ROUTES)('%s renders a 1200x630 PNG', async (route, locales) => {
    const mod = await import(`@/app/[locale]/${route}/opengraph-image`);
    for (const locale of locales) {
      const res = await mod.default({ params: Promise.resolve({ locale }) });
      expect(res.headers.get('content-type')).toContain('image/png');
      const png = Buffer.from(await res.arrayBuffer());
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    }
  }, 60_000);

  it.each(Object.entries(OG_IMAGE_BY_LOCALE))('default %s image is a 1200x630 file', async (lang, file) => {
    const meta = await sharp(readFileSync(join(process.cwd(), 'public', file))).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 630]);
    expect(defaultOgImageUrl(lang)).toMatch(new RegExp(`/${file}\\?v=\\d+$`));
  });
});
