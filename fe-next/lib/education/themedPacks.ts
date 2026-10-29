import type { LessonWord } from '@/types/education';
import type { Language } from '@/lib/supabase/education/types';
import { gradeLevelToBand, type GradeBand } from '@/lib/education/library';
import type { EduMascotPose } from '@/lib/education/mascotArt';
import type { CurriculumSeedFile, CurriculumSeedList } from '@/lib/education/curriculum/curriculumSeed';

export const SEASON_THEMES = ['school', 'autumn', 'winter', 'spring', 'summer'] as const;
export const SHARED_PACK_THEMES = [...SEASON_THEMES, 'spooky', 'class', 'k2read', 'math'] as const;
export const ESL_PACK_THEMES = ['esl-a1', 'esl-a2', 'esl-b1', 'esl-b2'] as const;
const EXTRA_PACK_THEMES = {
  en: ['phonics', ...ESL_PACK_THEMES],
  he: ['lashon'],
} as const satisfies Partial<Record<Language, readonly string[]>>;

export type SeasonTheme = (typeof SEASON_THEMES)[number];
export type PackTheme =
  | (typeof SHARED_PACK_THEMES)[number]
  | (typeof EXTRA_PACK_THEMES)[keyof typeof EXTRA_PACK_THEMES][number];

export type PackGroup = 'season' | 'fun' | 'early' | 'subject' | 'esl';

const GROUP_OF: Record<PackTheme, PackGroup> = {
  school: 'season',
  autumn: 'season',
  winter: 'season',
  spring: 'season',
  summer: 'season',
  spooky: 'fun',
  class: 'fun',
  k2read: 'early',
  phonics: 'early',
  math: 'subject',
  lashon: 'subject',
  'esl-a1': 'esl',
  'esl-a2': 'esl',
  'esl-b1': 'esl',
  'esl-b2': 'esl',
};

const MASCOT_OF: Partial<Record<PackTheme, EduMascotPose>> = {
  school: 'backToSchool',
  autumn: 'autumn',
  winter: 'winter',
  spring: 'spring',
  summer: 'endOfYear',
};

export interface ThemedPack {
  code: string;
  theme: PackTheme;
  group: PackGroup;
  name: string;
  description: string;
  language: Language;
  gradeBand: GradeBand;
  words: LessonWord[];
  mascot?: EduMascotPose;
}

/** The shape every "add this list to my lessons" handler already takes. */
export interface PackLessonInput {
  name: string;
  description: string;
  language: string;
  words: LessonWord[];
}

export function packThemesFor(language: Language): readonly PackTheme[] {
  const extra: readonly PackTheme[] = (EXTRA_PACK_THEMES as Partial<Record<Language, readonly PackTheme[]>>)[language] ?? [];
  return [...SHARED_PACK_THEMES, ...extra];
}

export function themedPackCode(language: Language, theme: PackTheme): string {
  return `LC-${language.toUpperCase()}-PK-${theme.toUpperCase()}`;
}

export function themeOfCode(code: string): PackTheme | null {
  const tail = /-PK-([A-Z0-9-]+)$/.exec(code)?.[1]?.toLowerCase();
  return tail && tail in GROUP_OF ? (tail as PackTheme) : null;
}

/** Northern-hemisphere school calendar: September opens the year, June/July close it. */
export function seasonThemeFor(date: Date): SeasonTheme {
  const month = date.getMonth() + 1;
  if (month === 8 || month === 9) return 'school';
  if (month === 10 || month === 11) return 'autumn';
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  return 'summer';
}

const DIFFICULTY = { support: 'easy', core: 'medium', challenge: 'hard' } as const;

export function toThemedPack(list: CurriculumSeedList): ThemedPack | null {
  const theme = themeOfCode(list.code);
  const gradeBand = gradeLevelToBand(list.grade);
  if (!theme || !gradeBand) return null;
  return {
    code: list.code,
    theme,
    group: GROUP_OF[theme],
    name: list.name,
    description: list.description,
    language: list.language,
    gradeBand,
    mascot: MASCOT_OF[theme],
    words: list.words.map((w) => ({ word: w.word, definition: w.definition, difficulty: DIFFICULTY[w.level] })),
  };
}

export function packLessonInput(pack: ThemedPack): PackLessonInput {
  return { name: pack.name, description: pack.description, language: pack.language, words: pack.words };
}

type SeedModule = { default: CurriculumSeedFile };

// Per-language chunks: a teacher only ever downloads the packs for the board language in front of them.
const LOADERS: Record<Language, () => Promise<SeedModule>> = {
  en: () => import('@/lib/education/curriculum/data/en-themes.json') as unknown as Promise<SeedModule>,
  he: () => import('@/lib/education/curriculum/data/he-themes.json') as unknown as Promise<SeedModule>,
  sv: () => import('@/lib/education/curriculum/data/sv-themes.json') as unknown as Promise<SeedModule>,
  ja: () => import('@/lib/education/curriculum/data/ja-themes.json') as unknown as Promise<SeedModule>,
  es: () => import('@/lib/education/curriculum/data/es-themes.json') as unknown as Promise<SeedModule>,
  ru: () => import('@/lib/education/curriculum/data/ru-themes.json') as unknown as Promise<SeedModule>,
};

export function isPackLanguage(language: string | undefined | null): language is Language {
  return !!language && language in LOADERS;
}

export async function loadThemedPacks(language: Language): Promise<ThemedPack[]> {
  const seed = (await LOADERS[language]()).default;
  return seed.lists.map(toThemedPack).filter((p): p is ThemedPack => p !== null);
}

export async function findThemedPack(code: string): Promise<ThemedPack | null> {
  const language = /^LC-([A-Z]{2})-PK-/.exec(code)?.[1]?.toLowerCase();
  if (!isPackLanguage(language)) return null;
  return (await loadThemedPacks(language)).find((p) => p.code === code) ?? null;
}
