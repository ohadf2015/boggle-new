/**
 * Label helpers shared by the three student-preview screens.
 *
 * The preview reuses the teacher-facing setting labels (mode / board / min
 * length) so the student summary can never drift from what the teacher chose.
 */

import type { GameMode } from '@/shared/types/game';

// Translation keys are camelCase; canonical GameMode wire values are kebab.
const MODE_KEY_MAP: Partial<Record<GameMode, string>> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
};

export type Translate = (key: string, params?: Record<string, string | number>) => string;

export function gameModeLabel(t: Translate, mode: GameMode): string {
  const key = MODE_KEY_MAP[mode];
  return key ? t(`teacher.classroom.gameModes.${key}`) : mode;
}

export function boardSizeLabel(t: Translate, size: 'small' | 'medium' | 'large'): string {
  return t(`teacher.classroom.board.${size}`);
}

export function timerLabel(t: Translate, minutes: number): string {
  return t('education.studentPreview.settings.minutes', { count: minutes });
}

export function minLengthLabel(t: Translate, minWordLength: number): string {
  return t('education.studentPreview.settings.letters', { count: minWordLength });
}

/** mm:ss as the in-game countdown shows it before the first tick. */
export function formatCountdown(minutes: number): string {
  return `${String(minutes).padStart(2, '0')}:00`;
}
