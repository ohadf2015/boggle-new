import { renderHook, act } from '@testing-library/react';
import { useEquippedCosmetic } from '../useEquippedCosmetic';

const EQUIPPED_KEY = 'lexiclash_cosmetics_equipped';

function setEquipped(data: Record<string, string>) {
  localStorage.setItem(EQUIPPED_KEY, JSON.stringify(data));
}

describe('useEquippedCosmetic', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing equipped', () => {
    const { result } = renderHook(() => useEquippedCosmetic('tileSkin'));
    expect(result.current).toBeNull();
  });

  it('returns equipped id for the given category', () => {
    setEquipped({ tileSkin: 'tile-neon', victoryEffect: 'victory-fireworks' });
    const { result } = renderHook(() => useEquippedCosmetic('tileSkin'));
    expect(result.current).toBe('tile-neon');
  });

  it('returns null for a different category when only one is set', () => {
    setEquipped({ tileSkin: 'tile-neon' });
    const { result } = renderHook(() => useEquippedCosmetic('boardTheme'));
    expect(result.current).toBeNull();
  });

  it('updates when storage event fires', () => {
    setEquipped({ victoryEffect: 'victory-confetti' });
    const { result } = renderHook(() => useEquippedCosmetic('victoryEffect'));
    expect(result.current).toBe('victory-confetti');

    act(() => {
      setEquipped({ victoryEffect: 'victory-fireworks' });
      window.dispatchEvent(new StorageEvent('storage', { key: EQUIPPED_KEY }));
    });

    expect(result.current).toBe('victory-fireworks');
  });
});
