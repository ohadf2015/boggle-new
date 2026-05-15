import { describe, it, expect } from 'vitest';
import {
  buildInitialCascadeRunState,
  cascadeRunReducer,
} from '../cascade/cascadeRunReducer';
import { setCellLetter, cellAt } from '../cascade/boardGrid';
import {
  CASCADE_POWER_CARD_POOL,
  CASCADE_NATIVE_CARDS,
  drawCascadeCardChoices,
} from '../cascade/cascadeCards';

const isWord = (w: string) =>
  ['STAR', 'STARE', 'TEAR', 'LETTERS', 'CARS', 'CART'].includes(w);

const fresh = (cards: string[] = []) => {
  const state0 = buildInitialCascadeRunState({
    seed: 7,
    locale: 'en',
    boardSize: 7,
    isWord,
  });
  const state = cascadeRunReducer(state0, { type: 'START_RUN' }, { isWord });
  const active = cards.map((id) => CASCADE_NATIVE_CARDS.find((c) => c.id === id)!);
  return { state: { ...state, activeCards: active }, deps: { isWord } };
};

const plant = (state: ReturnType<typeof fresh>['state'], row: number, word: string) => {
  for (let c = 0; c < word.length; c++) setCellLetter(state.grid, row, c, word[c], 1);
  return Array.from({ length: word.length }, (_, c) => cellAt(state.grid, row, c)!.id);
};

