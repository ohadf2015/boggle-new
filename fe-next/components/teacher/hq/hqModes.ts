/**
 * The five mode tiles on Teacher HQ's host picker — only modes the server
 * accepts (`CLASSROOM_GAME_MODES`). Each pairs its accent with a distinct icon
 * so colour is never the only signal; poster and minutes come from the
 * teacher game catalog via `hqModeFacts`.
 */
import { Bomb, Grid3x3, Hammer, ListChecks, Target, type LucideIcon } from 'lucide-react';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { modeDurationMinutes, teacherGameMode } from '@/lib/education/gameModes';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

export type HqModeAccent = 'cyan' | 'lime' | 'pink' | 'purple';

export interface HqMode {
  id: ClassroomGameMode;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  blurbKey: string;
  blurbFallback: string;
  accent: HqModeAccent;
  /** `eduHq.modes.skill.<x>` — what the round trains, the facts card's third line. */
  skill: 'meaning' | 'spotting' | 'speed' | 'hunting' | 'building';
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
    skill: 'meaning',
  },
  {
    id: 'classic',
    icon: Grid3x3,
    labelKey: 'academy.hq.modes.classic',
    labelFallback: 'Word Arena',
    blurbKey: 'academy.hq.modes.classicBlurb',
    blurbFallback: 'Find words on one shared board',
    accent: 'lime',
    skill: 'spotting',
  },
  {
    id: 'blast',
    icon: Bomb,
    labelKey: 'academy.hq.modes.blast',
    labelFallback: 'Blast',
    blurbKey: 'academy.hq.modes.blastBlurb',
    blurbFallback: 'Fast rounds, huge combos',
    accent: 'pink',
    skill: 'speed',
  },
  {
    id: 'word-hunt',
    icon: Target,
    labelKey: 'academy.hq.modes.wordHunt',
    labelFallback: 'Word Hunt',
    blurbKey: 'academy.hq.modes.wordHuntBlurb',
    blurbFallback: 'Hunt down the list words',
    accent: 'purple',
    skill: 'hunting',
  },
  {
    id: 'wordcraft',
    icon: Hammer,
    labelKey: 'academy.hq.modes.wordcraft',
    labelFallback: 'Wordcraft',
    blurbKey: 'academy.hq.modes.wordcraftBlurb',
    blurbFallback: 'Craft list words, outscore the class',
    accent: 'cyan',
    skill: 'building',
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

export interface HqModeFacts {
  poster: string;
  minutes: number;
  maxPlayers: number;
  skillKey: string;
  pitchKey: string;
  /** `eduHq.modeTags.<x>` — the tile's one-line description on every width. */
  tagKey: string;
}

const PITCH_SUFFIX: Record<string, string> = {
  [VOCAB_QUIZ_MODE]: 'vocabQuiz',
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  wordcraft: 'wordcraft',
};

/** Poster and minutes are the catalog's (lib/education/gameModes) — one source, so HQ and the lobby can never quote two round lengths. */
export function hqModeFacts(id: ClassroomGameMode): HqModeFacts {
  const mode = HQ_MODES.find((m) => m.id === id);
  return {
    poster: teacherGameMode(id)?.poster ?? '/mascot/teacher/mode-classic-nobg.webp',
    minutes: modeDurationMinutes(id),
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    skillKey: `eduHq.modes.skill.${mode?.skill ?? 'spotting'}`,
    pitchKey: `eduHq.modes.pitch.${PITCH_SUFFIX[id] ?? 'classic'}`,
    tagKey: `eduHq.modeTags.${PITCH_SUFFIX[id] ?? 'classic'}`,
  };
}
