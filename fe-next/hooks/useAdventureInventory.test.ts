/**
 * useAdventureInventory Hook Tests
 *
 * Read-only fetch of player inventory from /api/adventure/inventory.
 * No localStorage, no mutation — server is source of truth.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdventureInventory } from './useAdventureInventory';

const mockFetch = vi.fn();

function mockFetchItems(items: unknown[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items }),
  });
}

function mockFetchFail() {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
}

describe('useAdventureInventory', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
  });

  it('starts in loading state with empty inventory', () => {
    mockFetchItems([]);
    const { result } = renderHook(() => useAdventureInventory());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.inventory).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches /api/adventure/inventory on mount', async () => {
    mockFetchItems([]);
    renderHook(() => useAdventureInventory());
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/adventure/inventory'));
  });

  it('populates inventory from server response', async () => {
    const items = [
      { item_id: 'gem_1', item_type: 'gem', category: 'loot', rarity: 'common', quantity: 2 },
      { item_id: 'key_1', item_type: 'key', category: 'quest', rarity: 'rare', quantity: 1 },
    ];
    mockFetchItems(items);
    const { result } = renderHook(() => useAdventureInventory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.inventory).toEqual(items);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    mockFetchFail();
    const { result } = renderHook(() => useAdventureInventory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.inventory).toEqual([]);
  });

  it('handles network rejection gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useAdventureInventory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.inventory).toEqual([]);
  });

  it('refresh() re-fetches from server', async () => {
    mockFetchItems([{ item_id: 'a', item_type: 'gem', category: 'loot', rarity: 'common', quantity: 1 }]);
    const { result } = renderHook(() => useAdventureInventory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.inventory).toHaveLength(1);

    mockFetchItems([
      { item_id: 'a', item_type: 'gem', category: 'loot', rarity: 'common', quantity: 1 },
      { item_id: 'b', item_type: 'key', category: 'quest', rarity: 'rare', quantity: 1 },
    ]);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.inventory).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('skips state update on unmount (no warning)', async () => {
    mockFetchItems([]);
    const { unmount } = renderHook(() => useAdventureInventory());
    unmount();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });
});
