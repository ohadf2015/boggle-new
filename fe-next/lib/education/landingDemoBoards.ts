import { demoBoard, findWordOnBoard } from './eslCefrDemo';

export const LANDING_DEMO_LOCALES = ['en', 'he', 'es', 'sv', 'ru', 'ja'] as const;
export type LandingDemoLocale = (typeof LANDING_DEMO_LOCALES)[number];

export interface LandingDemoBoard {
  letters: string[];
  targets: string[];
  minLength: number;
}

const en = demoBoard('A1');

// Every target is checked against public/dicts/<locale>.dict.gz by the test; Hebrew is stored without final forms, like the dictionary.
const BOARDS: Record<LandingDemoLocale, LandingDemoBoard> = {
  en: { letters: en.letters, targets: en.targets, minLength: 3 },
  he: {
    letters: ['ש', 'ל', 'ו', 'מ', 'מ', 'ס', 'פ', 'ר', 'ש', 'ב', 'י', 'ת', 'כ', 'ל', 'ד', 'ג'],
    targets: ['שלומ', 'ספר', 'בית', 'כלב', 'ילד', 'שמש'],
    minLength: 3,
  },
  es: {
    letters: ['G', 'A', 'T', 'O', 'C', 'A', 'S', 'A', 'M', 'A', 'O', 'L', 'R', 'P', 'A', 'N'],
    targets: ['GATO', 'CASA', 'OSO', 'SOL', 'MAR', 'PAN'],
    minLength: 3,
  },
  sv: {
    letters: ['K', 'A', 'T', 'T', 'H', 'U', 'S', 'O', 'K', 'O', 'B', 'E', 'M', 'A', 'L', 'N'],
    targets: ['KATT', 'HUS', 'OST', 'BOK', 'SOL'],
    minLength: 3,
  },
  ru: {
    letters: ['К', 'О', 'Т', 'Ы', 'С', 'Н', 'Д', 'О', 'Л', 'Е', 'С', 'М', 'Ш', 'А', 'Р', 'И'],
    targets: ['КОТ', 'НОС', 'СОН', 'ДОМ', 'ЛЕС', 'МИР'],
    minLength: 3,
  },
  ja: {
    letters: ['ね', 'こ', 'い', 'ぬ', 'さ', 'か', 'な', 'は', 'そ', 'ら', 'や', 'ま', 'み', 'ず', 'き', 'た'],
    targets: ['さかな', 'ねこ', 'いぬ', 'はな', 'そら', 'やま', 'みず'],
    minLength: 2,
  },
};

function localeOf(language: string): LandingDemoLocale {
  const base = language.toLowerCase().split('-')[0];
  return (LANDING_DEMO_LOCALES as readonly string[]).includes(base) ? (base as LandingDemoLocale) : 'en';
}

export function landingDemoBoard(language: string): LandingDemoBoard {
  return BOARDS[localeOf(language)];
}

/** Tile path spelling the first target not found yet, or null when every target is found. */
export function landingHintPath(language: string, found: readonly string[]): number[] | null {
  const { letters, targets } = landingDemoBoard(language);
  const done = new Set(found.map((w) => w.toUpperCase()));
  for (const target of targets) {
    if (done.has(target)) continue;
    const path = findWordOnBoard(letters, target);
    if (path) return path;
  }
  return null;
}

const HEBREW_FINAL: Record<string, string> = { כ: 'ך', מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };

export function displayDemoWord(word: string, language: string): string {
  if (localeOf(language) !== 'he' || !word) return word;
  const last = word[word.length - 1];
  return word.slice(0, -1) + (HEBREW_FINAL[last] ?? last);
}
