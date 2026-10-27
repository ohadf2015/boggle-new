import type { Language, LetterGrid } from '@/types';
import { getDemoConfig } from '@/components/onboarding/demoConfigs';
import { getLetterFeedback, type LetterFeedback } from '@/utils/wordHuntFeedback';
import type { HuntCell } from '../hunt/huntStage';

export interface HowtoDemo {
  grid: LetterGrid;
  path: HuntCell[];
  word: string;
  target: string;
  feedback: LetterFeedback[];
}

export const HOWTO_LOCALES = ['en', 'es', 'sv', 'he', 'ja', 'ru'] as const;

// Each target is picked so the demo word shows all three colours.
const TARGETS: Record<string, string> = {
  en: 'CRAB',
  ja: 'CRAB',
  es: 'SAPO',
  sv: 'SKOG',
  he: 'שלום',
};

const RU_DEMO = {
  letters: [
    ['К', 'О', 'Л'],
    ['Д', 'Т', 'А'],
    ['Е', 'Р', 'С'],
  ],
  path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
  word: 'КОТ',
  target: 'КЛОУН',
};

export function getHowtoDemo(language: string): HowtoDemo {
  const base = language === 'ru'
    ? RU_DEMO
    : { ...getDemoConfig(language), target: TARGETS[language] ?? TARGETS.en };
  const lang = (language === 'ru' || TARGETS[language] ? language : 'en') as Language;
  return {
    grid: base.letters as unknown as LetterGrid,
    path: base.path.map(({ row, col }) => ({ row, col })),
    word: base.word,
    target: base.target,
    feedback: getLetterFeedback(base.word, base.target, lang),
  };
}
