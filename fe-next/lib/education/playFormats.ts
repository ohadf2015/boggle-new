/**
 * "One word list, N ways to play it" — assembled from the registries, not typed.
 *
 * The education landing pages needed to say how many formats a single lesson list
 * drives. Writing that as prose means a number that rots the first time a mode
 * ships (the live vocab quiz did exactly that: it went live while the copy still
 * described four classroom modes). So the list is derived:
 *
 *   CLASSROOM_GAME_MODES  (shared/types/vocabQuiz.ts)      — 5 live class modes
 *   BASE_PRACTICE_MODES   (lib/education/practicePicker.ts) — 7 solo drills
 *   VOCAB_FOCUSES         (lib/education/vocabFocus.ts)     — 6 skill drills
 *
 * Names and one-line descriptions come from the SHIPPED UI strings in
 * `translations/*.js`, so nothing here is a fresh translation of a product noun —
 * a teacher reading the marketing page sees the same words as on the button.
 *
 * Pure data assembly: no React, no I/O. Safe to call from a server component.
 */
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { CLASSROOM_GAME_MODES, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { BASE_PRACTICE_MODES, type BasePracticeMode } from './practicePicker';
import { VOCAB_FOCUSES, type VocabFocus } from './vocabFocus';

const CATALOGUES: Record<string, unknown> = { en, he, es, sv, ja, ru };

function lookup(locale: string, key: string): string {
  const from = (cat: unknown): string | undefined => {
    const value = key.split('.').reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      cat,
    );
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };
  return from(CATALOGUES[locale] ?? CATALOGUES.en) ?? from(CATALOGUES.en) ?? '';
}

/** Wire value -> the camelCase segment the translation keys use. */
const MODE_KEY: Record<string, string> = {
  classic: 'classic',
  'word-hunt': 'wordHunt',
  blast: 'blast',
  'wheel-rush': 'wheelRush',
  'vocab-quiz': 'vocabQuiz',
};

const PRACTICE_KEY: Record<BasePracticeMode, string> = {
  solo_board: 'soloBoard',
  warmup: 'warmup',
  blitz: 'blitz',
  matching: 'matching',
  spelling: 'spelling',
  flashcard: 'flashcards',
  word_list: 'wordList',
};

export type PlayFormat = {
  /** Stable id — the registry value, so a test can tie a row back to code. */
  id: string;
  /** Localized product name, as it appears on the button in the app. */
  name: string;
  /** One line: what it drills. Also from shipped UI copy. */
  note: string;
};

export type PlayFormats = {
  /** Modes a whole class plays together, live, on the teacher's screen. */
  live: PlayFormat[];
  /** Drills a student runs alone on the same list. */
  practice: PlayFormat[];
};

export function playFormats(locale: string): PlayFormats {
  const live = CLASSROOM_GAME_MODES.map((mode: ClassroomGameMode) => ({
    id: mode,
    name: lookup(locale, `teacher.classroom.gameModes.${MODE_KEY[mode] ?? mode}`),
    note: lookup(locale, `education.classroomModeBlurb.${MODE_KEY[mode] ?? mode}`),
  }));

  const practice: PlayFormat[] = [
    ...BASE_PRACTICE_MODES.map((mode) => ({
      id: mode,
      // Names are keyed camelCase (`soloBoard`); the picker's skill lines are keyed by
      // the raw registry value (`solo_board`). Two conventions, one registry — hence
      // the map above for one and the bare mode for the other.
      name: lookup(locale, `education.practice.${PRACTICE_KEY[mode]}`),
      note: lookup(locale, `education.practicePicker.skill.${mode}`),
    })),
    ...VOCAB_FOCUSES.map((focus: VocabFocus) => ({
      id: focus,
      name: lookup(locale, `education.vocabFocus.focus.${focus}`),
      note: lookup(locale, `education.vocabFocus.instructions.${focus}`),
    })),
  ];

  return { live, practice };
}

/** How many ways one word list can be played. Counted, never written down. */
export const PLAY_FORMAT_COUNT =
  CLASSROOM_GAME_MODES.length + BASE_PRACTICE_MODES.length + VOCAB_FOCUSES.length;

export const LIVE_MODE_COUNT = CLASSROOM_GAME_MODES.length;
export const PRACTICE_FORMAT_COUNT = BASE_PRACTICE_MODES.length + VOCAB_FOCUSES.length;
