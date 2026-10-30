import type { DifficultyLevel } from '@/shared/types/game';

export type PresetKey = 'fast' | 'challenge';

export interface GamePreset {
  nameKey: string;
  detailsKey: string;
  icon: string;
  timer: number;
  difficulty: DifficultyLevel;
  minWordLength: number;
}

export const GAME_PRESETS: Record<PresetKey, GamePreset> = {
  fast: {
    nameKey: 'hostView.presetFast',
    detailsKey: 'hostView.presetFastDetails',
    icon: '⚡',
    timer: 1,
    difficulty: 'MEDIUM',
    minWordLength: 2,
  },
  challenge: {
    nameKey: 'hostView.presetChallenge',
    detailsKey: 'hostView.presetChallengeDetails',
    icon: '🏆',
    timer: 2,
    difficulty: 'HARD',
    minWordLength: 2,
  },
};
