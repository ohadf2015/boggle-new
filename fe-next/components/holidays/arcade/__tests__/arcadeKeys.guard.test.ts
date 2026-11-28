import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ARCADE_GAMES } from '@/lib/holidays/arcade/games';

const LANGS = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
const DIR = path.join(__dirname, '..');

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(p);
    return /\.tsx?$/.test(e.name) ? [fs.readFileSync(p, 'utf8')] : [];
  });
}

const PLURALS = ['coins', 'family.timeLeft'];
const dynamic = [
  ...Object.keys(ARCADE_GAMES).flatMap((g) =>
    ['title', 'blurb', 'win', 'over', 'how', 'turnWin', 'turnOver', 'finale', 'finaleWin', 'level1', 'level2', 'level3', 'level4'].map((k) => `${g}.${k}`),
  ),
  ...['hanukkah', 'christmas'].flatMap((h) => [`${h}.title`, `${h}.subtitle`]),
  ...['nun', 'gimel', 'hei', 'shin', 'pe'].map((s) => `spin.side.${s}`),
  'newBest',
  'tieBest',
  'party.missing',
  ...['catch', 'splat', 'dash'].map((g) => `party.howTo.${g}`),
  'party.full',
];

const get = (tree: unknown, key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], tree);

describe('holiday arcade translations', () => {
  const src = sources(DIR).join('\n');
  const literal = [
    ...[...src.matchAll(/holiday\.arcade\.([a-zA-Z.]+[a-zA-Z])['"`]/g)].map((m) => m[1]),
    ...[...src.matchAll(/\bsay\('([a-zA-Z.]+[a-zA-Z])'/g)].map((m) => m[1]),
  ];
  const keys = [...new Set([...literal, ...dynamic])];

  it.each(LANGS)('Given %s, then every arcade key the UI uses has its own text', async (lang) => {
    const mod: Record<string, Record<string, unknown>> = await import(`@/translations/${lang}.js`);
    const arcade = (mod[lang].holiday as Record<string, unknown>).arcade;
    expect(literal.length).toBeGreaterThan(40);
    for (const k of keys) expect(typeof (get(arcade, k) ?? get(arcade, `${k}_other`)), `${lang} holiday.arcade.${k}`).toBe('string');
  });

  it.each(LANGS)('Given %s, then every arcade count has a singular form so 1 never reads as plural', async (lang) => {
    const mod: Record<string, Record<string, unknown>> = await import(`@/translations/${lang}.js`);
    const arcade = (mod[lang].holiday as Record<string, unknown>).arcade;
    for (const k of PLURALS) {
      expect(typeof get(arcade, `${k}_one`), `${lang} ${k}_one`).toBe('string');
      expect(typeof get(arcade, k), `${lang} ${k} must be split into plural forms`).toBe('undefined');
    }
  });
});
