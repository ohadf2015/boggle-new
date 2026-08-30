/**
 * Maps a teacher's classroom settings onto the host pre-game controls.
 *
 * The classroom wizard and the host controls speak different vocabularies —
 * board SIZE vs board DIFFICULTY, minutes vs seconds — so without a translation
 * step the teacher's answers get overwritten by the default 'fast' preset the
 * instant the host view mounts.
 */

import type { DifficultyLevel } from '@/shared/constants/gameConstants';

export interface ClassroomTemplateSettings {
  timerSeconds: number;
  difficulty: string;
  minWordLength?: number;
  allowLateJoin?: boolean;
}

export interface ClassroomHostPreset {
  timerMinutes: number;
  difficulty: DifficultyLevel;
  minWordLength: number;
}

const BOARD_SIZE_TO_DIFFICULTY: Record<string, DifficultyLevel> = {
  small: 'EASY',
  medium: 'MEDIUM',
  large: 'HARD',
};

const DEFAULT_TIMER_MINUTES = 3;
const DEFAULT_MIN_WORD_LENGTH = 3;

export function classroomHostPreset(
  settings: ClassroomTemplateSettings | null | undefined
): ClassroomHostPreset | null {
  if (!settings) return null;

  // Round UP: a sub-minute leftover must never become a zero-minute game.
  const minutes =
    settings.timerSeconds > 0
      ? Math.ceil(settings.timerSeconds / 60)
      : DEFAULT_TIMER_MINUTES;

  return {
    timerMinutes: minutes,
    difficulty: BOARD_SIZE_TO_DIFFICULTY[settings.difficulty] ?? 'MEDIUM',
    minWordLength: settings.minWordLength ?? DEFAULT_MIN_WORD_LENGTH,
  };
}
