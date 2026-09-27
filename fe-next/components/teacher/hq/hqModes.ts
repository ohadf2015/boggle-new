/**
 * The four game cards on Teacher HQ's "Start a game" hero.
 *
 * Only live classroom modes the server accepts (`CLASSROOM_GAME_MODES`); a
 * WordCraft card would need a classroom WordCraft mode, which does not exist
 * yet, so it is deliberately absent rather than a card that cannot launch.
 * Wheel Rush stays in the full setup screen — four cards fit a phone row.
 *
 * Art is the Academy node set (public/images/education), so HQ speaks the
 * same visual language as the student map.
 */
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';

export type HqModeAccent = 'cyan' | 'lime' | 'pink' | 'purple';

export interface HqMode {
  id: ClassroomGameMode;
  art: string;
  labelKey: string;
  labelFallback: string;
  blurbKey: string;
  blurbFallback: string;
  accent: HqModeAccent;
}

export const HQ_MODES: readonly HqMode[] = [
  {
    id: VOCAB_QUIZ_MODE,
    art: '/images/education/node-quiz.webp',
    labelKey: 'academy.hq.modes.vocabQuiz',
    labelFallback: 'Vocab Quiz',
    blurbKey: 'academy.hq.modes.vocabQuizBlurb',
    blurbFallback: 'Race to the right meaning',
    accent: 'cyan',
  },
  {
    id: 'classic',
    art: '/images/education/node-arena.webp',
    labelKey: 'academy.hq.modes.classic',
    labelFallback: 'Word Arena',
    blurbKey: 'academy.hq.modes.classicBlurb',
    blurbFallback: 'Find words on one shared board',
    accent: 'lime',
  },
  {
    id: 'blast',
    art: '/images/education/node-boss.webp',
    labelKey: 'academy.hq.modes.blast',
    labelFallback: 'Blast',
    blurbKey: 'academy.hq.modes.blastBlurb',
    blurbFallback: 'Fast rounds, huge combos',
    accent: 'pink',
  },
  {
    id: 'word-hunt',
    art: '/images/education/node-lesson.webp',
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

/** The idle card's art stage: a faint wash of the mode's colour. Literal strings — Tailwind only generates what it can read. */
export const HQ_ACCENT_STAGE: Record<HqModeAccent, string> = {
  cyan: 'bg-neo-cyan/15',
  lime: 'bg-neo-lime/15',
  pink: 'bg-neo-pink/15',
  purple: 'bg-neo-purple/20',
};
