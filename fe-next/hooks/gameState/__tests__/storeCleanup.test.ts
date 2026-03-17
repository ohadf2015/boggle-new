/**
 * Tests for Sprint 3 store cleanup — verifying dead code removal
 * doesn't break remaining store functionality.
 */
import { useGameStore } from '../store';

describe('Store cleanup - dead code removal', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  test('useComboShield action is removed from store', () => {
    const state = useGameStore.getState();
    // After cleanup, useComboShield should not exist on the store
    expect((state as unknown as Record<string, unknown>).useComboShield).toBeUndefined();
  });

  test('batchResetGame action is removed from store', () => {
    const state = useGameStore.getState();
    expect((state as unknown as Record<string, unknown>).batchResetGame).toBeUndefined();
  });

  test('combo actions still work after cleanup', () => {
    const store = useGameStore.getState();
    store.incrementCombo();
    expect(useGameStore.getState().combo.level).toBe(1);
    store.resetCombo();
    expect(useGameStore.getState().combo.level).toBe(0);
  });

  test('resetForNewRound still works (replaces batchResetGame)', () => {
    const store = useGameStore.getState();
    store.setGameActive(true);
    store.incrementCombo();
    store.resetForNewRound();
    expect(useGameStore.getState().gameActive).toBe(false);
    expect(useGameStore.getState().combo.level).toBe(0);
  });
});