describe('cascade/cascadeCards', () => {
  describe('pool composition', () => {
    it('includes the 6 cascade-native cards', () => {
      const ids = CASCADE_NATIVE_CARDS.map((c) => c.id).sort();
      expect(ids).toEqual(
        ['diagonal', 'echo', 'emberBoost', 'frost', 'pyro', 'staticSpark'].sort(),
      );
    });

    it('excludes rack-only cards', () => {
      const ids = CASCADE_POWER_CARD_POOL.map((c) => c.id);
      expect(ids).not.toContain('wildcardStash');
      expect(ids).not.toContain('quickHands');
      expect(ids).not.toContain('letterHoard');
      expect(ids).not.toContain('premiumHunter');
    });

    it('includes the 6 native cards in the pool', () => {
      const ids = CASCADE_POWER_CARD_POOL.map((c) => c.id);
      for (const native of ['pyro', 'frost', 'diagonal', 'echo', 'emberBoost', 'staticSpark']) {
        expect(ids).toContain(native);
      }
    });
  });

  describe('drawCascadeCardChoices', () => {
    it('returns n unique cards from the pool', () => {
      const choices = drawCascadeCardChoices(42, [], 3);
      expect(choices).toHaveLength(3);
      const ids = choices.map((c) => c.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('excludes owned ids', () => {
      const ownedIds = CASCADE_POWER_CARD_POOL.slice(0, 5).map((c) => c.id);
      const choices = drawCascadeCardChoices(42, ownedIds, 3);
      for (const c of choices) expect(ownedIds).not.toContain(c.id);
    });
  });

  describe('Pyro', () => {
    it('burns 1 extra random tile on word ≥5', () => {
      const { state, deps } = fresh(['pyro']);
      const path = plant(state, 0, 'STARE');
      const before = state.grid.cells.filter((c) => c.letter !== null).length;
      const next = cascadeRunReducer(state, { type: 'SUBMIT_PATH', path }, deps);
      // After: 5 path tiles burned + 1 pyro tile, then gravity refills. Final
      // cell count is preserved (grid is full), but lastSubmit must reflect 6 burned ids.
      expect(next.lastSubmit?.burnedCellIds.length).toBe(6);
      expect(before).toBeGreaterThan(0);
    });

    it('does NOT burn extra tile on word <5', () => {
      const { state, deps } = fresh(['pyro']);
      const path = plant(state, 0, 'STAR');
      const next = cascadeRunReducer(state, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.lastSubmit?.burnedCellIds.length).toBe(4);
    });
  });

  describe('Frost', () => {
    it('pauses fire on word ≥6', () => {
      const { state, deps } = fresh(['frost']);
      const path = plant(state, 0, 'LETTERS');
      const next = cascadeRunReducer(state, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.fire.frozenUntilMs).toBeGreaterThan(0);
    });

    it('does NOT pause fire on word <6', () => {
      const { state, deps } = fresh(['frost']);
      const path = plant(state, 0, 'STAR');
      const next = cascadeRunReducer(state, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.fire.frozenUntilMs).toBe(0);
    });
  });

  describe('Diagonal', () => {
    it('accepts a diagonal-only path when Diagonal card active', () => {
      const { state, deps } = fresh(['diagonal']);
      // Plant a diagonal C-A-R-T
      setCellLetter(state.grid, 0, 0, 'C', 1);
      setCellLetter(state.grid, 1, 1, 'A', 1);
      setCellLetter(state.grid, 2, 2, 'R', 1);
      setCellLetter(state.grid, 3, 3, 'T', 1);
      const path = [
        cellAt(state.grid, 0, 0)!.id,
        cellAt(state.grid, 1, 1)!.id,
        cellAt(state.grid, 2, 2)!.id,
        cellAt(state.grid, 3, 3)!.id,
      ];
      const next = cascadeRunReducer(state, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.lastError).toBeNull();
      expect(next.lastSubmit?.word).toBe('CART');
    });

    it('rejects diagonal path when card is NOT active', () => {
      const { state, deps } = fresh([]);
      setCellLetter(state.grid, 0, 0, 'C', 1);
      setCellLetter(state.grid, 1, 1, 'A', 1);
      setCellLetter(state.grid, 2, 2, 'R', 1);
      setCellLetter(state.grid, 3, 3, 'T', 1);
      const path = [
        cellAt(state.grid, 0, 0)!.id,
        cellAt(state.grid, 1, 1)!.id,
        cellAt(state.grid, 2, 2)!.id,
        cellAt(state.grid, 3, 3)!.id,
      ];
      const next = cascadeRunReducer(state, { type: 'SUBMIT_PATH', path }, deps);
      expect(next.lastError).toBe('NOT_CONTIGUOUS');
    });
  });

  describe('Ember Boost', () => {
    it('does NOT boost score when fire is below halfway', () => {
      const { state, deps } = fresh([]);
      const { state: stateE, deps: depsE } = fresh(['emberBoost']);
      const plain = cascadeRunReducer(
        state,
        { type: 'SUBMIT_PATH', path: plant(state, 0, 'STAR') },
        deps,
      );
      const boosted = cascadeRunReducer(
        stateE,
        { type: 'SUBMIT_PATH', path: plant(stateE, 0, 'STAR') },
        depsE,
      );
      expect(boosted.lastSubmit?.baseScore).toBe(plain.lastSubmit?.baseScore);
    });

    it('doubles baseMult when fire is at half or higher', () => {
      const { state, deps } = fresh(['emberBoost']);
      const fireUp = { ...state, fire: { ...state.fire, fireRow: 4 } }; // ≥ totalRows/2 (7/2=3.5)
      const path = plant(fireUp, 0, 'STAR');
      const next = cascadeRunReducer(fireUp, { type: 'SUBMIT_PATH', path }, deps);
      // Plain STAR: 4 chips × 1.2 = 4.8 → 4
      // Boosted: 4 chips × (1.2*2) = 9.6 → 9
      expect(next.lastSubmit?.baseScore).toBe(9);
    });
  });

  describe('staticSpark', () => {
    it('adds 5 chips to every word', () => {
      const { state: plain, deps: depsPlain } = fresh([]);
      const { state: charged, deps: depsCharged } = fresh(['staticSpark']);
      const a = cascadeRunReducer(
        plain,
        { type: 'SUBMIT_PATH', path: plant(plain, 0, 'STAR') },
        depsPlain,
      );
      const b = cascadeRunReducer(
        charged,
        { type: 'SUBMIT_PATH', path: plant(charged, 0, 'STAR') },
        depsCharged,
      );
      expect(b.lastSubmit!.baseScore).toBeGreaterThan(a.lastSubmit!.baseScore);
    });
  });
});
