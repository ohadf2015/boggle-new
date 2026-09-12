/**
 * The teacher-facing game-mode catalog — one poster per playable classroom mode.
 *
 * Blooket's picker is a wall of logos on a flat field. You tap a poster, read a
 * spec panel, then tap Host: three actions, and the poster itself never says
 * what the mode DOES or how long a round takes. This table is the data behind a
 * picker that puts both on the tile and launches on the first tap.
 *
 * It is pure data plus one predicate so the recommendation is testable without
 * a DOM — and so there is exactly ONE answer to "which mode fits these words".
 * The express launcher (`pickQuickLaunchMode`) is the other caller of that
 * question; `__tests__/gameModes.test.ts` pins the two together, because two
 * tables quietly disagreeing is recurring pitfall class 3.
 */

import {
  CLASSROOM_GAME_MODES,
  VOCAB_QUIZ_MODE,
  type ClassroomGameMode,
} from '@/shared/types/vocabQuiz';
import { MIN_WORDS_PER_FOCUS } from '@/lib/education/vocabFocus';

/**
 * Accent families a mode may wear. `neo-yellow` (celebration/gold) and
 * `neo-orange` (streak/fire) are deliberately absent — a game mode is neither.
 */
export type ModeAccent = 'cyan' | 'lime' | 'pink' | 'purple';

export interface TeacherGameMode {
  id: ClassroomGameMode;
  /** camelCase tail shared by the name and how-it-plays keys. */
  nameKeySuffix: string;
  /** `teacher.classroom.gameModes.<suffix>` — the mode's name, already shipped. */
  nameKey: string;
  /** `education.modePicker.how.<suffix>` — one line, what a student does. */
  howKey: string;
  /**
   * Transparent mascot poster, served from `public/mascot/teacher/`. The
   * `-nobg` suffix is the repo's convention for background-stripped mascot art
   * — and it is also the cache key: `/_next/image` answers a stable URL with a
   * one-year immutable header, so replacing the bytes under an existing name
   * leaves every warm browser rendering the old opaque square forever.
   */
  poster: string;
  accent: ModeAccent;
  /** Typical round length in minutes — the chip a teacher plans a period by. */
  minutes: number;
  /**
   * True when the mode asks about word MEANING rather than word shape. Only
   * these modes can be "recommended for this lesson" off a definition count.
   */
  needsDefinitions: boolean;
}

const MODE_KEY_SUFFIX: Record<string, string> = {
  classic: 'classic',
  'word-hunt': 'wordHunt',
  blast: 'blast',
  'wheel-rush': 'wheelRush',
  [VOCAB_QUIZ_MODE]: 'vocabQuiz',
};

interface ModeShape {
  poster: string;
  accent: ModeAccent;
  minutes: number;
  needsDefinitions: boolean;
}

const MODE_SHAPE: Record<string, ModeShape> = {
  classic: { poster: '/mascot/teacher/mode-classic-nobg.webp', accent: 'cyan', minutes: 3, needsDefinitions: false },
  'word-hunt': { poster: '/mascot/teacher/mode-word-hunt-nobg.webp', accent: 'lime', minutes: 4, needsDefinitions: false },
  blast: { poster: '/mascot/teacher/mode-blast-nobg.webp', accent: 'pink', minutes: 3, needsDefinitions: false },
  'wheel-rush': { poster: '/mascot/teacher/mode-wheel-rush-nobg.webp', accent: 'purple', minutes: 4, needsDefinitions: false },
  [VOCAB_QUIZ_MODE]: { poster: '/mascot/teacher/mode-vocab-quiz-nobg.webp', accent: 'cyan', minutes: 5, needsDefinitions: true },
};

/** A round with no catalog entry still needs a plannable number on screen. */
export const FALLBACK_MODE_MINUTES = 3;

/**
 * Built FROM `CLASSROOM_GAME_MODES` rather than retyped beside it: when a sixth
 * mode is offered, this array grows with it and the test that pins the two
 * together fails loudly instead of the picker silently missing a tile.
 */
