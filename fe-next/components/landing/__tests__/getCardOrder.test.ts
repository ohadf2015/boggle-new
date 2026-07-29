import { getCardOrder, type GameModeStats } from '@/lib/landing/fetchGameModeStats';

describe('getCardOrder', () => {
  it('returns default order when no stats provided (blast bumped up, under arena)', () => {
    expect(getCardOrder()).toEqual(['daily', 'arena', 'blast', 'practice', 'adventure']);
    expect(getCardOrder(undefined)).toEqual(['daily', 'arena', 'blast', 'practice', 'adventure']);
    expect(getCardOrder([])).toEqual(['daily', 'arena', 'blast', 'practice', 'adventure']);
  });

  it('returns default order when all counts are zero', () => {
    const stats: GameModeStats[] = [
      { mode: 'practice', playCount: 0 },
      { mode: 'arena', playCount: 0 },
      { mode: 'daily', playCount: 0 },
      { mode: 'adventure', playCount: 0 },
      { mode: 'blast', playCount: 0 },
    ];
    expect(getCardOrder(stats)).toEqual(['daily', 'arena', 'blast', 'practice', 'adventure']);
  });

  it('pins daily and arena first, reorders rest by popularity', () => {
    const stats: GameModeStats[] = [
      { mode: 'adventure', playCount: 500 },
      { mode: 'daily', playCount: 300 },
      { mode: 'arena', playCount: 200 },
      { mode: 'practice', playCount: 100 },
      { mode: 'blast', playCount: 50 },
    ];
    // daily + arena pinned first, then adventure > practice > blast by popularity
    expect(getCardOrder(stats)).toEqual(['daily', 'arena', 'adventure', 'practice', 'blast']);
  });

  it('includes blast in card order sorted by popularity', () => {
    const stats: GameModeStats[] = [
      { mode: 'blast', playCount: 9999 },
      { mode: 'daily', playCount: 100 },
      { mode: 'arena', playCount: 50 },
      { mode: 'adventure', playCount: 25 },
      { mode: 'practice', playCount: 10 },
    ];
    const order = getCardOrder(stats);
    expect(order).toContain('blast');
    // blast is most popular non-pinned, so it comes right after daily+arena
    expect(order[0]).toBe('daily');
    expect(order[1]).toBe('arena');
    expect(order[2]).toBe('blast');
  });

  it('fills in missing modes from default order', () => {
    const stats: GameModeStats[] = [
      { mode: 'daily', playCount: 100 },
      { mode: 'arena', playCount: 50 },
    ];
    const order = getCardOrder(stats);
    expect(order).toHaveLength(5);
    expect(order[0]).toBe('daily');
    expect(order[1]).toBe('arena');
    expect(order).toContain('practice');
    expect(order).toContain('adventure');
    expect(order).toContain('blast');
  });

  it('pins daily+arena even when other modes have more plays', () => {
    const stats: GameModeStats[] = [
      { mode: 'adventure', playCount: 999 },
      { mode: 'practice', playCount: 500 },
      { mode: 'arena', playCount: 2 },
      { mode: 'daily', playCount: 1 },
      { mode: 'blast', playCount: 0 },
    ];
    const order = getCardOrder(stats);
    expect(order[0]).toBe('daily');
    expect(order[1]).toBe('arena');
    expect(order[2]).toBe('adventure'); // most popular non-pinned
    expect(order).toHaveLength(5);
  });
});
