import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NEUTRAL_PERKS, applyUpgrade, emptyEstate, perksFromEstate, runCoins } from '@/lib/wordTowerV2/estate';

const auth = { isAuthenticated: false, loading: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/utils/authFetch', () => ({ getWithAuth: vi.fn(), postWithAuth: vi.fn() }));

import { getWithAuth, postWithAuth } from '@/utils/authFetch';
import { ESTATE_STORAGE_KEY, useEstate } from '../useEstate';

const RUN = { floors: 12, perfects: 4, bestCombo: 3, crates: 2, heightM: 36 };
const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
const mockGet = getWithAuth as unknown as ReturnType<typeof vi.fn>;
const mockPost = postWithAuth as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  auth.isAuthenticated = false;
  auth.loading = false;
});

describe('useEstate — auth still resolving', () => {
  it('given auth loading, when mounted, then it stays pessimistic: empty estate, neutral perks, no reads', () => {
    auth.loading = true;
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify({ ...emptyEstate(), coins: 999 }));
    const { result } = renderHook(() => useEstate());
    expect(result.current.status).toBe('loading');
    expect(result.current.estate).toEqual(emptyEstate());
    expect(result.current.perks).toEqual(NEUTRAL_PERKS);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('useEstate — guest', () => {
  it('given a stored estate, when mounted, then it is loaded (sanitised) from localStorage', async () => {
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify({ ...emptyEstate(), coins: 321, district: 99 }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.estate.coins).toBe(321);
    expect(result.current.estate.district).toBe(10);
    expect(result.current.authed).toBe(false);
  });

  it('given a run, when reported, then coins + chest are banked locally with the same pure functions', async () => {
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let paid: Awaited<ReturnType<typeof result.current.reportRun>> = null;
    await act(async () => {
      paid = await result.current.reportRun(RUN);
    });
    expect(paid!.coins).toBe(runCoins(RUN));
    expect(result.current.estate.coins).toBe(paid!.coins + paid!.chest.coins);
    const stored = JSON.parse(window.localStorage.getItem(ESTATE_STORAGE_KEY)!);
    expect(stored.coins).toBe(result.current.estate.coins);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('given coins, when upgrading, then the plot levels up locally', async () => {
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify({ ...emptyEstate(), coins: 500 }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      expect(await result.current.upgrade('vault')).toMatchObject({ ok: true });
    });
    expect(result.current.estate.plots.find((p) => p.slot === 'vault')!.level).toBe(1);
  });

  it('given a guest, when asking for rivals or raiding, then null (needs sign-in)', async () => {
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(await result.current.rivals()).toBeNull();
    expect(await result.current.raid('x', 1)).toBeNull();
  });
});

describe('useEstate — signed in', () => {
  const serverEstate = { ...emptyEstate(), coins: 500 };
  const inbox = [{ id: 'r1', attackerId: 'a', attackerName: 'Dana', blocked: false, plot: 'vault', coinsStolen: 10 }];

  beforeEach(() => {
    auth.isAuthenticated = true;
    mockGet.mockResolvedValue(ok({ estate: serverEstate, perks: perksFromEstate(serverEstate), raids: inbox }));
  });

  it('given a session, when mounted, then the server estate + raid inbox load (localStorage ignored)', async () => {
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify({ ...emptyEstate(), coins: 7 }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockGet).toHaveBeenCalledWith('/api/word-tower/estate', expect.anything());
    expect(result.current.estate.coins).toBe(500);
    expect(result.current.inbox).toHaveLength(1);
  });

  it('given a run, when reported, then the server result wins', async () => {
    const after = { ...serverEstate, coins: 800, runs: 1 };
    mockPost.mockResolvedValueOnce(ok({ estate: after, perks: perksFromEstate(after), coins: 250, chest: { tier: 'rare', coins: 50, shields: 0, bricks: 1, blueprints: 0 } }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let paid: Awaited<ReturnType<typeof result.current.reportRun>> = null;
    await act(async () => {
      paid = await result.current.reportRun(RUN);
    });
    expect(mockPost).toHaveBeenCalledWith('/api/word-tower/estate/run', RUN, expect.anything());
    expect(paid).toMatchObject({ coins: 250, chest: { tier: 'rare' } });
    expect(result.current.estate.coins).toBe(800);
  });

  it('given an upgrade, when sent, then it shows optimistically and the server copy replaces it', async () => {
    let resolve!: (r: Response) => void;
    mockPost.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.upgrade('vault');
    });
    expect(result.current.estate.plots.find((p) => p.slot === 'vault')!.level).toBe(1);
    const server = applyUpgrade(serverEstate, 'vault');
    await act(async () => {
      resolve(ok({ estate: server.ok ? server.estate : null, perks: NEUTRAL_PERKS, districtCompleted: false }));
      await pending;
    });
    expect(result.current.estate).toEqual(server.ok && server.estate);
  });

  it('given the server refuses an upgrade, when sent, then the optimistic change rolls back to server truth', async () => {
    mockPost.mockResolvedValueOnce(ok({ error: 'cannot upgrade', reason: 'coins' }, 400));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let res: unknown;
    await act(async () => {
      res = await result.current.upgrade('vault');
    });
    expect(res).toEqual({ ok: false, reason: 'coins' });
    expect(result.current.estate.plots.find((p) => p.slot === 'vault')!.level).toBe(0);
    expect(mockGet).toHaveBeenCalledTimes(2); // re-read after the refusal
  });

  it('given a raid, when sent, then the attacker estate updates from the server', async () => {
    const after = { ...serverEstate, coins: 700 };
    mockPost.mockResolvedValueOnce(ok({ outcome: { kind: 'blocked', attackerCoins: 30 }, estate: after, perks: NEUTRAL_PERKS }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let out: unknown;
    await act(async () => {
      out = await result.current.raid('b', 0.7, true);
    });
    expect(mockPost).toHaveBeenCalledWith('/api/word-tower/estate/raid', { defenderId: 'b', accuracy: 0.7, revenge: true }, expect.anything());
    expect(out).toMatchObject({ outcome: { kind: 'blocked' } });
    expect(result.current.estate.coins).toBe(700);
  });

  it('given unseen raids, when marked seen, then they leave the inbox', async () => {
    mockPost.mockResolvedValueOnce(ok({ ok: true, count: 1 }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.inbox).toHaveLength(1));
    await act(async () => {
      await result.current.markSeen(['r1']);
    });
    expect(result.current.inbox).toHaveLength(0);
    expect(mockPost).toHaveBeenCalledWith('/api/word-tower/estate/seen', { ids: ['r1'] }, expect.anything());
  });
});
