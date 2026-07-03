import { describe, it, expect } from 'vitest';
import {
  FINALE_POINTS,
  initPyramidState,
  pyramidGuess,
  pyramidAdvance,
  pyramidGiveUp,
  pyramidRevive,
  checkFinaleGuess,
} from '../gameLogic';
import type { PyramidPuzzle } from '../types';
import type { ConnectionPuzzle } from '../../types';

function base(id: string, bridge: string, difficulty: ConnectionPuzzle['difficulty']): ConnectionPuzzle {
  return { id, word1: 'ALPHA', bridge, word2: 'OMEGA', difficulty };
}

const PYRAMID: PyramidPuzzle = {
  id: 'en-pyr-t01',
  metaAnswer: 'LIGHT',
  metaAccepted: ['lights'],
  metaHint: 'it banishes the dark',
  base: [base('b1', 'MOON', 'easy'), base('b2', 'DAY', 'medium'), base('b3', 'FLASH', 'hard')],
  difficulty: 'medium',
};

describe('initPyramidState', () => {
  it('starts at stage 0, 3 lives, playing', () => {
    const s = initPyramidState(PYRAMID);
    expect(s.stage).toBe(0);
    expect(s.lives).toBe(3);
    expect(s.status).toBe('playing');
    expect(s.score).toBe(0);
    expect(s.solvedBridges).toEqual([]);
    expect(s.gaveUpBase).toEqual([false, false, false]);
  });
});

describe('pyramidGuess — base stages', () => {
  it('correct base guess scores by difficulty and reveals the bridge', () => {
    const s = pyramidGuess(initPyramidState(PYRAMID), 'moon');
    expect(s.status).toBe('correct');
    expect(s.score).toBe(100); // easy
    expect(s.solvedBridges).toEqual(['MOON']);
    expect(s.lives).toBe(3);
  });

  it('wrong guess costs a life and keeps the stage', () => {
    const s = pyramidGuess(initPyramidState(PYRAMID), 'sun');
    expect(s.status).toBe('wrong');
    expect(s.lives).toBe(2);
    expect(s.wrongAttempts).toBe(1);
    expect(s.solvedBridges).toEqual([]);
  });

  it('third wrong guess reaches outOfLives, then advance loses the run', () => {
    let s = initPyramidState(PYRAMID);
    s = pyramidGuess(s, 'x1');
    s = pyramidGuess(s, 'x2');
    s = pyramidGuess(s, 'x3');
    expect(s.status).toBe('outOfLives');
    expect(s.lives).toBe(0);
    expect(pyramidAdvance(s).status).toBe('lost');
  });

  it('guessing is a no-op after the run ended', () => {
    let s = initPyramidState(PYRAMID);
    for (const g of ['x1', 'x2', 'x3']) s = pyramidGuess(s, g);
    const ended = pyramidAdvance(s);
    expect(pyramidGuess(ended, 'moon')).toBe(ended);
  });
});

describe('pyramidGiveUp', () => {
  it('reveals the bridge, flags the slot, costs no life', () => {
    const s = pyramidGiveUp(initPyramidState(PYRAMID));
    expect(s.status).toBe('gaveUp');
    expect(s.lives).toBe(3);
    expect(s.solvedBridges).toEqual(['MOON']);
    expect(s.gaveUpBase).toEqual([true, false, false]);
  });
});

describe('pyramidAdvance', () => {
  it('walks stage 0→1→2→finale as bridges resolve', () => {
    let s = initPyramidState(PYRAMID);
    s = pyramidAdvance(pyramidGuess(s, 'moon'));
    expect(s.stage).toBe(1);
    expect(s.status).toBe('playing');
    s = pyramidAdvance(pyramidGuess(s, 'day'));
    expect(s.stage).toBe(2);
    s = pyramidAdvance(pyramidGiveUp(s));
    expect(s.stage).toBe(3);
    expect(s.solvedBridges).toEqual(['MOON', 'DAY', 'FLASH']);
    expect(s.status).toBe('playing');
    expect(s.hintRevealed).toBe(false);
  });
});

describe('finale', () => {
  function atFinale(): ReturnType<typeof initPyramidState> {
    let s = initPyramidState(PYRAMID);
    s = pyramidAdvance(pyramidGuess(s, 'moon'));
    s = pyramidAdvance(pyramidGuess(s, 'day'));
    s = pyramidAdvance(pyramidGuess(s, 'flash'));
    return s;
  }

  it('correct finale guess wins with FINALE_POINTS', () => {
    const before = atFinale();
    const s = pyramidGuess(before, 'light');
    expect(s.status).toBe('won');
    expect(s.score).toBe(before.score + FINALE_POINTS);
  });

  it('accepts metaAccepted variants and canonicalization (plural)', () => {
    expect(checkFinaleGuess('lights', PYRAMID)).toBe(true);
    expect(checkFinaleGuess(' LIGHT ', PYRAMID)).toBe(true);
    expect(checkFinaleGuess('dark', PYRAMID)).toBe(false);
  });

  it('wrong finale guess costs a life; out of lives loses', () => {
    let s = atFinale();
    s = pyramidGuess(s, 'x1');
    expect(s.status).toBe('wrong');
    expect(s.lives).toBe(2);
    s = pyramidGuess(s, 'x2');
    s = pyramidGuess(s, 'x3');
    expect(s.status).toBe('outOfLives');
    expect(pyramidAdvance(s).status).toBe('lost');
  });

  it('finale give-up loses the run', () => {
    const s = pyramidGiveUp(atFinale());
    expect(s.status).toBe('lost');
  });
});

describe('pyramidRevive', () => {
  it('restores lives and resumes play', () => {
    let s = initPyramidState(PYRAMID);
    for (const g of ['x1', 'x2', 'x3']) s = pyramidGuess(s, g);
    expect(s.status).toBe('outOfLives');
    const revived = pyramidRevive(s);
    expect(revived.lives).toBe(3);
    expect(revived.status).toBe('playing');
    expect(revived.stage).toBe(0);
  });
});
