import { getCardOrder } from '../LandingChallengeCards';
import type { GameModeStats } from '@/lib/landing/fetchGameModeStats';

describe('getCardOrder', () => {
  it('returns default order when no stats provided', () => {
    expect(getCardOrder()).toEqual(['daily', 'multiplayer', 'singleplayer', 'adventure']);
    expect(getCardOrder(undefined)).toEqual(['daily', 'multiplayer', 'singleplayer', 'adventure']);
    expect(getCardOrder([])).toEqual(['daily', 'multiplayer', 'singleplayer', 'adventure']);
  });

  it('returns default order when all counts are zero', () => {
    const stats: GameModeStats[] = [
      { mode: 'singleplayer', playCount: 0 },
      { mode: 'multiplayer', playCount: 0 },
      { mode: 'daily', playCount: 0 },
      { mode: 'adventure', playCount: 0 },
      { mode: 'blast', playCount: 0 },
    ];
    expect(getCardOrder(stats)).toEqual(['daily', 'multiplayer', 'singleplayer', 'adventure']);
  });

  it('pins daily and multiplayer first, reorders rest by popularity', () => {
    const stats: GameModeStats[] = [
      { mode: 'adventure', playCount: 500 },
      { mode: 'daily', playCount: 300 },
      { mode: 'multiplayer', playCount: 200 },
      { mode: 'singleplayer', playCount: 100 },
      { mode: 'blast', playCount: 50 },
    ];
    // daily + multiplayer pinned first, then adventure > singleplayer by popularity
    expect(getCardOrder(stats)).toEqual(['daily', 'multiplayer', 'adventure', 'singleplayer']);
  });

  it('excludes blast from card order (shown separately)', () => {
    const stats: GameModeStats[] = [
      { mode: 'blast', playCount: 9999 },
      { mode: 'daily', playCount: 100 },
      { mode: 'multiplayer', playCount: 50 },
      { mode: 'adventure', playCount: 25 },
      { mode: 'singleplayer', playCount: 10 },
    ];
    const order = getCardOrder(stats);
    expect(order).not.toContain('blast');
    expect(order).toEqual(['daily', 'multiplayer', 'adventure', 'singleplayer']);
  });

  it('fills in missing modes from default order', () => {
    const stats: GameModeStats[] = [
      { mode: 'daily', playCount: 100 },
      { mode: 'multiplayer', playCount: 50 },
    ];
    const order = getCardOrder(stats);
    expect(order).toHaveLength(4);
    expect(order[0]).toBe('daily');
    expect(order[1]).toBe('multiplayer');
    expect(order).toContain('singleplayer');
    expect(order).toContain('adventure');
  });

  it('pins daily+multiplayer even when other modes have more plays', () => {
    const stats: GameModeStats[] = [
      { mode: 'adventure', playCount: 999 },
      { mode: 'singleplayer', playCount: 500 },
      { mode: 'multiplayer', playCount: 2 },
      { mode: 'daily', playCount: 1 },
      { mode: 'blast', playCount: 0 },
    ];
    const order = getCardOrder(stats);
    expect(order[0]).toBe('daily');
    expect(order[1]).toBe('multiplayer');
    expect(order[2]).toBe('adventure'); // most popular non-pinned
    expect(order).toHaveLength(4);
  });
});
