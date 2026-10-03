import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CurriculumSubject, GradeLevel, Language, VocabularyLevel } from '@/lib/supabase/education/types';

export const CURRICULUM_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
export type CurriculumLocale = (typeof CURRICULUM_LOCALES)[number];
/** Extra seed files that add lists to a locale through their own migration. */
export const CURRICULUM_SUPPLEMENTS = ['en-grade3'] as const;
export type CurriculumSeedName = CurriculumLocale | (typeof CURRICULUM_SUPPLEMENTS)[number];
export const CURRICULUM_SEEDS: readonly CurriculumSeedName[] = [...CURRICULUM_LOCALES, ...CURRICULUM_SUPPLEMENTS];

export interface CurriculumSeedWord {
  word: string;
  definition: string;
  example: string;
  level: VocabularyLevel;
}

export interface CurriculumSeedList {
  code: string;
  /** Older curriculum_standard codes this list supersedes; those rows are deactivated. */
  replaces?: string[];
  name: string;
  description: string;
  /** Language of the words, i.e. the board they are played on. */
  language: Language;
  grade: GradeLevel;
  subject: CurriculumSubject;
  words: CurriculumSeedWord[];
}

export interface CurriculumSeedFile {
  language: CurriculumLocale;
  /** Data file name when it differs from the language, e.g. a supplement. */
  source?: string;
  migration: string;
  lists: CurriculumSeedList[];
}

const FE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA_DIR = path.join(FE_ROOT, 'lib/education/curriculum/data');
const MIGRATIONS_DIR = path.join(FE_ROOT, 'supabase/migrations');

const NAMESPACE = 'b7f3c0de-1e55-4c1a-9a5e-c0441c0de5ed';

export function curriculumListId(code: string): string {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(Buffer.concat([ns, Buffer.from(code, 'utf8')])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function loadCurriculumSeed(name: CurriculumSeedName): CurriculumSeedFile {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8')) as CurriculumSeedFile;
}

export function migrationPath(seed: CurriculumSeedFile): string {
  return path.join(MIGRATIONS_DIR, seed.migration);
}

const text = (s: string) => {
  if (s.includes('$t$')) throw new Error(`text contains the $t$ delimiter: ${s}`);
  return `$t$${s}$t$`;
};
const literal = (s: string) => `'${s.replace(/'/g, "''")}'`;

function wordsJson(words: CurriculumSeedWord[]): string {
  const lines = words.map((w) =>
    JSON.stringify({ word: w.word, definition: w.definition, example: w.example, level: w.level, canIntegrate: true }),
  );
  const body = `[\n      ${lines.join(',\n      ')}\n    ]`;
  if (body.includes('$j$')) throw new Error('words contain the $j$ delimiter');
  return `$j$${body}$j$::jsonb`;
}

function listRow(list: CurriculumSeedList): string {
  return [
    '  (',
    `    ${literal(curriculumListId(list.code))}, ${text(list.name)},`,
    `    ${text(list.description)},`,
    `    ${literal(list.language)}, ${literal(list.grade)}, ${literal(list.subject)}, ${literal(list.code)},`,
    `    ${wordsJson(list.words)},`,
    '    TRUE',
    '  )',
  ].join('\n');
}

export function buildCurriculumMigration(seed: CurriculumSeedFile): string {
  const replaced = seed.lists.flatMap((l) => l.replaces ?? []);
  const out = [
    `-- Curriculum word lists v2 (${seed.language}): kid-level definitions, one example sentence and a`,
    '-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/' + `${seed.source ?? seed.language}.json`,
    '-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.',
    '-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.',
    '-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.',
    '-- The count column is GENERATED, so the INSERT leaves it out.',
    '',
  ];
  if (replaced.length > 0) {
    out.push(`UPDATE curriculum_word_lists SET is_active = FALSE WHERE curriculum_standard IN (${replaced.map(literal).join(', ')});`, '');
  }
  out.push(
    'INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)',
    'VALUES',
    seed.lists.map(listRow).join(',\n'),
    'ON CONFLICT (id) DO UPDATE SET',
    '  name = EXCLUDED.name,',
    '  description = EXCLUDED.description,',
    '  language = EXCLUDED.language,',
    '  grade_level = EXCLUDED.grade_level,',
    '  subject = EXCLUDED.subject,',
    '  curriculum_standard = EXCLUDED.curriculum_standard,',
    '  words = EXCLUDED.words,',
    '  is_active = TRUE;',
    '',
  );
  return out.join('\n');
}
