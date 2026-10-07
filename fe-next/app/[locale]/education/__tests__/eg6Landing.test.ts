/**
 * Guards for the rebuilt /education landing (p6).
 *
 * Source-scanned where the rule is structural (no per-locale literals in the page,
 * one primary CTA in the hero), resolved through the real bundles where the rule is
 * about copy (every eg6Land key exists in every shipped locale).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';
import { findWordOnBoard, isTargetWord, demoBoard } from '@/lib/education/eslCefrDemo';
import { nextHintPath } from '@/lib/education/landingDemo';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const BUNDLES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es, ru };

function leaf(dict: Record<string, unknown>, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

const LANDING_SOURCES = [
  'app/[locale]/education/page.tsx',
  'app/[locale]/education/PageClient.tsx',
  'components/education/EducationHero.tsx',
  'components/education/EducationLandingDemo.tsx',
  'components/education/ProFramingSection.tsx',
];

describe('education landing (p6)', () => {
  it('hub page carries no per-locale copy maps', () => {
    const src = read('app/[locale]/education/page.tsx');
    expect(src).not.toMatch(/Record<string,\s*\{/);
    expect(src).not.toMatch(/^\s*(en|he|sv|ja|es|ru):\s*\{/m);
    expect(src).not.toMatch(/\bCOMPARE_LINK_(TEXT|ANCHOR)\b/);
  });

  it('every eg6Land key used by the landing resolves in all six locales', () => {
    const keys = new Set<string>();
    for (const rel of LANDING_SOURCES) {
      for (const m of read(rel).matchAll(/['"`](eg6Land\.[A-Za-z0-9_.]+)['"`]/g)) keys.add(m[1]);
    }
    expect(keys.size).toBeGreaterThan(20);
    for (const key of keys) {
      for (const [locale, dict] of Object.entries(BUNDLES)) {
        expect(typeof leaf(dict, key), `${locale}:${key}`).toBe('string');
      }
    }
  });

  it('hero has one primary CTA, one secondary, and the playable board instead of the CSS mock', () => {
    const src = read('components/education/EducationHero.tsx');
    expect(src).not.toMatch(/EducationModeMock/);
    expect(src).toMatch(/EducationLandingDemo/);
    expect(src.match(/data-testid="education-hero-free-cta"/g)).toHaveLength(1);
    expect(src.match(/data-testid="education-hero-pro-cta"/g)).toHaveLength(1);
    expect(src).not.toMatch(/education-hero-join-cta/);
    expect(src).not.toMatch(/education-hero-secondary-cta/);
  });

  it('pro card names the live-room cap from the shared constant, not a claimed unlimited roster', () => {
    const src = read('components/education/ProFramingSection.tsx');
    expect(src).toMatch(/MAX_PLAYERS_PER_ROOM/);
    expect(src).toMatch(/eg6Land\.pro\.liveCap/);
    expect(src).not.toMatch(/eg6Land\.pro\.studentLimitPro/);
    expect(String(en.eg6Land.pro.liveCap)).toContain('{count}');
    expect(String(en.eg6Land.pro.liveCap)).not.toMatch(/unlimited/i);
  });
});

describe('landing demo hint path', () => {
  it('traces a real unfound target word on the board', () => {
    const level = 'A1' as const;
    const path = nextHintPath(level, []);
    expect(path).not.toBeNull();
    const { letters } = demoBoard(level);
    const word = path!.map((i) => letters[i]).join('');
    expect(word.length).toBeGreaterThanOrEqual(3);
    expect(isTargetWord(level, word)).toBe(true);
    expect(findWordOnBoard(letters, word)).not.toBeNull();
  });

  it('skips words already found and returns null when every target is found', () => {
    const level = 'A1' as const;
    const { letters, targets } = demoBoard(level);
    const first = nextHintPath(level, []);
    const firstWord = first!.map((i) => letters[i]).join('');
    const next = nextHintPath(level, [firstWord]);
    expect(next).not.toBeNull();
    expect(next!.map((i) => letters[i]).join('')).not.toBe(firstWord);
    expect(nextHintPath(level, targets)).toBeNull();
  });
});
