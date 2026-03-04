/**
 * useBlastComboDiscovery - Tests for combo discovery state management hook.
 * TDD: written before implementation (RED phase).
 */
import { renderHook, act } from '@testing-library/react';
import { useBlastComboDiscovery } from '../useBlastComboDiscovery';
import type { SpecialCombo } from '../../utils/blastCombos';
import type { BlastTileType } from '../../types';

// ---- localStorage mocks ----

let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => mockStorage[key] ?? null,
  );
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => { mockStorage[key] = value; },
  );
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(
    (key: string) => { delete mockStorage[key]; },
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---- Helpers ----

function makeCombo(type: SpecialCombo['type']): SpecialCombo {
  return {
    type,
    tiles: [{ row: 0, col: 0, tileType: 'bomb' as BlastTileType }],
    scoreMultiplier: 3,
    label: `blast.combo.${type}`,
  };
}

// ==================== useBlastComboDiscovery ====================

describe('useBlastComboDiscovery', () => {
  it('starts with no pending discovery', () => {
    const { result } = renderHook(() => useBlastComboDiscovery());
    expect(result.current.pendingDiscovery).toBeNull();
  });

  it('sets pendingDiscovery when a new combo is detected', () => {
    const { result } = renderHook(() => useBlastComboDiscovery());
    act(() => {
      result.current.onComboDetected([makeCombo('bomb_bomb')]);
    });
    expect(result.current.pendingDiscovery).toBe('bomb_bomb');
  });

  it('does NOT set pendingDiscovery for an already-discovered combo', () => {
    const { result } = renderHook(() => useBlastComboDiscovery());
    // Discover once
    act(() => {
      result.current.onComboDetected([makeCombo('bomb_bomb')]);
    });
    // Acknowledge so pendingDiscovery is cleared
    act(() => {
      result.current.acknowledgeDiscovery();
    });
    // Trigger again — should not set pendingDiscovery
    act(() => {
      result.current.onComboDetected([makeCombo('bomb_bomb')]);
    });
    expect(result.current.pendingDiscovery).toBeNull();
  });

  it('acknowledgeDiscovery clears pendingDiscovery to null', () => {
    const { result } = renderHook(() => useBlastComboDiscovery());
    act(() => {
      result.current.onComboDetected([makeCombo('lightning_lightning')]);
    });
    expect(result.current.pendingDiscovery).toBe('lightning_lightning');
    act(() => {
      result.current.acknowledgeDiscovery();
    });
    expect(result.current.pendingDiscovery).toBeNull();
  });

  it('persists discovered combos to localStorage under blast_discovered_combos key', () => {
    const { result } = renderHook(() => useBlastComboDiscovery());
    act(() => {
      result.current.onComboDetected([makeCombo('prism_prism')]);
    });
    const stored = JSON.parse(mockStorage['blast_discovered_combos'] ?? '[]');
    expect(stored).toContain('prism_prism');
  });

  it('initializes discoveredCombos from localStorage if data exists', () => {
    // Pre-populate localStorage with an already-discovered combo
    mockStorage['blast_discovered_combos'] = JSON.stringify(['bomb_bomb']);

    const { result } = renderHook(() => useBlastComboDiscovery());
    // bomb_bomb was previously discovered — should NOT trigger pendingDiscovery
    act(() => {
      result.current.onComboDetected([makeCombo('bomb_bomb')]);
    });
    expect(result.current.pendingDiscovery).toBeNull();
  });

  it('is SSR-safe: does not crash when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });
    expect(() => renderHook(() => useBlastComboDiscovery())).not.toThrow();
  });

  it('picks only the first undiscovered combo when multiple combos fire at once', () => {
    const { result } = renderHook(() => useBlastComboDiscovery());
    act(() => {
      result.current.onComboDetected([
        makeCombo('bomb_bomb'),
        makeCombo('lightning_lightning'),
      ]);
    });
    // Only the first undiscovered combo becomes pendingDiscovery
    expect(result.current.pendingDiscovery).toBe('bomb_bomb');
  });

  it('adds combo to discoveredCombos set after detection', () => {
    const { result } = renderHook(() => useBlastComboDiscovery());
    act(() => {
      result.current.onComboDetected([makeCombo('gold_special')]);
    });
    expect(result.current.discoveredCombos.has('gold_special')).toBe(true);
  });
});
