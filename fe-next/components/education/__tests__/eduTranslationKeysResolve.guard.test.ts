// A missing key renders raw (or as an English fallback) in five locales while en looks fine.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { TEACHER_GAME_MODES } from '@/lib/education/gameModes';
import { playFormats } from '@/lib/education/playFormats';
import {
  BOSS_LIVE_KEYS,
  CATALOGUE_UI_KEYS,
  catalogueKeys,
  catalogueModes,
} from '@/components/education/ClassroomModeCatalogueData';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DIRS = [
  'components/education',
  'components/teacher',
  'components/student',
  'components/vocabulary',
  'lib/education',
  'app/[locale]/teacher',
  'app/[locale]/student',
  'app/[locale]/join',
  'app/[locale]/education',
];
const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };
const CALL = /\btr?\(\s*(?:t,\s*)?(['"`])([a-zA-Z]\w*\.[\w.]+)\1/g;
const LITERAL = /(['"`])([a-zA-Z]\w*(?:\.[a-zA-Z]\w*){2,})\1/g;

const AHEAD_OF_CODE = [
  'academy.hq.endedCodeTries',
  'teacher.classroom.gameModes.wordTower',
  'education.modePicker.how.wordTower',
  'education.classroomModeBlurb.wordTower',
  'eg2Modes.steps.wordTower.1',
  'eg2Modes.steps.wordTower.2',
  'eg2Modes.steps.wordTower.3',
];

const KEEP_IN_ENGLISH =
  /LexiClash|Teacher Pro|Google Classroom|Google Workspace for Education|Education Plus|Google|Slack|Marketplace|WhatsApp|Word ?[Cc]raft|Blast|Blitz|CSV|TSV|ESL|SPED|CEFR|PDF|QR|email|Dolch|Fry|Kahoot|Gimkit|Blooket|Quizlet|Wordwall|Pro Exclusive|\b(?:Pro|XP|HP|MAX|VS|vs)\b/g;

const SAME_WORD_AS_ENGLISH: Record<string, Set<string>> = {
  es: new Set(['min', 'pts', 'Top', 'Tutorial', 'Solo', 'Supernova']),
  sv: new Set(['min', 'Silver', 'Boss', 'Live', 'Online', 'Offline', 'Guide', 'Timer', 'timer', 'Status', 'Power', 'ups', 'Solo', 'Supernova', 'Inferno']),
  he: new Set(),
  ja: new Set(['NEW']),
  ru: new Set(),
};

// Older copy still mixing in English jargon; the cap only ever goes down.
const LATIN_DEBT = /^(education\.vs[A-Z]|education\.classroomAddon\.|teacher\.reports\.googleClassroom\.|education\.results\.|teacher\.digest\.)/;
const LATIN_DEBT_CAP: Record<string, number> = { he: 134, ja: 130, ru: 131 };

const lookup = (tree: unknown, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree);

function sources(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names.flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sources(full);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
}

const files = DIRS.flatMap((d) => sources(path.join(ROOT, d))).map((file) => ({
  file: path.relative(ROOT, file),
  text: readFileSync(file, 'utf8'),
}));

const callKeys = files.flatMap(({ file, text }) => [...text.matchAll(CALL)].map((m) => ({ key: m[2], file })));

const enRoots = new Set(Object.keys(en as Record<string, unknown>));
const literalKeys = files.flatMap(({ file, text }) =>
  [...text.matchAll(LITERAL)]
    .map((m) => ({ key: m[2], file }))
    .filter(({ key }) => enRoots.has(key.split('.')[0]) && typeof lookup(en, key) !== 'object'),
);

const dynamicKeys = [
  ...TEACHER_GAME_MODES.flatMap((m) => [m.nameKey, m.howKey, `education.classroomModeBlurb.${m.nameKeySuffix}`]),
  ...catalogueModes().flatMap((m) => {
    const k = catalogueKeys(m);
    return [k.name, k.how, k.category, k.complexity, k.style, ...k.bestFor, ...k.steps];
  }),
  ...CATALOGUE_UI_KEYS,
  ...BOSS_LIVE_KEYS,
  ...AHEAD_OF_CODE,
].map((key) => ({ key, file: '(built from data)' }));

const allKeys = [...callKeys, ...literalKeys, ...dynamicKeys];

function missingIn(keys: { key: string; file: string }[]) {
  return [
    ...new Set(
      keys.flatMap(({ key, file }) =>
        Object.entries(LOCALES)
          .filter(([, tree]) => typeof lookup(tree, key) !== 'string')
          .map(([locale]) => `${locale}: ${key} (${file})`),
      ),
    ),
  ];
}

const latinWords = (value: string) => value.replace(/\{\{?\w+\}?\}/g, ' ').replace(KEEP_IN_ENGLISH, ' ').match(/[A-Za-z]{2,}/g) ?? [];

function leftoverEnglish(locale: string, key: string): boolean {
  const value = lookup(LOCALES[locale], key);
  if (typeof value !== 'string' || /\.cite|\.importFormat/.test(key)) return false;
  const words = latinWords(value).filter((w) => !SAME_WORD_AS_ENGLISH[locale].has(w));
  if (locale === 'he' || locale === 'ja' || locale === 'ru') return words.some((w) => w.length >= 3);
  return value === lookup(en, key) && words.length > 0;
}

const uniqueKeys = () => [...new Set(allKeys.map(({ key }) => key))];
const leftoversIn = (locale: string) => uniqueKeys().filter((key) => leftoverEnglish(locale, key));

describe('education translation keys resolve in every locale', () => {
  it('scans a plausible number of calls', () => {
    expect(callKeys.length).toBeGreaterThan(3000);
    expect(literalKeys.length).toBeGreaterThan(100);
  });

  it('finds no t() key missing from any locale', () => {
    expect(missingIn(callKeys)).toEqual([]);
  });

  it('finds no key-shaped string literal missing from any locale', () => {
    expect(missingIn(literalKeys)).toEqual([]);
  });

  it('resolves every key the mode catalogue builds from data', () => {
    expect(missingIn(dynamicKeys)).toEqual([]);
  });

  it('gives every live mode a name and blurb in each locale', () => {
    const blank = Object.keys(LOCALES).flatMap((locale) =>
      playFormats(locale).live.filter((f) => !f.name || !f.note).map((f) => `${locale}: ${f.id}`),
    );
    expect(blank).toEqual([]);
  });

  it('ships no English copy in a non-English locale', () => {
    const leftovers = ['he', 'es', 'sv', 'ja', 'ru'].flatMap((locale) =>
      leftoversIn(locale).filter((key) => !LATIN_DEBT.test(key)).map((key) => `${locale}: ${key}`),
    );
    expect(leftovers).toEqual([]);
  });

  it('never grows the English jargon left in older he/ja/ru copy', () => {
    const counts = Object.fromEntries(
      Object.keys(LATIN_DEBT_CAP).map((locale) => [locale, leftoversIn(locale).filter((key) => LATIN_DEBT.test(key)).length]),
    );
    expect(Object.entries(counts).filter(([locale, n]) => n > LATIN_DEBT_CAP[locale])).toEqual([]);
  });
});
