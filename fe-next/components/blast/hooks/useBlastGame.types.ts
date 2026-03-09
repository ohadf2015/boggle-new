import type { LetterGrid } from '@/shared/types/game';
import type {
  BlastGameState,
  BlastTileState,
  BlastResultsData,
  BlastExplosion,
  BlastScorePopup,
  BlastObjective,
  CascadeHighlightPhase,
  CascadeHighlightData,
} from '../types';
import type { BlastComboType, SpecialCombo } from '../utils/blastCombos';
import type { BlastCascadePhase, CascadeAnimationData } from './useBlastCascade';

export interface UseBlastGameReturn {
  grid: LetterGrid | null;
  displayGrid: LetterGrid | null;
  tileStates: BlastTileState[][];
  gameState: BlastGameState;
  explosions: BlastExplosion[];
  scorePopups: BlastScorePopup[];
  availableWords: { easy: string[]; medium: string[]; hard: string[] } | null;
  clearTilesForWord: (
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number
  ) => void;
  noWordsRemaining: boolean;
  endGame: () => void;
  shuffleRemainingTiles: () => void;
  getResultsData: (maxCombo: number) => BlastResultsData;
  dismissExplosion: (id: string) => void;
  dismissScorePopup: (id: string) => void;
  cascadePhase: BlastCascadePhase;
  isCascading: boolean;
  cascadeAnimationData: CascadeAnimationData | null;
  cascadeChainLevel: number;
  cascadeHighlightPhase: CascadeHighlightPhase;
  cascadeHighlightData: CascadeHighlightData | null;
  /** Legacy alias */
  modifiedGrid: LetterGrid | null;
  activeComboFlash: { id: string; comboType: BlastComboType } | null;
  clearComboFlash: () => void;
  triggerComboFlash: (comboType: string) => void;
  trackWordFail: () => void;
  setTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
  addExplosion: (row: number, col: number, tileType: string) => void;
  addBonusScore: (bonus: number) => void;
  unlockMoves: () => void;
}

export interface UseBlastGameOptions {
  onAutoCascadeWord?: (word: string, score: number, chainLevel: number) => void;
  movesAllowed?: number;
  waveObjectives?: BlastObjective[];
  currentWave?: number;
  onSynergyDetected?: (comboType: BlastComboType) => void;
  onComboDetected?: (combos: SpecialCombo[]) => void;
  onMovesExhausted?: () => void;
  blastSeed?: number | null;
  initialTileStates?: BlastTileState[][] | null;
}
