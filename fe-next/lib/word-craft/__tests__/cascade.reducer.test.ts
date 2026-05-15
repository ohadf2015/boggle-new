import { describe, it, expect } from 'vitest';
import {
  buildInitialCascadeRunState,
  cascadeRunReducer,
  type CascadeRunOptions,
} from '../cascade/cascadeRunReducer';
import { setCellLetter, cellAt } from '../cascade/boardGrid';
import type { PowerCard } from '../run/powerCards';

const make = (
  overrides: Partial<CascadeRunOptions> = {},
  isWord: (w: string) => boolean = (w) => ['STAR', 'STARE', 'TEAR'].includes(w),
) => {
  const opts: CascadeRunOptions = {
    seed: 42,
    locale: 'en',
    boardSize: 7,
    isWord,
    ...overrides,
  };
  return { state: buildInitialCascadeRunState(opts), deps: { isWord } };
};

describe('cascade/cascadeRunReducer', () => {
  describe('buildInitialCascadeRunState', () => {
    it('starts in intro phase with a filled grid and fresh fire state', () => {
      const { state } = make();
      expect(state.phase).toBe('intro');
      expect(state.grid.cells.length).toBe(49);
      expect(state.fire.fireRow).toBe(0);
      expect(state.runTotal).toBe(0);
      expect(state.round.round).toBe(1);
    });
  });

  describe('START_RUN', () => {
    it('transitions intro → playing', () => {
      const { state, deps } = make();
      const next = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      expect(next.phase).toBe('playing');
    });
  });

  describe('SUBMIT_PATH', () => {
    it('rejects an invalid word', () => {
      const { state, deps } = make();
      const playing = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      // Plant ZZZZ in row 0
      for (let c = 0; c < 4; c++) setCellLetter(playing.grid, 0, c, 'Z', 1);
      const path = [0, 1, 2, 3].map((c) => cellAt(playing.grid, 0, c)!.id);
      const next = cascadeRunReducer(playing, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.lastError).toBe('INVALID_WORD');
      expect(next.round.score).toBe(0);
    });

    it('rejects an invalid swipe path', () => {
      const { state, deps } = make();
      const playing = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      const a = cellAt(playing.grid, 0, 0)!.id;
      const b = cellAt(playing.grid, 0, 2)!.id; // not adjacent
      const next = cascadeRunReducer(
        playing,
        { type: 'SUBMIT_PATH', path: [a, b] },
        deps,
      );
      expect(next.lastError).toBe('TOO_SHORT');
    });

    it('accepts a valid word, scores it, burns + gravity, increments round.score', () => {
      const { state, deps } = make();
      const playing = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      // Plant STAR in row 0
      const letters = ['S', 'T', 'A', 'R'];
      for (let c = 0; c < 4; c++) setCellLetter(playing.grid, 0, c, letters[c], 1);
      const path = [0, 1, 2, 3].map((c) => cellAt(playing.grid, 0, c)!.id);
      const next = cascadeRunReducer(playing, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.lastError).toBeNull();
      expect(next.lastSubmit?.word).toBe('STAR');
      expect(next.round.score).toBeGreaterThan(0);
      // After gravity, the original row 0 positions should be filled (non-null)
      for (let c = 0; c < 4; c++) {
        expect(cellAt(next.grid, 0, c)!.letter).not.toBeNull();
      }
    });

    it('long word (≥6) pushes fire down', () => {
      const { state, deps } = make({}, (w) => w === 'LETTERS');
      const playing0 = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      // Force fire up by 3 first
      const playing = { ...playing0, fire: { ...playing0.fire, fireRow: 3 } };
      const word = 'LETTERS';
      for (let c = 0; c < word.length; c++) setCellLetter(playing.grid, 0, c, word[c], 1);
      const path = Array.from({ length: word.length }, (_, c) => cellAt(playing.grid, 0, c)!.id);
      const next = cascadeRunReducer(playing, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.fire.fireRow).toBeLessThan(3);
    });
  });

  describe('FIRE_TICK', () => {
    it('rises the fire when enough delta accumulates', () => {
      const { state, deps } = make();
      const playing = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      const next = cascadeRunReducer(playing, { type: 'FIRE_TICK', deltaMs: 13_000 }, deps);
      expect(next.fire.fireRow).toBe(1);
    });

    it('triggers game-over forcing roundResult when fire reaches top', () => {
      const { state, deps } = make();
      const playing = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      const huge = { ...playing, fire: { ...playing.fire, fireRow: playing.fire.totalRows - 1 } };
      const next = cascadeRunReducer(huge, { type: 'FIRE_TICK', deltaMs: 99_999 }, deps);
      expect(next.phase).toBe('roundResult');
      expect(next.roundPassed).toBe(false);
    });

    it('does nothing if not playing', () => {
      const { state, deps } = make();
      const next = cascadeRunReducer(state, { type: 'FIRE_TICK', deltaMs: 99_999 }, deps);
      expect(next.phase).toBe('intro');
    });
  });

  describe('END_ROUND', () => {
    it('marks roundPassed when score ≥ target and accumulates runTotal', () => {
      const { state, deps } = make();
      const playing = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      const win = { ...playing, round: { ...playing.round, score: playing.round.target + 5 } };
      const next = cascadeRunReducer(win, { type: 'END_ROUND' }, deps);
      expect(next.phase).toBe('roundResult');
      expect(next.roundPassed).toBe(true);
      expect(next.runTotal).toBe(win.round.score);
    });

    it('marks roundPassed=false when score < target and does not accumulate', () => {
      const { state, deps } = make();
      const playing = cascadeRunReducer(state, { type: 'START_RUN' }, deps);
      const next = cascadeRunReducer(playing, { type: 'END_ROUND' }, deps);
      expect(next.phase).toBe('roundResult');
      expect(next.roundPassed).toBe(false);
      expect(next.runTotal).toBe(0);
    });
  });

  describe('PROCEED', () => {
    it('passed + not final round → cardPick with 3 choices', () => {
      const { state, deps } = make();
      const win = { ...state, phase: 'roundResult' as const, roundPassed: true };
      const next = cascadeRunReducer(win, { type: 'PROCEED' }, deps);
      expect(next.phase).toBe('cardPick');
      expect(next.cardChoice).toHaveLength(3);
    });

    it('failed → runResult cleared=false', () => {
      const { state, deps } = make();
      const lose = { ...state, phase: 'roundResult' as const, roundPassed: false };
      const next = cascadeRunReducer(lose, { type: 'PROCEED' }, deps);
      expect(next.phase).toBe('runResult');
      expect(next.cleared).toBe(false);
    });

    it('passed final round → runResult cleared=true', () => {
      const { state, deps } = make();
      const win = {
        ...state,
        phase: 'roundResult' as const,
        roundPassed: true,
        round: { ...state.round, round: 5 },
      };
      const next = cascadeRunReducer(win, { type: 'PROCEED' }, deps);
      expect(next.phase).toBe('runResult');
      expect(next.cleared).toBe(true);
    });
  });

  describe('PICK_CARD', () => {
    it('appends to activeCards and starts a fresh next round', () => {
      const { state, deps } = make();
      const card: PowerCard = { id: 'longGame', rarity: 'common' };
      const cardPick = {
        ...state,
        phase: 'cardPick' as const,
        cardChoice: [card],
        round: { ...state.round, round: 1 },
      };
      const next = cascadeRunReducer(cardPick, { type: 'PICK_CARD', cardId: 'longGame' }, deps);
      expect(next.phase).toBe('playing');
      expect(next.round.round).toBe(2);
      expect(next.activeCards.map((c) => c.id)).toContain('longGame');
      // Fire state reset
      expect(next.fire.fireRow).toBe(0);
    });
  });

  describe('RESTART', () => {
    it('rebuilds a fresh intro state', () => {
      const { state, deps } = make();
      const dirty = { ...state, phase: 'runResult' as const, runTotal: 999 };
      const next = cascadeRunReducer(dirty, { type: 'RESTART' }, deps);
      expect(next.phase).toBe('intro');
      expect(next.runTotal).toBe(0);
    });
  });

  describe('CLEAR_ERROR', () => {
    it('resets lastError to null', () => {
      const { state, deps } = make();
      const next = cascadeRunReducer(
        { ...state, lastError: 'oops' },
        { type: 'CLEAR_ERROR' },
        deps,
      );
      expect(next.lastError).toBeNull();
    });
  });
});
