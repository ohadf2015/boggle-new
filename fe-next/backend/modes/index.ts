/**
 * Mode registry: one module per MP game mode (see ./types.ts), plus the
 * per-mode rules table (./rules.ts). Unknown modes play as classic.
 */

import type { GameMode } from '@/shared/types';
import type { GameModeModule } from './types';
import { classicMode } from './classic';
import { blastMode } from './blast';
import { wordHuntMode } from './wordHunt';
import { wheelRushMode } from './wheelRush';
import { wordTowerMode } from './wordTower';
import { sealedBidMode } from './sealedBid';
import { crosswordMode } from './crossword';

const MODES: Partial<Record<GameMode, GameModeModule>> = {
  classic: classicMode,
  blast: blastMode,
  'word-hunt': wordHuntMode,
  'wheel-rush': wheelRushMode,
  'word-tower': wordTowerMode,
  'sealed-bid': sealedBidMode,
  crossword: crosswordMode,
};

export function getGameModeModule(mode: string | null | undefined): GameModeModule {
  return MODES[(mode || 'classic') as GameMode] ?? classicMode;
}

export { getGameModeRules, isDuplicateRuleDisabled } from './rules';
export type { GameModeModule, ModeRoundContext, ModeRoundResult, PayloadView } from './types';
