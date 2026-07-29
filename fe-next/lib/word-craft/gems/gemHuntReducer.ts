import { createBoard, type Board, type BoardSize } from '../board';
import {
  createBag,
  draw,
  RACK_SIZE,
  remaining,
  type SupportedLocale,
  type TileBag,
} from '../tileBag';
import {
  validateAndScoreMove,
  type DictionaryCheck,
  type ScoredWord,
} from '../moveValidator';
import type { PlacedTile, RackTile } from '../types';
import { rollGemCells, replenishGemCells } from './gemPlacement';
import {
  addToInventory,
  canStillWin,
  canTransmute,
  collectGemsFromPlacements,
  hasWinningInventory,
  transmute,
} from './gemHuntRules';
import { rollShop } from './shopRoll';
import {
  emptyInventory,
  type AbilityCard,
  type CollectedGem,
  type GemCell,
  type GemColor,
  type GemInventory,
  type GemRarity,
} from './types';

export interface GemHuntFullState {
  board: Board;
  bag: TileBag;
  rack: RackTile[];
  pendingPlacements: PlacedTile[];
  selectedRackTileId: string | null;
  gemCells: GemCell[];
  inventory: GemInventory;
  shop: AbilityCard[];
  /** Bought-but-unused this turn. Applied at commit. */
  pendingAbilities: AbilityCard[];
  turnIndex: number;
  totalScore: number;
  lastError: string | null;
  /** Hydrated each commit so UI can fly captured gems. */
  lastCollection: CollectedGem[];
  /** Live status. `won` when 4 crowns acquired. `lost` when bag empty + no path. */
  outcome: 'won' | 'lost' | null;
  seed: number;
  locale: SupportedLocale;
}

export type GemHuntAction =
  | { type: 'SELECT_RACK_TILE'; id: string | null }
  | { type: 'PLACE_PENDING'; placement: PlacedTile }
  | { type: 'RECALL_PENDING'; rackTileId: string }
  | { type: 'CLEAR_PENDING' }
  | { type: 'COMMIT'; words: ScoredWord[]; score: number }
  | { type: 'SET_ERROR'; message: string | null }
  | { type: 'BUY_ABILITY'; card: AbilityCard }
  | { type: 'TRANSMUTE'; color: GemColor; rarity: GemRarity }
  | { type: 'REROLL_SHOP'; card: AbilityCard }
  | { type: 'RESET'; seed: number; locale: SupportedLocale; boardSize?: BoardSize };

export interface BuildInitialArgs {
  seed: number;
  locale?: SupportedLocale;
  boardSize?: BoardSize;
}

export function buildInitialGemHunt({ seed, locale = 'en', boardSize = 11 }: BuildInitialArgs): GemHuntFullState {
  const bag = createBag({ seed, locale });
  const rack = draw(bag, RACK_SIZE);
  const board = createBoard(boardSize);
  const gemCells = rollGemCells({ board, occupied: new Set(), seed });
  const shop = rollShop({ seed, turnIndex: 0 });
  return {
    board,
    bag,
    rack,
    pendingPlacements: [],
    selectedRackTileId: null,
    gemCells,
    inventory: emptyInventory(),
    shop,
    pendingAbilities: [],
    turnIndex: 0,
    totalScore: 0,
    lastError: null,
    lastCollection: [],
    outcome: null,
    seed,
    locale,
  };
}

function payCost(inv: GemInventory, cost: AbilityCard['cost']): GemInventory | null {
  if (inv[cost.color][cost.rarity] < 1) return null;
  return {
    ...inv,
    [cost.color]: {
      ...inv[cost.color],
      [cost.rarity]: inv[cost.color][cost.rarity] - 1,
    },
  };
}

