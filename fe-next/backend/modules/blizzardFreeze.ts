import type { GameState } from './gameState/types.js';
import { isWordOnBoardAsync } from './wordValidatorPool.js';
import { isWordOnBoard, makePositionsMap } from './wordValidator.js';

type Tile = { row: number; col: number };

function frozenBoard(game: GameState | null | undefined): string[][] | null {
  if (!game || game.activeRoundEvent !== 'blizzard' || !game.letterGrid) return null;
  const tiles = (game as GameState & { frozenTiles?: Tile[] }).frozenTiles;
  if (!tiles?.length) return null;
  const masked = game.letterGrid.map((row) => [...row]);
  for (const { row, col } of tiles) if (masked[row]?.[col] !== undefined) masked[row][col] = '#';
  return masked;
}

/** During a blizzard a word must be traceable without touching a frozen tile. */
export async function wordBlockedByBlizzard(game: GameState, word: string): Promise<boolean> {
  const masked = frozenBoard(game);
  if (!masked) return false;
  return !(await isWordOnBoardAsync(word, masked, makePositionsMap(masked, game.language || 'en')));
}

/** Same rule, synchronous, for the bot loop. */
export function wordBlockedByBlizzardSync(game: GameState | null | undefined, word: string): boolean {
  const masked = frozenBoard(game);
  if (!masked) return false;
  const language = game!.language || 'en';
  return !isWordOnBoard(word, masked, makePositionsMap(masked, language), language);
}
