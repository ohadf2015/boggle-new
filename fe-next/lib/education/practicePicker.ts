/**
 * "One word list, many games" — the pure model behind the student's practice
 * tile grid.
 *
 * One lesson drives every tile below. Each tile says what skill it drills, how
 * much material the lesson can supply for it, and whether it is playable yet.
 * Counts come straight from the question builder so a badge can never promise
 * questions the drill will not produce.
 */
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { Language } from '@/shared/types/game';
import type { PracticeType } from '@/hooks/usePracticeSession';
import { VOCAB_FOCUSES, focusQuestionCounts, READINESS_SEED, type VocabFocus } from './vocabFocus';
import { eligibleLessonWords, isLessonSeedReady } from '@/lib/wordTower/lessonSeed';

/** Seed used for every readiness/count scan, so the badge and the drill agree. */
export const PICKER_SEED = READINESS_SEED;

export type BasePracticeMode = Exclude<PracticeType, 'vocab_focus'>;

/**
 * The Word Tower tile's stable id.
 *
 * Word Tower is a VARIANT of `solo_board`, not a practice type of its own: the
 * `practice_type` CHECK constraint has no 'word_tower' value, and a letter-pool
 * word builder is the closest existing semantics to a solo board. The variant
 * lives on the tile so the picker can route to the right screen while the
 * session still records under a value the database accepts.
 */
export const WORD_TOWER_TILE_ID = 'word_tower';

/** Distinguishes tiles that share a `mode` but open different screens. */
export type PracticeVariant = 'word_tower';

/** Board and drill modes, in the order they appear in the grid. */
export const BASE_PRACTICE_MODES: readonly BasePracticeMode[] = [
  'solo_board',
  'warmup',
  'blitz',
  'matching',
  'spelling',
  'flashcard',
  'word_list',
];

/** Words a mode needs before it is worth opening. */
const BASE_MODE_MIN_WORDS: Record<BasePracticeMode, number> = {
  solo_board: 1,
  warmup: 1,
  blitz: 1,
  matching: 4, // pairs up words with their definitions
  spelling: 1,
  flashcard: 1,
  word_list: 1,
};

const BASE_MODE_TITLE_KEY: Record<BasePracticeMode, string> = {
  solo_board: 'education.practice.soloBoard',
  warmup: 'education.practice.warmup',
  blitz: 'education.practice.blitz',
  matching: 'education.practice.matching',
  spelling: 'education.practice.spelling',
  flashcard: 'education.practice.flashcards',
  word_list: 'education.practice.wordList',
};

export interface PracticeTile {
  /** Stable id: the mode, or `vocab_focus:<focus>` for a targeted skill. */
  id: string;
  mode: PracticeType;
  /** Set only on vocabulary-skill tiles. */
  focus?: VocabFocus;
  /** Set when the tile shares a `mode` with another tile but opens its own screen. */
  variant?: PracticeVariant;
  /** i18n key for the tile name. */
  titleKey: string;
  /** i18n key for the one-line skill this tile drills. */
  skillKey: string;
  ready: boolean;
  count: number;
  countKind: 'words' | 'questions';
  /** i18n key telling the student what the lesson is missing. Absent when ready. */
  lockedKey?: string;
  /** Sessions the student has already finished in this mode. */
  sessions: number;
}

/**
 * Per-mode session totals as `student_practice_progress` stores them. The
 * column names differ from the practice types, which is why the mapping is
 * spelled out rather than derived.
 */
export interface PracticeSessionCounts {
  flashcard_sessions: number;
  solo_board_sessions: number;
  warmup_sessions: number;
  word_list_views: number;
  matching_sessions: number;
  spelling_sessions: number;
  blitz_sessions: number;
}

const SESSION_COLUMN: Record<BasePracticeMode, keyof PracticeSessionCounts> = {
  solo_board: 'solo_board_sessions',
  warmup: 'warmup_sessions',
  blitz: 'blitz_sessions',
  matching: 'matching_sessions',
  spelling: 'spelling_sessions',
  flashcard: 'flashcard_sessions',
  word_list: 'word_list_views',
};

