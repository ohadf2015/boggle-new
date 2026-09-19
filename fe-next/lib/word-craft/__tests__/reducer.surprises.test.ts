import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState, type WordCraftState } from '../useWordCraftGame';
import { countClaimed } from '../territory';
import type { PlacedTile } from '../types';

const place = (state: WordCraftState, who: 'player' | 'bot', idx: number, row: number, col: number): PlacedTile => ({
  rackTileId: state[who].rack[idx].id,
  row,
  col,
  letter: state[who].rack[idx].letter,
  value: 1,
  isBlank: false,
});

function init(territoryEnabled = true): WordCraftState {
  return buildInitialState({ seed: 5, boardSize: 15, locale: 'en', territoryEnabled, modifierOverride: 'none' });
}

describe('reducer — surprise boxes', () => {
  it('Given a fresh game, Then there are no boxes and no reveal yet', () => {
    const s = init();
    expect(s.surprises).toEqual([]);
    expect(s.lastSurprise).toBeNull();
  });

  it('Given a full round was played, When the bot commits, Then a box spawns for the player to chase', () => {
    let s = init();
    s = wordCraftReducer(s, { type: 'COMMIT_PLAYER', placements: [place(s, 'player', 0, 7, 7)], score: 1, words: ['A'], wordCells: [[{ row: 7, col: 7 }]] });
    expect(s.surprises).toHaveLength(0);
    s = wordCraftReducer(s, { type: 'COMMIT_BOT', placements: [place(s, 'bot', 0, 8, 7)], score: 1, words: ['B'], wordCells: [[{ row: 8, col: 7 }]] });
    expect(s.surprises).toHaveLength(1);
  });

  it('Given territory is off, Then boxes never spawn (their rewards are squares)', () => {
    let s = init(false);
    s = wordCraftReducer(s, { type: 'COMMIT_PLAYER', placements: [place(s, 'player', 0, 7, 7)], score: 1, words: ['A'] });
    s = wordCraftReducer(s, { type: 'COMMIT_BOT', placements: [place(s, 'bot', 0, 8, 7)], score: 1, words: ['B'] });
    expect(s.surprises).toEqual([]);
  });

  it('Given a paint box, When the player covers it, Then it opens, paints squares and records the reveal', () => {
    let s = init();
    s = { ...s, surprises: [{ row: 7, col: 7, kind: 'paint' }] };
    s = wordCraftReducer(s, { type: 'COMMIT_PLAYER', placements: [place(s, 'player', 0, 7, 7)], score: 1, words: ['A'], wordCells: [[{ row: 7, col: 7 }]] });
    expect(s.surprises).toEqual([]);
    expect(s.lastSurprise).toMatchObject({ by: 'player', kind: 'paint', count: 8, row: 7, col: 7 });
    expect(countClaimed(s.board, 'player')).toBe(9);
  });

  it('Given a clue box, When the player covers it, Then a clue is earned', () => {
    let s = init();
    const before = s.cluesRemaining;
    s = { ...s, surprises: [{ row: 7, col: 7, kind: 'clue' }] };
    s = wordCraftReducer(s, { type: 'COMMIT_PLAYER', placements: [place(s, 'player', 0, 7, 7)], score: 1, words: ['A'], wordCells: [[{ row: 7, col: 7 }]] });
    expect(s.cluesRemaining).toBe(before + 1);
    expect(s.lastSurprise).toMatchObject({ kind: 'clue', by: 'player' });
  });
});
