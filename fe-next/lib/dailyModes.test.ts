import { describe, it, expect } from 'vitest';
import { pickPrimaryMode, type DailyModePlayState } from './dailyModes';

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
