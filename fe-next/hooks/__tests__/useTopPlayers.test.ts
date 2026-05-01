import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

function setupChain(data: unknown, error: unknown = null) {
  const limit = vi.fn().mockResolvedValue({ data, error });
  const order = vi.fn().mockReturnValue({ limit });
  const gt = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ gt });
  const select = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ select });
  return { select, eq, gt, order, limit };
}

describe('useTopPlayers', () => {
  it('filters leaderboard by current season returned from get_current_season_id', async () => {
    mockRpc.mockResolvedValue({ data: 2, error: null });
    const chain = setupChain([
      {
        player_id: 'p1',
        username: 'Fish',
        display_name: 'Fish',
        total_score: 1000,
        avatar_image: null,
        avatar_config: { hair: 'bun' },
        profiles: { prestige_level: 3 },
      },
    ]);

    const { useTopPlayers } = await import('../useTopPlayers');
    const { result } = renderHook(() => useTopPlayers(5));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockRpc).toHaveBeenCalledWith('get_current_season_id');
    expect(chain.eq).toHaveBeenCalledWith('season_id', 2);
    expect(chain.gt).toHaveBeenCalledWith('total_score', 0);
    expect(result.current.players).toHaveLength(1);
    expect(result.current.players[0]).toMatchObject({
      id: 'p1',
      username: 'Fish',
      avatarConfig: { hair: 'bun' },
      prestigeLevel: 3,
    });
  });

  it('falls back to season 1 when get_current_season_id RPC returns null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const chain = setupChain([]);

    const { useTopPlayers } = await import('../useTopPlayers');
    const { result } = renderHook(() => useTopPlayers(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith('season_id', 1);
  });

  it('uses initialData and skips network when provided', async () => {
    const { useTopPlayers } = await import('../useTopPlayers');
    const initialData = [
      {
        id: 'seed1',
        username: 'Seeded',
        displayName: null,
        totalScore: 500,
        avatarImage: null,
        avatarConfig: null,
        prestigeLevel: 0,
      },
    ];
    const { result } = renderHook(() => useTopPlayers(5, { initialData }));
    expect(result.current.loading).toBe(false);
    expect(result.current.players).toEqual(initialData);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
