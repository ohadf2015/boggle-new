import type { GameMode, GameModeSelection } from '@/shared/types';

const REVEAL_KEY: Partial<Record<GameMode, string>> = {
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
  crossword: 'crossword',
  'word-tower': 'wordTower',
};

/** Translation key for the pre-round mode reveal banner. */
export function modeRevealKey(mode: GameModeSelection | null | undefined): string {
  return `countdown.modeReveal.${(mode && REVEAL_KEY[mode as GameMode]) || 'classic'}`;
}
