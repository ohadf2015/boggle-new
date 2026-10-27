import { describe, it, expect } from 'vitest';
import { summarizeGame } from '../gameHighlights';

const h = (who: 'player' | 'bot', words: string[], score: number) => ({ who, words, score, placedTileIds: [] });

describe('summarizeGame', () => {
  it('picks the best-scoring player move and longest player word', () => {
    const s = summarizeGame([
      h('player', ['cat'], 5),
      h('bot', ['zebra'], 30),
      h('player', ['quartz', 'qu'], 22),
      h('player', [], 0),
    ]);
    expect(s.bestMove).toEqual({ word: 'quartz', score: 22 });
    expect(s.longestWord).toBe('quartz');
    expect(s.moves).toBe(2);
  });
  it('returns nulls when the player never scored', () => {
    expect(summarizeGame([h('bot', ['hi'], 3), h('player', [], 0)])).toEqual({ bestMove: null, longestWord: null, moves: 0 });
  });
});
