import { createBoard, placeTiles } from '../board';
import { createBag, draw, type TileBag, type SupportedLocale } from '../tileBag';
import { resolveDrag } from '../placement';
import type { RackTile } from '../types';
import type { RunState, RunAction } from './runTypes';
import { getRoundBagSize, getRoundTarget } from './runTargets';

export interface BuildRunOptions {
  seed: number;
  locale: SupportedLocale;
  boardSize: 7 | 9;
}

function cloneBag(bag: TileBag): TileBag {
  return { tiles: [...bag.tiles], rng: bag.rng, nextId: bag.nextId };
}

export function buildInitialRunState(opts: BuildRunOptions): RunState {
  const { seed, locale, boardSize } = opts;
  const board = createBoard(boardSize);
  const bag = createBag({ seed: seed + 1, locale, bagSize: getRoundBagSize(1) });
  const rack = draw(bag, 8);
  return {
    phase: 'intro',
    seed,
    locale,
    boardSize,
    board,
    bag,
    rack,
    pendingPlacements: [],
    selectedRackTileId: null,
    activeCards: [],
    round: { round: 1, target: getRoundTarget(1, boardSize), score: 0, wordsPlayedThisRound: 0 },
    cardChoice: null,
    roundPassed: false,
    runTotal: 0,
    lastWordScore: null,
    lastError: null,
    cleared: false,
  };
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'START_RUN':
      return { ...state, phase: 'playing' };

    case 'SELECT_RACK_TILE':
      return { ...state, selectedRackTileId: action.rackTileId };

    case 'PLACE_TILE': {
      const rackTile = state.rack.find((t) => t.id === action.rackTileId);
      if (!rackTile) return state;
      const result = resolveDrag(
        rackTile,
        { row: action.row, col: action.col },
        state.pendingPlacements,
        state.board,
      );
      if ('reason' in result) {
        return { ...state, lastError: result.reason };
      }
      return {
        ...state,
        rack: state.rack.filter((t) => t.id !== action.rackTileId),
        pendingPlacements: [...state.pendingPlacements, result.placement],
        selectedRackTileId: null,
        lastError: null,
      };
    }

    case 'RECALL_TILE': {
      const placement = state.pendingPlacements.find((p) => p.rackTileId === action.rackTileId);
      if (!placement) return state;
      const restored: RackTile = {
        id: placement.rackTileId,
        letter: placement.isBlank ? '_' : placement.letter,
        value: placement.value,
        isBlank: placement.isBlank,
      };
      return {
        ...state,
        pendingPlacements: state.pendingPlacements.filter((p) => p.rackTileId !== action.rackTileId),
        rack: [...state.rack, restored],
        lastError: null,
      };
    }

    case 'RECALL_ALL': {
      const restored: RackTile[] = state.pendingPlacements.map((p) => ({
        id: p.rackTileId,
        letter: p.isBlank ? '_' : p.letter,
        value: p.value,
        isBlank: p.isBlank,
      }));
      return {
        ...state,
        pendingPlacements: [],
        rack: [...state.rack, ...restored],
        lastError: null,
      };
    }

    case 'COMMIT_MOVE': {
      const board = structuredClone(state.board);
      placeTiles(board, action.placements);
      const bag = cloneBag(state.bag);
      const refill = draw(bag, action.placements.length);
      return {
        ...state,
        board,
        bag,
        rack: [...state.rack, ...refill],
        pendingPlacements: [],
        selectedRackTileId: null,
        lastError: null,
        lastWordScore: action.lastWordScore,
        round: {
          ...state.round,
          score: state.round.score + action.wordScore,
          wordsPlayedThisRound: state.round.wordsPlayedThisRound + action.wordsCount,
        },
      };
    }

    case 'SET_ERROR':
      return { ...state, lastError: action.message };

    case 'CLEAR_ERROR':
      return { ...state, lastError: null };

    default:
      return state;
  }
}
