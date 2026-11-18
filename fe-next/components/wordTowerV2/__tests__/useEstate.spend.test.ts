import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyUpgrade, emptyEstate } from '@/lib/wordTowerV2/estate';
import { finishDistrictPlan } from '@/lib/wordTowerV2/estateFinish';

const auth = { isAuthenticated: true, loading: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/utils/authFetch', () => ({ getWithAuth: vi.fn(), postWithAuth: vi.fn() }));
vi.mock('@/contexts/CoinContext', () => ({ useCoinActions: () => ({ refreshCoins: vi.fn(async () => 0) }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { getWithAuth, postWithAuth } from '@/utils/authFetch';
import { ESTATE_STORAGE_KEY, useEstate } from '../useEstate';

const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
const mockGet = getWithAuth as unknown as ReturnType<typeof vi.fn>;
const mockPost = postWithAuth as unknown as ReturnType<typeof vi.fn>;
const server = { ...emptyEstate(), coins: 500 };
const vaultLevel = (e: { plots: { slot: string; level: number }[] }) => e.plots.find((p) => p.slot === 'vault')!.level;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  auth.isAuthenticated = true;
  mockGet.mockResolvedValue(ok({ estate: server, raids: [] }));
});

async function ready() {
  const hook = renderHook(() => useEstate());
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  return hook;
}

describe('useEstate spending', () => {
  it('given the network drops, when upgrading, then it reports failure and rolls back instead of throwing', async () => {
    mockPost.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = await ready();
    let res: unknown;
    await act(async () => {
      res = await result.current.upgrade('vault');
    });
    expect(res).toEqual({ ok: false, reason: 'error' });
    expect(vaultLevel(result.current.estate)).toBe(0);
  });

  it('given the network drops, when buying a wrecking ball, then it reports failure instead of throwing', async () => {
    mockPost.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = await ready();
    let res: unknown;
    await act(async () => {
      res = await result.current.buyCharge();
    });
    expect(res).toEqual({ ok: false, reason: 'error' });
  });

  it('given a slow re-read from before the upgrade, when it lands late, then the upgrade stays on screen', async () => {
    const { result } = await ready();
    let lateRead!: (r: Response) => void;
    mockGet.mockReturnValueOnce(new Promise<Response>((r) => (lateRead = r)));
    let refreshing!: Promise<void>;
    act(() => {
      refreshing = result.current.refresh();
    });
    const after = applyUpgrade(server, 'vault');
    mockPost.mockResolvedValueOnce(ok({ estate: after.ok && after.estate, districtCompleted: false }));
    await act(async () => {
      await result.current.upgrade('vault');
    });
    await act(async () => {
      lateRead(ok({ estate: server, raids: [] }));
      await refreshing;
    });
    expect(vaultLevel(result.current.estate)).toBe(1);
  });

  it('given enough coins, when finishing the district, then one request is sent and the next district shows', async () => {
    const coins = finishDistrictPlan(emptyEstate())!.coins;
    mockGet.mockResolvedValue(ok({ estate: { ...emptyEstate(), coins }, raids: [] }));
    const next = { ...emptyEstate(), district: 2, coins: 300, blueprints: 1, shields: 1 };
    mockPost.mockResolvedValueOnce(ok({ estate: next, districtCompleted: true }));
    const { result } = await ready();
    let res: unknown;
    await act(async () => {
      res = await result.current.finishDistrict();
    });
    expect(res).toEqual({ ok: true, districtCompleted: true });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0]).toBe('/api/word-tower/estate/upgrade');
    expect(mockPost.mock.calls[0][1]).toEqual({ all: true, cost: coins });
    expect(result.current.estate.district).toBe(2);
  });

  it('given a guest with enough coins, when finishing the district, then it is saved locally', async () => {
    auth.isAuthenticated = false;
    const coins = finishDistrictPlan(emptyEstate())!.coins;
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify({ ...emptyEstate(), coins }));
    const { result } = await ready();
    await act(async () => {
      await result.current.finishDistrict();
    });
    expect(result.current.estate.district).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(ESTATE_STORAGE_KEY)!).district).toBe(2);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
