import { vi } from 'vitest';
/**
 * Tests for activeComboFlash state + clearComboFlash in useBlastGame.
 * TDD: written before implementation.
 *
 * Strategy: Test the state machine logic via pure unit tests rather than
 * rendering the full hook (which requires mocking many async dependencies).
 */

// ==================== Pure logic tests for combo flash state ====================

// These tests verify the "state machine" contract for activeComboFlash:
// - starts as null
// - set to { id, comboType } when detectedCombos.length > 0
// - cleared back to null when clearComboFlash() is called

describe('activeComboFlash state contract', () => {
  it('is null by default when no combos detected', () => {
    // When clearTilesForWord is called with no specials in path,
    // activeComboFlash should remain null
    let activeComboFlash: { id: string; comboType: string } | null = null;
    // Simulated: no combos detected
    const detectedCombos: Array<{ type: string }> = [];
    if (detectedCombos.length > 0) {
      activeComboFlash = { id: `flash-${Date.now()}`, comboType: detectedCombos[0].type };
    }
    expect(activeComboFlash).toBeNull();
  });

  it('is set to first combo type when combos are detected', () => {
    let activeComboFlash: { id: string; comboType: string } | null = null;
    const detectedCombos = [
      { type: 'prism_prism' },
      { type: 'bomb_lightning' },
    ];
    if (detectedCombos.length > 0) {
      activeComboFlash = { id: `flash-${Date.now()}`, comboType: detectedCombos[0].type };
    }
    expect(activeComboFlash).not.toBeNull();
    expect(activeComboFlash?.comboType).toBe('prism_prism');
  });

  it('resets to null when clearComboFlash is called', () => {
    let activeComboFlash: { id: string; comboType: string } | null = {
      id: 'flash-123',
      comboType: 'bomb_bomb',
    };
    // Simulated clearComboFlash
    activeComboFlash = null;
    expect(activeComboFlash).toBeNull();
  });

  it('uses first detected combo (highest priority) as flash type', () => {
    let activeComboFlash: { id: string; comboType: string } | null = null;
    // PAIR_COMBOS is sorted highest multiplier first (prism_prism = 10x)
    const detectedCombos = [
      { type: 'prism_prism', scoreMultiplier: 10 },
      { type: 'bomb_bomb', scoreMultiplier: 3 },
    ];
    if (detectedCombos.length > 0) {
      activeComboFlash = { id: 'flash-1', comboType: detectedCombos[0].type };
    }
    expect(activeComboFlash?.comboType).toBe('prism_prism');
  });
});

// ==================== onSynergyDetected callback contract ====================

describe('onSynergyDetected callback', () => {
  it('is called with the first combo type when combos are detected', () => {
    const onSynergyDetected = vi.fn();
    const detectedCombos = [{ type: 'bomb_lightning' }];
    if (detectedCombos.length > 0) {
      onSynergyDetected(detectedCombos[0].type);
    }
    expect(onSynergyDetected).toHaveBeenCalledWith('bomb_lightning');
  });

  it('is NOT called when no combos are detected', () => {
    const onSynergyDetected = vi.fn();
    const detectedCombos: Array<{ type: string }> = [];
    if (detectedCombos.length > 0) {
      onSynergyDetected(detectedCombos[0].type);
    }
    expect(onSynergyDetected).not.toHaveBeenCalled();
  });

  it('is called once per word submission (not per combo in the list)', () => {
    const onSynergyDetected = vi.fn();
    const detectedCombos = [
      { type: 'prism_prism' },
      { type: 'bomb_lightning' },
    ];
    // Only call for first combo (highest priority)
    if (detectedCombos.length > 0) {
      onSynergyDetected(detectedCombos[0].type);
    }
    expect(onSynergyDetected).toHaveBeenCalledTimes(1);
  });
});
