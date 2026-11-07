import { describe, it, expect } from 'vitest';
import { scoreGuess, filterCandidates, bestGuess, solve } from '../solver';
import { WORDLE_ANSWERS } from '../answers';

describe('scoreGuess', () => {
  it('marks greens, yellows and grays', () => {
    expect(scoreGuess('crane', 'react')).toBe('yygby');
  });

  it('does not count a repeated guess letter twice when the answer has it once', () => {
    expect(scoreGuess('speed', 'abide')).toBe('bbyby');
    expect(scoreGuess('eerie', 'ember')).toBe('gyybb');
  });

  it('prefers the green over an earlier yellow for a duplicate letter', () => {
    expect(scoreGuess('lolly', 'world')).toBe('bgbgb');
  });
});

describe('filterCandidates', () => {
  it('keeps only words consistent with every clue', () => {
    const words = ['react', 'trace', 'crate', 'caret'];
    expect(filterCandidates(words, [{ guess: 'crane', pattern: 'yygby' }])).toEqual(['react']);
  });
});

describe('bestGuess', () => {
  it('returns the only candidate when one is left', () => {
    expect(bestGuess(['hello'])).toBe('hello');
  });
});

describe('solve', () => {
  it('solves every answer in a sample within six guesses', () => {
    for (const answer of WORDLE_ANSWERS.filter((_, i) => i % 97 === 0)) {
      const guesses = solve(answer);
      expect(guesses[guesses.length - 1]).toBe(answer);
      expect(guesses.length).toBeLessThanOrEqual(6);
    }
  });
});
