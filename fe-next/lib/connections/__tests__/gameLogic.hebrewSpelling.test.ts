/**
 * Hebrew ktiv male / ktiv haser (full vs defective spelling) tolerance.
 *
 * Hebrew writes the same word two legitimate ways: with or without the optional
 * mater lectionis vav/yud (תוכנית / תכנית, ספרייה / ספריה). 334 of the 407
 * active Hebrew puzzles carry ZERO acceptedAnswers, so before this the stored
 * spelling was the only one that scored — a player who typed the other correct
 * spelling was marked wrong and burned one of their 4 attempts.
 *
 * The tolerance is deliberately NOT "strip every vav and yud": in SHORT Hebrew
 * words the mater is lexical, not optional (שיר ≠ שר, עיר ≠ ער, אור ≠ ארי), and
 * folding those would credit a genuinely different word. See stripMatres.
 */
import { describe, it, expect } from 'vitest';
import { checkGuess } from '../gameLogic';
import type { ConnectionPuzzle } from '../types';

function hePuzzle(bridge: string): ConnectionPuzzle {
  return { id: 'he-x', word1: 'א', word2: 'ב', bridge, difficulty: 'easy' };
}

describe('checkGuess — Hebrew ktiv male/haser tolerance', () => {
  it.each([
    ['תוכנית', 'תכנית'],
    ['ספרייה', 'ספריה'],
    ['מייד', 'מיד'],
    ['שולחן', 'שלחן'],
    ['אוכל', 'אכל'],
    ['תיקון', 'תקון'],
  ])('accepts %s and %s as the same word, in both directions', (full, defective) => {
    expect(checkGuess(defective, hePuzzle(full)).correct).toBe(true);
    expect(checkGuess(full, hePuzzle(defective)).correct).toBe(true);
  });

  it('still rejects short words where the mater is lexical, not optional', () => {
    // Folding every vav/yud would wrongly credit these genuinely different words.
    expect(checkGuess('שר', hePuzzle('שיר')).correct).toBe(false);
    expect(checkGuess('ער', hePuzzle('עיר')).correct).toBe(false);
    expect(checkGuess('ארי', hePuzzle('אור')).correct).toBe(false);
    expect(checkGuess('דן', hePuzzle('דין')).correct).toBe(false);
  });

  it('accepts the 3 known non-synonym collisions — a deliberate, measured leniency', () => {
    // Over the 276 distinct active Hebrew bridges these are the ONLY pairs that
    // collapse together without being the same word. Raising the threshold to 4
    // would kill all 3 but strip tolerance from 77 bridges, so we take the
    // leniency instead. If this test starts failing, the threshold moved —
    // re-run the collision audit before accepting the change.
    expect(checkGuess('ריגול', hePuzzle('רגל')).correct).toBe(true);
    expect(checkGuess('שינה', hePuzzle('שנה')).correct).toBe(true);
    expect(checkGuess('סוחר', hePuzzle('סחר')).correct).toBe(true);
  });

  it('still rejects an unrelated word', () => {
    expect(checkGuess('מכונית', hePuzzle('תוכנית')).correct).toBe(false);
    expect(checkGuess('', hePuzzle('תוכנית')).correct).toBe(false);
  });

  it('leaves non-Hebrew matching untouched', () => {
    const en: ConnectionPuzzle = { id: 'en-x', word1: 'A', word2: 'B', bridge: 'WORM', difficulty: 'easy' };
    expect(checkGuess('worm', en).correct).toBe(true);
    expect(checkGuess('warm', en).correct).toBe(false);
  });

  it('combines with sofit folding — final-letter form still matches', () => {
    // שולחן stores a sofit nun; the on-screen keyboard only emits base letters.
    expect(checkGuess('שלחנ', hePuzzle('שולחן')).correct).toBe(true);
  });
});
