/**
 * useBlastComboDiscovery - Tests for combo discovery state management hook.
 * TDD: written before implementation (RED phase).
 */
import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBlastComboDiscovery } from '../useBlastComboDiscovery';
import type { SpecialCombo } from '../../utils/blastCombos';
import type { BlastTileType } from '../../types';

// ---- localStorage mocks ----
// vitest.setup.ts replaces global.localStorage with a plain object of vi.fn() stubs,
// so Storage.prototype spying doesn't work. Instead, give the stubs real backing storage.

let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};
  (localStorage.getItem as any).mockImplementation(
    (key: string) => mockStorage[key] ?? null,
  );
  (localStorage.setItem as any).mockImplementation(
    (key: string, value: string) => { mockStorage[key] = value; },
  );
  (localStorage.removeItem as any).mockImplementation(
    (key: string) => { delete mockStorage[key]; },
  );

  // Reset fetch mock each test
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
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

function mockFetchSuccess(responseData: Record<string, unknown>) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(responseData),
  });
}

function mockFetchFailure() {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
}

// ==================== useBlastComboDiscovery (existing tests) ====================

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
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
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

// ==================== Supabase sync (new tests - Task 2) ====================

describe('useBlastComboDiscovery — Supabase sync', () => {
  describe('Discovery POST (fire-and-forget)', () => {
    it('calls POST /api/blast/combo-codex when authenticated and a new combo is discovered', async () => {
      mockFetchSuccess({ discoveredCombos: ['bomb_bomb'] });

      const { result } = renderHook(() =>
        useBlastComboDiscovery({ userId: 'user-123' }),
      );

      await act(async () => {
        result.current.onComboDetected([makeCombo('bomb_bomb')]);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/blast/combo-codex',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('does NOT call fetch when userId is undefined (unauthenticated)', async () => {
      global.fetch = vi.fn();

      const { result } = renderHook(() => useBlastComboDiscovery());

      await act(async () => {
        result.current.onComboDetected([makeCombo('bomb_bomb')]);
      });

      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/blast/combo-codex',
        expect.anything(),
      );
    });

    it('does NOT call POST for already-discovered combos (no new discovery)', async () => {
      mockStorage['blast_discovered_combos'] = JSON.stringify(['bomb_bomb']);
      // Use mockFetchSuccess so the GET on mount resolves without crashing
      mockFetchSuccess({ discoveredCombos: ['bomb_bomb'] });

      const { result } = renderHook(() =>
        useBlastComboDiscovery({ userId: 'user-123' }),
      );

      // Wait for the mount GET to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      // Reset call count after init GET
      (global.fetch as any).mockClear();

      await act(async () => {
        result.current.onComboDetected([makeCombo('bomb_bomb')]);
      });

      // No POST should be made for already-known combos
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/blast/combo-codex',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('API POST failure is non-fatal — localStorage already has the data', async () => {
      mockFetchFailure();

      const { result } = renderHook(() =>
        useBlastComboDiscovery({ userId: 'user-123' }),
      );

      // Should not throw
      await act(async () => {
        result.current.onComboDetected([makeCombo('bomb_bomb')]);
      });

      // localStorage should still have the data
      const stored = JSON.parse(mockStorage['blast_discovered_combos'] ?? '[]');
      expect(stored).toContain('bomb_bomb');
      // State should still be updated
      expect(result.current.discoveredCombos.has('bomb_bomb')).toBe(true);
    });
  });

  describe('Init GET merge (merge on load)', () => {
    it('calls GET /api/blast/combo-codex on mount when authenticated', async () => {
      mockFetchSuccess({ discoveredCombos: ['bomb_bomb', 'prism_prism'] });

      renderHook(() => useBlastComboDiscovery({ userId: 'user-123' }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/blast/combo-codex');
      });
    });

    it('does NOT call GET on mount when unauthenticated', async () => {
      global.fetch = vi.fn();

      renderHook(() => useBlastComboDiscovery());

      // Wait a tick
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('merges server data with localStorage on load (union)', async () => {
      // localStorage has bomb_bomb
      mockStorage['blast_discovered_combos'] = JSON.stringify(['bomb_bomb']);

      // Server has prism_prism (different combo)
      mockFetchSuccess({ discoveredCombos: ['prism_prism'] });

      const { result } = renderHook(() =>
        useBlastComboDiscovery({ userId: 'user-123' }),
      );

      await waitFor(() => {
        expect(result.current.discoveredCombos.has('prism_prism')).toBe(true);
      });

      // Both should be present after merge
      expect(result.current.discoveredCombos.has('bomb_bomb')).toBe(true);
      expect(result.current.discoveredCombos.has('prism_prism')).toBe(true);
    });

    it('writes merged result back to localStorage', async () => {
      mockStorage['blast_discovered_combos'] = JSON.stringify(['bomb_bomb']);
      mockFetchSuccess({ discoveredCombos: ['prism_prism'] });

      renderHook(() => useBlastComboDiscovery({ userId: 'user-123' }));

      await waitFor(() => {
        const stored = JSON.parse(mockStorage['blast_discovered_combos'] ?? '[]');
        return stored.includes('prism_prism');
      });

      const stored = JSON.parse(mockStorage['blast_discovered_combos'] ?? '[]');
      expect(stored).toContain('bomb_bomb');
      expect(stored).toContain('prism_prism');
    });

    it('API GET failure falls back to localStorage only (no crash)', async () => {
      mockStorage['blast_discovered_combos'] = JSON.stringify(['bomb_bomb']);
      mockFetchFailure();

      const { result } = renderHook(() =>
        useBlastComboDiscovery({ userId: 'user-123' }),
      );

      // Wait a tick for the effect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should still have localStorage data
      expect(result.current.discoveredCombos.has('bomb_bomb')).toBe(true);
    });
  });

  describe('Backward compatibility', () => {
    it('calling useBlastComboDiscovery() with no args still works (unauthenticated path)', () => {
      const { result } = renderHook(() => useBlastComboDiscovery());
      expect(result.current.pendingDiscovery).toBeNull();
      expect(result.current.discoveredCombos).toBeDefined();
      expect(typeof result.current.onComboDetected).toBe('function');
      expect(typeof result.current.acknowledgeDiscovery).toBe('function');
    });
  });
});