export function gemHuntReducer(state: GemHuntFullState, action: GemHuntAction): GemHuntFullState {
  if (state.outcome !== null && action.type !== 'RESET') return state;
  switch (action.type) {
    case 'SELECT_RACK_TILE':
      return { ...state, selectedRackTileId: action.id, lastError: null };
    case 'PLACE_PENDING':
      return {
        ...state,
        pendingPlacements: [...state.pendingPlacements, action.placement],
        selectedRackTileId: null,
        lastError: null,
      };
    case 'RECALL_PENDING':
      return {
        ...state,
        pendingPlacements: state.pendingPlacements.filter((p) => p.rackTileId !== action.rackTileId),
      };
    case 'CLEAR_PENDING':
      return { ...state, pendingPlacements: [], selectedRackTileId: null };
    case 'SET_ERROR':
      return { ...state, lastError: action.message };
    case 'BUY_ABILITY': {
      const inv = payCost(state.inventory, action.card.cost);
      if (!inv) return { ...state, lastError: 'INSUFFICIENT_GEMS' };
      return {
        ...state,
        inventory: inv,
        pendingAbilities: [...state.pendingAbilities, action.card],
        shop: state.shop.filter((c) => c.id !== action.card.id),
        lastError: null,
      };
    }
    case 'REROLL_SHOP': {
      const inv = payCost(state.inventory, action.card.cost);
      if (!inv) return { ...state, lastError: 'INSUFFICIENT_GEMS' };
      const fresh = rollShop({ seed: state.seed, turnIndex: state.turnIndex + 1000 });
      return { ...state, inventory: inv, shop: fresh, lastError: null };
    }
    case 'TRANSMUTE': {
      if (!canTransmute(state.inventory, action.color, action.rarity)) {
        return { ...state, lastError: 'CANNOT_TRANSMUTE' };
      }
      const inv = transmute(state.inventory, action.color, action.rarity);
      const outcome = hasWinningInventory(inv) ? 'won' : state.outcome;
      return { ...state, inventory: inv, outcome, lastError: null };
    }
    case 'COMMIT': {
      const playedIds = new Set(state.pendingPlacements.map((p) => p.rackTileId));
      const remainingRack = state.rack.filter((t) => !playedIds.has(t.id));
      const replenishTiles = draw(state.bag, RACK_SIZE - remainingRack.length);
      const newRack = [...remainingRack, ...replenishTiles];

      const newBoardCells = state.board.cells.map((row) => row.map((c) => ({ ...c })));
      for (const p of state.pendingPlacements) {
        newBoardCells[p.row][p.col].tile = p;
      }
      const newBoard: Board = { cells: newBoardCells, size: state.board.size };

      const { collected, remaining: remainingCells } = collectGemsFromPlacements(
        state.gemCells,
        state.pendingPlacements.map((p) => ({ row: p.row, col: p.col })),
      );
      let inv = state.inventory;
      for (const gem of collected) inv = addToInventory(inv, { color: gem.color, rarity: gem.rarity });

      const occupied = new Set<string>();
      for (let r = 0; r < newBoard.size; r++) {
        for (let c = 0; c < newBoard.size; c++) {
          if (newBoard.cells[r][c].tile) occupied.add(`${r},${c}`);
        }
      }
      const replenishedGems = replenishGemCells({
        board: newBoard,
        occupied,
        current: remainingCells,
        seed: state.seed + state.turnIndex,
      });

      const turnIndex = state.turnIndex + 1;
      const shop = rollShop({ seed: state.seed, turnIndex });

      const winning = hasWinningInventory(inv);
      const bagEmpty = remaining(state.bag) === 0 && newRack.length === 0;
      let outcome: GemHuntFullState['outcome'] = null;
      if (winning) outcome = 'won';
      else if (bagEmpty && !canStillWin(inv, replenishedGems)) outcome = 'lost';

      return {
        ...state,
        board: newBoard,
        rack: newRack,
        pendingPlacements: [],
        selectedRackTileId: null,
        gemCells: replenishedGems,
        inventory: inv,
        shop,
        pendingAbilities: [],
        turnIndex,
        totalScore: state.totalScore + action.score,
        lastError: null,
        lastCollection: collected,
        outcome,
      };
    }
    case 'RESET':
      return buildInitialGemHunt({
        seed: action.seed,
        locale: action.locale,
        boardSize: action.boardSize ?? state.board.size,
      });
    default:
      return state;
  }
}

/** Pure helper to safely run validateAndScoreMove and shape the COMMIT action. */
export function validateGemMove(
  board: Board,
  placements: PlacedTile[],
  isWordValid: DictionaryCheck,
): { ok: true; score: number; words: ScoredWord[] } | { ok: false; reason: string } {
  const result = validateAndScoreMove(board, placements, isWordValid);
  if (!result.ok) return { ok: false, reason: result.invalidWord ? `INVALID_WORD:${result.invalidWord}` : result.reason ?? 'INVALID' };
  return { ok: true, score: result.score ?? 0, words: result.words ?? [] };
}
