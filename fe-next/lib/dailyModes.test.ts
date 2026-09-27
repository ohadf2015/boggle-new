import { describe, it, expect } from 'vitest';
import { pickPrimaryMode, pickNextUnplayedMode, type DailyModePlayState } from './dailyModes';

describe('pickPrimaryMode', () => {
  describe('all modes unplayed', () => {
    it('returns word-hunt when all modes are new/unplayed', () => {
      const state: DailyModePlayState = {
        wordHunt: 'new',
        wordWheel: 'new',
        wordTower: false,
        connections: false,
      };
      expect(pickPrimaryMode(state)).toBe('word-hunt');
    });
  });

  describe('word hunt unplayed', () => {
    it('prioritizes word-hunt over played modes', () => {
      const state: DailyModePlayState = {
        wordHunt: 'new',
        wordWheel: 'played',
        wordTower: true,
        connections: true,
      };
      expect(pickPrimaryMode(state)).toBe('word-hunt');
    });

    it('prioritizes word-hunt if user lost previous attempt', () => {
      const state: DailyModePlayState = {
        wordHunt: 'lost',
        wordWheel: 'played',
        wordTower: true,
        connections: true,
      };
      expect(pickPrimaryMode(state)).toBe('word-hunt');
    });
  });

  describe('word hunt played', () => {
    it('prioritizes word-wheel when word-hunt is won and wheel is new', () => {
      const state: DailyModePlayState = {
        wordHunt: 'won',
        wordWheel: 'new',
        wordTower: false,
        connections: false,
      };
      expect(pickPrimaryMode(state)).toBe('word-wheel');
    });

    it('prioritizes word-tower when first two modes done and tower unplayed', () => {
      const state: DailyModePlayState = {
        wordHunt: 'won',
        wordWheel: 'played',
        wordTower: false,
        connections: true,
      };
      expect(pickPrimaryMode(state)).toBe('word-tower');
    });
  });

  describe('all modes played', () => {
    it('returns word-hunt when all modes are completed', () => {
      const state: DailyModePlayState = {
        wordHunt: 'won',
        wordWheel: 'played',
        wordTower: true,
        connections: true,
      };
      expect(pickPrimaryMode(state)).toBe('word-hunt');
    });

    it('prioritizes connections when first three modes played but connections unplayed', () => {
      const state: DailyModePlayState = {
        wordHunt: 'won',
        wordWheel: 'played',
        wordTower: true,
        connections: false,
      };
      expect(pickPrimaryMode(state)).toBe('connections');
    });
  });

  describe('edge cases', () => {
    it('treats word-hunt won and lost differently for priority', () => {
      const stateWon: DailyModePlayState = {
        wordHunt: 'won',
        wordWheel: 'new',
        wordTower: false,
        connections: false,
      };
      const stateLost: DailyModePlayState = {
        wordHunt: 'lost',
        wordWheel: 'new',
        wordTower: false,
        connections: false,
      };
      // Won → prioritize word-wheel (move to next mode)
      expect(pickPrimaryMode(stateWon)).toBe('word-wheel');
      // Lost → prioritize word-hunt (unfinished challenge)
      expect(pickPrimaryMode(stateLost)).toBe('word-hunt');
    });
  });
});

/**
 * Finishing one daily used to dead-end: the terminal screen offered a countdown
 * to TOMORROW, so a player who had just won had no way to discover the other
 * three modes without navigating back to the hub themselves. pickNextUnplayedMode
 * answers "what is there to play right now", excluding the mode just finished.
 */
describe('pickNextUnplayedMode', () => {
  const allNew: DailyModePlayState = {
    wordHunt: 'new',
    wordWheel: 'new',
    wordTower: false,
    connections: false,
  };

  it('suggests the next mode in priority order, never the one just finished', () => {
    expect(pickNextUnplayedMode({ ...allNew, wordHunt: 'won' }, 'word-hunt')).toBe('word-wheel');
  });

  it('skips modes already played today', () => {
    const state: DailyModePlayState = {
      wordHunt: 'won',
      wordWheel: 'played',
      wordTower: true,
      connections: false,
    };
    expect(pickNextUnplayedMode(state, 'word-hunt')).toBe('connections');
  });

  it('returns null when every mode is done, so the caller can say so instead of looping', () => {
    const state: DailyModePlayState = {
      wordHunt: 'won',
      wordWheel: 'played',
      wordTower: true,
      connections: true,
    };
    expect(pickNextUnplayedMode(state, 'word-hunt')).toBeNull();
  });

  it('never suggests the just-finished mode even when it reads as unplayed', () => {
    // A losing Word Hunt run still counts as "played today" for this purpose:
    // re-offering the mode the player just failed is not a next step.
    expect(pickNextUnplayedMode({ ...allNew, wordHunt: 'lost' }, 'word-hunt')).toBe('word-wheel');
  });

  it('works from any finished mode, not just word-hunt', () => {
    const state: DailyModePlayState = {
      wordHunt: 'won',
      wordWheel: 'new',
      wordTower: false,
      connections: false,
    };
    expect(pickNextUnplayedMode(state, 'word-wheel')).toBe('word-tower');
  });
});
