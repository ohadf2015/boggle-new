import { describe, it, expect, vi, beforeEach } from 'vitest';

const sync = vi.fn();
vi.mock('@/hooks/useCosmetics', () => ({
  EQUIPPED_KEY: 'lexiclash_cosmetics_equipped',
  PURCHASED_KEY: 'lexiclash_cosmetics_purchased',
  syncCosmeticsToSupabase: (...a: unknown[]) => sync(...a),
}));

import { equipWorldSkin, equippedWorld } from '../equipWorldSkin';

describe('equipWorldSkin', () => {
  beforeEach(() => {
    localStorage.clear();
    sync.mockReset();
  });

  it('given other equipped cosmetics, when a world skin is equipped, then only tileSkin changes locally and in the profile', () => {
    localStorage.setItem('lexiclash_cosmetics_equipped', JSON.stringify({ boardTheme: 'board-x', tileSkin: 'tile-neon' }));
    localStorage.setItem('lexiclash_cosmetics_purchased', JSON.stringify(['p1']));
    const heard = vi.fn();
    window.addEventListener('storage', heard);

    equipWorldSkin(4, 'user-1');

    expect(JSON.parse(localStorage.getItem('lexiclash_cosmetics_equipped')!)).toEqual({ boardTheme: 'board-x', tileSkin: 'tile-world-4' });
    expect(sync).toHaveBeenCalledWith('user-1', { boardTheme: 'board-x', tileSkin: 'tile-world-4' }, ['p1']);
    expect(heard).toHaveBeenCalled();
    expect(equippedWorld()).toBe(4);
    window.removeEventListener('storage', heard);
  });

  it('given a guest, when equipped, then nothing is synced to a profile', () => {
    equipWorldSkin(2, null);
    expect(sync).not.toHaveBeenCalled();
    expect(equippedWorld()).toBe(2);
  });
});
