import { describe, it, expect } from 'vitest';
import {
  FINALE_POINTS,
  initPyramidState,
  pyramidGuess,
  pyramidAdvance,
  pyramidGiveUp,
  pyramidRevive,
  checkFinaleGuess,
  PYRAMID_ATTEMPTS_PER_STAGE,
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

  it('wrong guess spends a stage attempt and keeps the stage', () => {
    const s = pyramidGuess(initPyramidState(PYRAMID), 'sun');
    expect(s.status).toBe('wrong');
    expect(s.wrongAttempts).toBe(1);
    expect(s.solvedBridges).toEqual([]);
  });

  it('burning a base stage reveals its bridge and the run continues', () => {
    let s = initPyramidState(PYRAMID);
    for (let i = 0; i < PYRAMID_ATTEMPTS_PER_STAGE; i++) s = pyramidGuess(s, `x${i}`);
    expect(s.status).toBe('gaveUp');
    expect(s.gaveUpBase[0]).toBe(true);
    expect(pyramidAdvance(s).status).toBe('playing');
  });

  it('guessing is a no-op after the run ended', () => {
    let s = initPyramidState(PYRAMID);
    // Burn all three base stages, then the finale — the only terminal loss.
    for (let stage = 0; stage < 3; stage++) {
      for (let i = 0; i < PYRAMID_ATTEMPTS_PER_STAGE; i++) s = pyramidGuess(s, `x${i}`);
      s = pyramidAdvance(s);
    }
    for (let i = 0; i < PYRAMID_ATTEMPTS_PER_STAGE; i++) s = pyramidGuess(s, `f${i}`);
    const ended = pyramidAdvance(s);
    expect(ended.status).toBe('lost');
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

  it('wrong finale guess spends an attempt; burning them all loses', () => {
    let s = atFinale();
    s = pyramidGuess(s, 'x0');
    expect(s.status).toBe('wrong');
    for (let i = 1; i < PYRAMID_ATTEMPTS_PER_STAGE; i++) s = pyramidGuess(s, `x${i}`);
    expect(s.status).toBe('outOfLives');
    expect(pyramidAdvance(s).status).toBe('lost');
  });

  it('finale give-up loses the run', () => {
    const s = pyramidGiveUp(atFinale());
    expect(s.status).toBe('lost');
  });
});

describe('pyramidRevive', () => {
  it('refills the stage attempt budget and resumes play at the finale', () => {
    let s = initPyramidState(PYRAMID);
    s = pyramidAdvance(pyramidGuess(s, 'moon'));
    s = pyramidAdvance(pyramidGuess(s, 'day'));
    s = pyramidAdvance(pyramidGuess(s, 'flash'));
    for (let i = 0; i < PYRAMID_ATTEMPTS_PER_STAGE; i++) s = pyramidGuess(s, `x${i}`);
    expect(s.status).toBe('outOfLives');
    const revived = pyramidRevive(s);
    expect(revived.wrongAttempts).toBe(0);
    expect(revived.status).toBe('playing');
    expect(revived.stage).toBe(3);
  });
});
