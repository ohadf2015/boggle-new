/**
 * The four mode chips on Teacher HQ's "Start a game" hero.
 *
 * Only live classroom modes the server accepts (`CLASSROOM_GAME_MODES`); a
 * WordCraft chip would need a classroom WordCraft mode, which does not exist
 * yet, so it is deliberately absent rather than a chip that cannot launch.
 * Wheel Rush stays in the full setup screen — four chips fit one quiet row.
 *
 * Every mode pairs its accent colour with a DISTINCT icon: colour is never the
 * only signal carrying "which game is this" (the Kahoot colour+shape bar).
 */
import { Bomb, Grid3x3, ListChecks, Target, type LucideIcon } from 'lucide-react';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';

export type HqModeAccent = 'cyan' | 'lime' | 'pink' | 'purple';

export interface HqMode {
  id: ClassroomGameMode;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  blurbKey: string;
  blurbFallback: string;
  accent: HqModeAccent;
}

export const HQ_MODES: readonly HqMode[] = [
  {
    id: VOCAB_QUIZ_MODE,
    icon: ListChecks,
    labelKey: 'academy.hq.modes.vocabQuiz',
    labelFallback: 'Vocab Quiz',
    blurbKey: 'academy.hq.modes.vocabQuizBlurb',
    blurbFallback: 'Race to the right meaning',
    accent: 'cyan',
  },
  {
    id: 'classic',
    icon: Grid3x3,
    labelKey: 'academy.hq.modes.classic',
    labelFallback: 'Word Arena',
    blurbKey: 'academy.hq.modes.classicBlurb',
    blurbFallback: 'Find words on one shared board',
    accent: 'lime',
  },
  {
    id: 'blast',
    icon: Bomb,
    labelKey: 'academy.hq.modes.blast',
    labelFallback: 'Blast',
    blurbKey: 'academy.hq.modes.blastBlurb',
    blurbFallback: 'Fast rounds, huge combos',
    accent: 'pink',
  },
  {
    id: 'word-hunt',
    icon: Target,
    labelKey: 'academy.hq.modes.wordHunt',
    labelFallback: 'Word Hunt',
    blurbKey: 'academy.hq.modes.wordHuntBlurb',
    blurbFallback: 'Hunt down the list words',
    accent: 'purple',
  },
];

export const HQ_ACCENT_BG: Record<HqModeAccent, string> = {
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

/** The idle chip's icon colour — the accent as ink on navy, not a filled stage. Literal strings: Tailwind only generates what it can read. */
export const HQ_ACCENT_TEXT: Record<HqModeAccent, string> = {
  cyan: 'text-neo-cyan',
  lime: 'text-neo-lime',
  pink: 'text-neo-pink',
  purple: 'text-neo-purple',
};