export const TEACHER_GAME_MODES: readonly TeacherGameMode[] = CLASSROOM_GAME_MODES.map((id) => {
  const suffix = MODE_KEY_SUFFIX[id] ?? String(id);
  const shape = MODE_SHAPE[id] ?? {
    poster: `/mascot/teacher/mode-${id}-nobg.webp`,
    accent: 'cyan' as const,
    minutes: FALLBACK_MODE_MINUTES,
    needsDefinitions: false,
  };
  return {
    id,
    nameKeySuffix: suffix,
    nameKey: `teacher.classroom.gameModes.${suffix}`,
    howKey: `education.modePicker.how.${suffix}`,
    ...shape,
  };
});

/** The catalog entry for a mode, or `undefined` for one no teacher can pick. */
export function teacherGameMode(id: string | undefined | null): TeacherGameMode | undefined {
  return TEACHER_GAME_MODES.find((m) => m.id === id);
}

export function modeDurationMinutes(id: string | undefined | null): number {
  return teacherGameMode(id)?.minutes ?? FALLBACK_MODE_MINUTES;
}

export interface LessonWordLike {
  word?: string;
  definition?: string | null;
}

/** How many of the lesson's words carry a definition a quiz can ask about. */
export function definedWordCount(words: ReadonlyArray<LessonWordLike> | undefined | null): number {
  if (!words) return 0;
  return words.filter((w) => (w?.definition || '').trim().length > 0).length;
}

/**
 * The mode we put a "recommended for this lesson" ribbon on.
 *
 * A lesson whose words carry meanings is a lesson about meanings, and Classic
 * cannot drill those: measured live 2026-09-07, a 6×6 board carried 1 of 9
 * lesson words because a straight run caps at six letters. Below the threshold
 * there are not enough distractors to build a fair question, so the board mode
 * is the honest recommendation.
 */
export function recommendedModeForWords(
  words: ReadonlyArray<LessonWordLike> | undefined | null
): ClassroomGameMode {
  return definedWordCount(words) >= MIN_WORDS_PER_FOCUS ? VOCAB_QUIZ_MODE : 'classic';
}

/**
 * The mode the picker puts a "best fit" flag on, or `null` for no flag.
 *
 * Narrower than `recommendedModeForWords` on purpose. That function answers
 * "which mode would we pick for you" and must keep answering `classic` for a
 * bare list so GO LIVE and the lobby agree. This one answers "is there a mode
 * worth pointing at", and for a bare list the answer is no: the lobby already
 * preselects the quiz the moment a lesson is attached, so a flag on Classic
 * would argue with the preselection on the same screen.
 */
export function recommendedModeBadge(
  words: ReadonlyArray<LessonWordLike> | undefined | null
): ClassroomGameMode | null {
  return definedWordCount(words) >= MIN_WORDS_PER_FOCUS ? VOCAB_QUIZ_MODE : null;
}

/** The round-length settings a lobby can have configured, all optional. */
export interface ConfiguredRoundSettings {
  /** Board modes: the timer the teacher set, in minutes. */
  timerMinutes?: number;
  /** Quiz: how many questions the round asks. */
  vocabQuizQuestionCount?: number;
  /** Quiz: how long each question stays open, in seconds. */
  vocabQuizSeconds?: number;
}

/**
 * How long THIS room's round will take — the number the poster chip quotes.
 *
 * The catalog minute is a planning estimate for a mode nobody has configured.
 * The moment a lobby has settings, they are the answer, because the same fact
 * is also printed in the round settings below the poster and in the live
 * lobby's chip row: measured live 2026-09-11 the poster promised "5 MIN" while
 * the room it launched said "3 min", which is one fact with two sources
 * (recurring pitfall class 3) and reads as a stale line on the poster.
 *
 * The quiz is derived from its OWN two settings rather than the board timer,
 * which it does not use at all.
 */
export function configuredRoundMinutes(
  id: string | undefined | null,
  settings: ConfiguredRoundSettings
): number {
  if (id === VOCAB_QUIZ_MODE) {
    const count = settings.vocabQuizQuestionCount;
    const seconds = settings.vocabQuizSeconds;
    if (!count || !seconds) return modeDurationMinutes(id);
    return Math.max(1, Math.round((count * seconds) / 60));
  }
  if (settings.timerMinutes === undefined) return modeDurationMinutes(id);
  return Math.max(1, Math.round(settings.timerMinutes));
}
