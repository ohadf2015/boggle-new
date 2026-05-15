import type { Board, BoardSize } from '../board';
import type { TileBag, SupportedLocale } from '../tileBag';
import type { RackTile, PlacedTile } from '../types';
import type { PowerCard } from './powerCards';
import type { WordScore } from './cardEffects';

export type RunPhase = 'intro' | 'playing' | 'roundResult' | 'cardPick' | 'runResult';

export interface RoundState {
  round: number;
  target: number;
  score: number;
  wordsPlayedThisRound: number;
}

export interface RunState {
  phase: RunPhase;
  seed: number;
  locale: SupportedLocale;
  boardSize: Extract<BoardSize, 7 | 9>;
  board: Board;
  bag: TileBag;
  rack: RackTile[];
  pendingPlacements: PlacedTile[];
  selectedRackTileId: string | null;
  activeCards: PowerCard[];
  round: RoundState;
  cardChoice: PowerCard[] | null;
  roundPassed: boolean;
  runTotal: number;
  lastWordScore: WordScore | null;
  lastError: string | null;
  cleared: boolean;
}

export type RunAction =
  | { type: 'START_RUN' }
  | { type: 'SELECT_RACK_TILE'; rackTileId: string | null }
  | { type: 'PLACE_TILE'; rackTileId: string; row: number; col: number }
  | { type: 'RECALL_TILE'; rackTileId: string }
  | { type: 'RECALL_ALL' }
  | {
      type: 'COMMIT_MOVE';
      placements: PlacedTile[];
      wordScore: number;
      wordsCount: number;
      lastWordScore: WordScore;
    }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'END_ROUND' }
  | { type: 'PROCEED' }
  | { type: 'PICK_CARD'; cardId: string }
  | { type: 'RESTART' };
