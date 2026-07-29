import { describe, it, expect } from 'vitest';
import { checkGuess } from '../gameLogic';
import type { ConnectionPuzzle } from '../types';

/**
 * The on-screen keyboard emits only the 22 Hebrew BASE letters (sofit/final
 * glyphs are never typed). So a stored bridge ending in a final letter
 * (ך ם ן ף ץ) must still match a base-letter guess, and vice versa.
 * Before the fix, checkGuess compared sofit-vs-base literally → unsolvable.
 */
describe('checkGuess — Hebrew sofit/base normalization', () => {
  const hePuzzle = (bridge: string, accepted?: string[]): ConnectionPuzzle => ({
    id: 'he-x-001',
    word1: 'א',
    word2: 'ב',
    bridge,
    acceptedAnswers: accepted,
    difficulty: 'easy',
  });

  it('accepts a base-letter guess for a bridge stored with a final letter', () => {
    // bridge "שלום" ends in sofit ם; keyboard can only produce base "שלומ"
    const result = checkGuess('שלומ', hePuzzle('שלום'));
    expect(result.correct).toBe(true);
  });

  it('accepts a sofit guess for a bridge stored with a base letter', () => {
    // bridge stored base "שלומ"; physical Hebrew keyboard types sofit "שלום"
    const result = checkGuess('שלום', hePuzzle('שלומ'));
    expect(result.correct).toBe(true);
  });

  it('normalizes acceptedAnswers too', () => {
    const result = checkGuess('כיופ', hePuzzle('שלום', ['כיוף']));
    expect(result.correct).toBe(true);
  });

  it('still rejects a genuinely wrong Hebrew guess', () => {
    const result = checkGuess('בית', hePuzzle('שלום'));
    expect(result.correct).toBe(false);
  });

  it('does not break English depluralize/case matching (regression)', () => {
    const enPuzzle: ConnectionPuzzle = {
      id: 'en-x-001', word1: 'fire', word2: 'engine', bridge: 'truck', difficulty: 'easy',
    };
    expect(checkGuess('Trucks', enPuzzle).correct).toBe(true);
    expect(checkGuess('car', enPuzzle).correct).toBe(false);
  });
});