export interface PracticeTileOptions {
  /** Lesson language — decides whether the built-in distractor banks apply. */
  language?: string;
  seed?: number | string;
  /**
   * The student's finished-session totals, so a tile can show what they have
   * already played. Targeted vocabulary sessions are not counted per skill
   * today, so those tiles report 0.
   */
  sessions?: PracticeSessionCounts | null;
}

/**
 * Every practice type this lesson can drive, ready or not. Locked tiles stay in
 * the list on purpose: seeing "add synonyms to unlock" is how a student learns
 * the lesson has more in it, and how a teacher learns what to fill in.
 */
export function buildPracticeTiles(
  words: VocabularyWord[],
  options: PracticeTileOptions = {}
): PracticeTile[] {
  const wordCount = words.length;
  const baseTiles: PracticeTile[] = BASE_PRACTICE_MODES.map((mode) => {
    const ready = wordCount >= BASE_MODE_MIN_WORDS[mode];
    return {
      id: mode,
      mode,
      titleKey: BASE_MODE_TITLE_KEY[mode],
      skillKey: `education.practicePicker.skill.${mode}`,
      ready,
      count: wordCount,
      countKind: 'words' as const,
      sessions: options.sessions?.[SESSION_COLUMN[mode]] ?? 0,
      ...(ready ? {} : { lockedKey: `education.practicePicker.locked.${mode}` }),
    };
  });

  // Word Tower: the lesson list becomes the letters on the wheel. Readiness is
  // about the SHAPE of the words, not just how many — a word longer than the
  // ring can never be built, and a language with no letter bag has no wheel at
  // all. The count is what the wheel can actually seed so the badge cannot
  // promise words the drill will not deal.
  const language = (options.language || 'en') as Language;
  const lessonWords = words.map((entry) => entry.word);
  const towerReady = isLessonSeedReady(lessonWords, language);
  const towerTile: PracticeTile = {
    id: WORD_TOWER_TILE_ID,
    mode: 'solo_board',
    variant: 'word_tower',
    titleKey: `education.practicePicker.name.${WORD_TOWER_TILE_ID}`,
    skillKey: `education.practicePicker.skill.${WORD_TOWER_TILE_ID}`,
    ready: towerReady,
    count: eligibleLessonWords(lessonWords, language).length,
    countKind: 'words',
    // `solo_board_sessions` counts the plain board and this variant together,
    // so there is nothing honest to show per tile — same call the targeted
    // vocabulary tiles make below.
    sessions: 0,
    ...(towerReady ? {} : { lockedKey: `education.practicePicker.locked.${WORD_TOWER_TILE_ID}` }),
  };

  const counts = focusQuestionCounts(words, {
    language: options.language,
    seed: options.seed ?? PICKER_SEED,
  });

  const focusTiles: PracticeTile[] = VOCAB_FOCUSES.map((focus) => {
    const count = counts[focus];
    const ready = count > 0;
    return {
      id: `vocab_focus:${focus}`,
      mode: 'vocab_focus' as PracticeType,
      focus,
      titleKey: `education.vocabFocus.focus.${focus}`,
      skillKey: `education.practicePicker.skill.${focus}`,
      ready,
      count,
      countKind: 'questions' as const,
      // Targeted vocabulary sessions are not counted per skill in
      // student_practice_progress, so there is nothing honest to show yet.
      sessions: 0,
      ...(ready ? {} : { lockedKey: `education.vocabFocus.unlock.${focus}` }),
    };
  });

  return [...baseTiles, towerTile, ...focusTiles];
}

/** The playable tiles, in picker order. */
export function readyTiles(tiles: PracticeTile[]): PracticeTile[] {
  return tiles.filter((tile) => tile.ready);
}

/** How many of each kind are playable — the "8 games ready" line above the grid. */
export function practiceReadiness(tiles: PracticeTile[]): { ready: number; total: number } {
  return { ready: readyTiles(tiles).length, total: tiles.length };
}
