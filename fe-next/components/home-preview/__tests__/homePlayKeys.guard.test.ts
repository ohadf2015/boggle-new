import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { pickLandingMessages } from '@/lib/i18n/pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '@/lib/i18n/landingNamespaces';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;
const DIR = join(__dirname, '..');
const SOURCES = readdirSync(DIR)
  .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(DIR, f), 'utf8') }));

function lookup(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const NAMESPACES = new Set(Object.keys(en));
const KEYS = [
  ...new Set([
    ...SOURCES.flatMap(({ text }) => [...text.matchAll(/'([a-zA-Z]+\.[\w.-]+)'/g)].map((m) => m[1])),
    ...['classic', 'blast', 'word-hunt', 'wheel-rush'].map((m) => `quickPlay.solo.mode.${m}`),
  ]),
].filter((k) => NAMESPACES.has(k.split('.')[0]) && !k.startsWith('mascot.'));

describe('home play copy', () => {
  it('has no hardcoded English copy module left', () => {
    expect(SOURCES.map((s) => s.file)).not.toContain('copy.ts');
    for (const { file, text } of SOURCES) expect(text, file).not.toMatch(/from '\.\/copy'/);
  });

  it('finds the keys it guards', () => {
    expect(KEYS).toContain('homePlay.heroLine');
  });

  it.each(Object.keys(LOCALES))('every t() key the home uses exists in %s', (locale) => {
    const missing = KEYS.filter((k) => typeof lookup(LOCALES[locale], k) !== 'string');
    expect(missing).toEqual([]);
  });

  it('every key resolves in the first-paint homepage catalogue (no raw keys before the full catalogue loads)', () => {
    const subset = pickLandingMessages(en as Record<string, unknown>, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);
    const missing = KEYS.filter((k) => typeof lookup(subset as Record<string, unknown>, k) !== 'string');
    expect(missing).toEqual([]);
  });
});
