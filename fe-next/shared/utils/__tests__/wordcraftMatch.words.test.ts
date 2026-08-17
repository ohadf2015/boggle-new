import { describe, it, expect } from 'vitest';
import { initWordCraftMatch, validateWordCraftMove } from '../wordcraftMatch';
import { createWordCraftBoard } from '../wordcraftBag';
import type { RackTile } from '@/lib/word-craft/types';

/**
 * The server used to call the dictionary once per placed tile — asking whether
 * "E" was a word — so no move could ever be accepted. A live two-client match
 * rejected EAR with INVALID_WORD. These tests pin that the RUN is what gets
 * validated, gaps are refused, and the score comes from tile values.
 */

const tile = (id: string, letter: string, value: number): RackTile => ({
  id,
  letter,
  value,
  isBlank: letter === '_',
});

const RACK: RackTile[] = [
  tile('r-e', 'E', 1),
  tile('r-a', 'A', 1),
  tile('r-r', 'R', 1),
  tile('r-q', 'Q', 10),
];

const matchWithRack = () => {
  const state = initWordCraftMatch({
    player1Username: 'p1',
    player2Username: 'p2',
    board: createWordCraftBoard(13) as never,
    bag: [...RACK],
    roomId: 'test',
  });
  state.player1.rack = [...RACK];
  return state;
};

const KNOWN_WORDS = new Set(['ear', 'era']);
const validator = async (word: string) => KNOWN_WORDS.has(word.toLowerCase());

const at = (row: number, col: number) => ({ row, col });

describe('validateWordCraftMove — the word, not the letters', () => {
  it('accepts a real word formed across, and scores it by tile value', async () => {
    const res = await validateWordCraftMove({
      state: matchWithRack(),
      placements: [
        { tileId: 'r-e', pos: at(6, 6), letter: 'E' },
        { tileId: 'r-a', pos: at(6, 7), letter: 'A' },
        { tileId: 'r-r', pos: at(6, 8), letter: 'R' },
      ],
      rackTiles: RACK,
      player: 'player1',
      validator,
    });
    expect(res.valid).toBe(true);
    expect(res.scoredWords).toEqual(['EAR']);
    // 1 + 1 + 1, from the rack tiles' own values — not a flat per-tile bonus.
    expect(res.score).toBe(3);
  });

  it('rejects a run that is not in the dictionary', async () => {
    const res = await validateWordCraftMove({
      state: matchWithRack(),
      placements: [
        { tileId: 'r-q', pos: at(6, 6), letter: 'Q' },
        { tileId: 'r-e', pos: at(6, 7), letter: 'E' },
      ],
      rackTiles: RACK,
      player: 'player1',
      validator,
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('INVALID_WORD');
  });

  it('rejects tiles that do not share a row or column', async () => {
    const res = await validateWordCraftMove({
      state: matchWithRack(),
      placements: [
        { tileId: 'r-e', pos: at(6, 6), letter: 'E' },
        { tileId: 'r-a', pos: at(7, 8), letter: 'A' },
      ],
      rackTiles: RACK,
      player: 'player1',
      validator,
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('INVALID_PLACEMENT');
  });

  it('rejects a gap between placed tiles', async () => {
    const res = await validateWordCraftMove({
      state: matchWithRack(),
      placements: [
        { tileId: 'r-e', pos: at(6, 6), letter: 'E' },
        { tileId: 'r-a', pos: at(6, 9), letter: 'A' },
      ],
      rackTiles: RACK,
      player: 'player1',
      validator,
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('INVALID_PLACEMENT');
  });

  it('reads through a tile already on the board', async () => {
    const state = matchWithRack();
    // Board already holds E at (6,6); the player adds A and R beside it.
    state.board[6][6] = {
      row: 6,
      col: 6,
      letter: 'E',
      value: 1,
      isBlank: false,
      rackTileId: 'placed-e',
    } as never;

    const res = await validateWordCraftMove({
      state,
      placements: [
        { tileId: 'r-a', pos: at(6, 7), letter: 'A' },
        { tileId: 'r-r', pos: at(6, 8), letter: 'R' },
      ],
      rackTiles: RACK,
      player: 'player1',
      validator,
    });
    expect(res.valid).toBe(true);
    expect(res.scoredWords).toEqual(['EAR']);
  });

  it('rejects a single tile that forms no word', async () => {
    const res = await validateWordCraftMove({
      state: matchWithRack(),
      placements: [{ tileId: 'r-e', pos: at(6, 6), letter: 'E' }],
      rackTiles: RACK,
      player: 'player1',
      validator,
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('WORD_TOO_SHORT');
  });
});
