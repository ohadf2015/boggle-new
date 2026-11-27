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

const SIDES = ['nun', 'gimel', 'hei', 'shin'];
const dynamic = [
  ...Object.keys(ARCADE_GAMES).flatMap((g) => ['title', 'blurb', 'win', 'over'].map((k) => `${g}.${k}`)),
  ...['hanukkah', 'christmas'].flatMap((h) => [`${h}.title`, `${h}.subtitle`]),
  ...['short', 'letters', 'dup', 'unknown', 'offline', 'all'].map((r) => `reject.${r}`),
  ...SIDES.flatMap((s) => [`dreidel.rule.${s}`, `dreidel.side.${s}`, `dreidel.result.${s}.win`, `dreidel.result.${s}.miss`]),
  'dreidel.you',
  'dreidel.bot',
];

const get = (tree: unknown, key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], tree);

describe('holiday arcade translations', () => {
  const literal = [...sources(DIR).join('\n').matchAll(/holiday\.arcade\.([a-zA-Z.]+[a-zA-Z])['"`]/g)].map((m) => m[1]);
  const keys = [...new Set([...literal, ...dynamic])];

  it.each(LANGS)('Given %s, then every arcade key the UI uses has its own text', async (lang) => {
    const mod: Record<string, Record<string, unknown>> = await import(`@/translations/${lang}.js`);
    const arcade = (mod[lang].holiday as Record<string, unknown>).arcade;
    expect(literal.length).toBeGreaterThan(40);
    for (const k of keys) expect(typeof get(arcade, k), `${lang} holiday.arcade.${k}`).toBe('string');
  });
});
