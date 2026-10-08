import type { CoachModeKey } from './modeCoachStore';

const MP_COACH: Record<string, CoachModeKey> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
  'word-tower': 'wordTower',
  crossword: 'crossword',
};

export const mpCoachMode = (gameMode: string | undefined): CoachModeKey | undefined =>
  gameMode ? MP_COACH[gameMode] : undefined;
