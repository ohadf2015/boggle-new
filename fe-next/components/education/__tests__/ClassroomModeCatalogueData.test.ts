import { describe, it, expect } from 'vitest';
import { TEACHER_GAME_MODES } from '@/lib/education/gameModes';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { es } from '@/translations/es.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { ru } from '@/translations/ru.js';
import {
  CATALOGUE_CATEGORIES,
  BOSS_LIVE_KEYS,
  CATALOGUE_UI_KEYS,
  catalogueEntry,
  catalogueKeys,
  catalogueModes,
  modeStyleFor,
} from '../ClassroomModeCatalogueData';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, es, sv, ja, ru };

function lookup(bundle: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    bundle
  );
}

const placeholders = (s: string) => Array.from(s.matchAll(/\{\{\s*(\w+)\s*\}\}/g), (m) => m[1]).sort();

describe('classroom mode catalogue data', () => {
  it('has one entry for every mode a teacher can launch, and no orphans', () => {
    const launchable = TEACHER_GAME_MODES.map((m) => m.id).sort();
    const catalogued = catalogueModes()
      .map((m) => m.launch.gameMode)
      .filter((id, i, all) => all.indexOf(id) === i)
      .sort();
    expect(catalogued).toEqual(launchable);
  });

  it('gives every entry a category, two best-for chips and a three-step how-it-plays', () => {
    for (const mode of catalogueModes()) {
      expect(CATALOGUE_CATEGORIES).toContain(mode.category);
      expect(mode.bestFor).toHaveLength(2);
      expect(new Set(mode.bestFor).size).toBe(2);
      expect(catalogueKeys(mode).steps).toHaveLength(3);
    }
  });

  it('lists every category in catalogue order, each with at least one mode', () => {
    for (const category of CATALOGUE_CATEGORIES) {
      expect(catalogueModes().some((m) => m.category === category)).toBe(true);
    }
  });

  it('offers Boss Battle as a class-vs-boss run of the quiz engine', () => {
    const boss = catalogueEntry('boss-battle')!;
    expect(boss.launch).toEqual({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' });
    expect(boss.style).toBe('class');
    expect(boss.category).toBe('meaning');
    expect(catalogueKeys(boss).name).toBe('eg2Modes.boss.name');
    expect(catalogueKeys(boss).how).toBe('eg2Modes.boss.how');
  });

  it('shows Teams as the style only for a mode whose engine plays teams', () => {
    expect(modeStyleFor(catalogueEntry('classic')!, 'teams')).toBe('teams');
    expect(modeStyleFor(catalogueEntry('classic')!, 'ffa')).toBe('ffa');
    expect(modeStyleFor(catalogueEntry('vocab-quiz')!, 'teams')).toBe('ffa');
    expect(modeStyleFor(catalogueEntry('wordcraft')!, 'teams')).toBe('solo');
  });

  for (const [lang, bundle] of Object.entries(LOCALES)) {
    it(`${lang}: every catalogue key resolves to a translated string`, () => {
      const keys = [
        ...CATALOGUE_UI_KEYS,
        ...BOSS_LIVE_KEYS,
        ...catalogueModes().flatMap((m) => {
          const k = catalogueKeys(m);
          return [k.name, k.how, k.category, k.complexity, k.style, ...k.bestFor, ...k.steps];
        }),
      ];
      for (const key of keys) {
        const value = lookup(bundle, key);
        expect(typeof value, `${lang} ${key}`).toBe('string');
        expect((value as string).trim().length, `${lang} ${key}`).toBeGreaterThan(0);
        expect(placeholders(value as string), `${lang} ${key}`).toEqual(placeholders(lookup(en, key) as string));
        if (lang === 'he' || lang === 'ja' || lang === 'ru') {
          expect(value, `${lang} ${key} is still English`).not.toBe(lookup(en, key));
        }
      }
    });
  }
});
