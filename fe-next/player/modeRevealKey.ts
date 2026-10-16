import type { GameMode, GameModeSelection } from '@/shared/types';
import { BOSS_ROUND_META } from '@/components/multiplayer/round/roundModes';
import { MODE_TRANSLATION_KEY } from '@/components/education/classroomModeLabels';

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

interface RoundRevealInput {
  bossRound: boolean;
  classroomGameMode: string | null | undefined;
  gameMode: GameModeSelection | null | undefined;
}

/** The splash and the 3-2-1 badge name the same round: a boss round is Boss Battle whatever the board mode says. */
export function roundRevealKey({ bossRound, classroomGameMode, gameMode }: RoundRevealInput): string {
  if (bossRound) return BOSS_ROUND_META.nameKey;
  if (classroomGameMode) return `teacher.classroom.gameModes.${MODE_TRANSLATION_KEY[classroomGameMode] ?? 'classic'}`;
  return modeRevealKey(gameMode);
}
