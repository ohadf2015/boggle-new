import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NEUTRAL_PERKS, applyUpgrade, emptyEstate, perksFromEstate, runCoins } from '@/lib/wordTowerV2/estate';

const auth = { isAuthenticated: false, loading: false };
const refreshCoins = vi.fn(async () => 0);

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/utils/authFetch', () => ({ getWithAuth: vi.fn(), postWithAuth: vi.fn() }));
// Word Tower coins ARE the app wallet: every server answer re-syncs the shared balance.
vi.mock('@/contexts/CoinContext', () => ({ useCoinActions: () => ({ refreshCoins }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { getWithAuth, postWithAuth } from '@/utils/authFetch';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { ESTATE_STORAGE_KEY, useEstate } from '../useEstate';

const RUN = { floors: 12, perfects: 4, bestCombo: 3, crates: 2, heightM: 36 };
const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
const mockGet = getWithAuth as unknown as ReturnType<typeof vi.fn>;
const mockPost = postWithAuth as unknown as ReturnType<typeof vi.fn>;
const mockTrackEvent = trackGrowthEvent as unknown as ReturnType<typeof vi.fn>;

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
    // The header / other modes show the same wallet, so they must hear about the payout.
    expect(refreshCoins).toHaveBeenCalled();
  });

  it('given a guest, when a run is banked locally, then the app wallet is not touched', async () => {
    auth.isAuthenticated = false;
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.reportRun(RUN);
    });
    expect(refreshCoins).not.toHaveBeenCalled();
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

  it('should track wt2_upgrade_bought event when upgrade succeeds', async () => {
    const server = applyUpgrade(serverEstate, 'vault');
    expect(server.ok).toBe(true);
    mockPost.mockResolvedValueOnce(ok({ estate: server.estate, districtCompleted: false }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.upgrade('vault');
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'wt2_upgrade_bought',
      {
        upgrade: 'vault',
        cost: server.cost,
      }
    );
    // Verify the cost is positive (not a placeholder 0)
    expect(server.cost).toBeGreaterThan(0);
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
    expect(mockPost).toHaveBeenCalledWith(
      '/api/word-tower/estate/raid',
      expect.objectContaining({ defenderId: 'b', accuracy: 0.7, revenge: true, nonce: expect.any(String) }),
      expect.anything()
    );
    expect(out).toMatchObject({ outcome: { kind: 'blocked' } });
    expect(result.current.estate.coins).toBe(700);
    // Track engagement: raid result (blocked = no coins won)
    expect(mockTrackEvent).toHaveBeenCalledWith('wt2_raid_played', { won: false, coins: 0 });
  });

  it('given a raid that damages, when sent, then wt2_raid_played is emitted with coins', async () => {
    const after = { ...serverEstate, coins: 550 };
    mockPost.mockResolvedValueOnce(ok({ outcome: { kind: 'damaged', slot: 'vault', coinsStolen: 50, attackerCoins: 120 }, estate: after, perks: NEUTRAL_PERKS }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.raid('b', 1, false);
    });
    expect(mockTrackEvent).toHaveBeenCalledWith('wt2_raid_played', { won: true, coins: 120 });
  });

  it('given a duplicate raid (409), when sent, then wt2_raid_played is NOT emitted', async () => {
    mockPost.mockResolvedValueOnce(ok({ reason: 'duplicate' }, 409));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    mockTrackEvent.mockClear();
    await act(async () => {
      await result.current.raid('b', 1, false);
    });
    expect(mockTrackEvent).not.toHaveBeenCalled();
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

describe('useEstate — nothing a player earned is silently dropped', () => {
  const serverEstate = { ...emptyEstate(), coins: 500 };

  beforeEach(() => {
    auth.isAuthenticated = true;
    mockGet.mockResolvedValue(ok({ estate: serverEstate, perks: perksFromEstate(serverEstate), raids: [] }));
  });

  it('given a guest empire in localStorage, when the player is signed in, then it is claimed into the account and the local copy cleared', async () => {
    const guest = { ...emptyEstate(), coins: 90, runs: 2 };
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify(guest));
    const merged = { ...serverEstate, coins: 590, runs: 2 };
    mockPost.mockResolvedValueOnce(ok({ estate: merged, perks: perksFromEstate(merged) }));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.estate.coins).toBe(590));
    expect(mockPost).toHaveBeenCalledWith('/api/word-tower/estate/claim', { estate: expect.objectContaining({ coins: 90, runs: 2 }) }, expect.anything());
    expect(window.localStorage.getItem(ESTATE_STORAGE_KEY)).toBeNull();
  });

  it('given a guest who never played, when signed in, then nothing is claimed', async () => {
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify(emptyEstate()));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('given the run POST is refused (429), when reported, then the run is queued and banked on the next load', async () => {
    mockPost.mockResolvedValueOnce(ok({ error: 'Too many requests' }, 429));
    const first = renderHook(() => useEstate());
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    await act(async () => {
      expect(await first.result.current.reportRun(RUN)).toBeNull();
    });
    first.unmount();

    const after = { ...serverEstate, coins: 900, runs: 1 };
    mockPost.mockResolvedValueOnce(ok({ estate: after, perks: perksFromEstate(after), coins: 300, chest: { tier: 'common', coins: 100, shields: 0, bricks: 0, blueprints: 0 } }));
    const second = renderHook(() => useEstate());
    await waitFor(() => expect(second.result.current.estate.coins).toBe(900));
    expect(mockPost).toHaveBeenLastCalledWith('/api/word-tower/estate/run', RUN, expect.anything());
  });

  it('given the claim response is lost, when the page loads again, then the guest estate is NOT claimed a second time', async () => {
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify({ ...emptyEstate(), coins: 90, runs: 2 }));
    mockPost.mockRejectedValueOnce(new TypeError('network'));
    const first = renderHook(() => useEstate());
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    first.unmount();
    const second = renderHook(() => useEstate());
    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    await act(async () => {
      await second.result.current.refresh();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('given two refreshes at once, when a guest estate is waiting, then it is claimed exactly once', async () => {
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify({ ...emptyEstate(), coins: 90, runs: 2 }));
    let release!: (r: Response) => void;
    mockPost.mockReturnValueOnce(new Promise<Response>((r) => (release = r)));
    const { result } = renderHook(() => useEstate());
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    await act(async () => {
      const again = result.current.refresh();
      release(ok({ estate: serverEstate, perks: perksFromEstate(serverEstate) }));
      await again;
    });
    expect(mockPost.mock.calls.filter((c) => String(c[0]).endsWith('/claim'))).toHaveLength(1);
  });

  it('given a queued run whose replay response is lost, then it is not replayed again', async () => {
    window.localStorage.setItem('wordTowerV2.pendingRuns.me', JSON.stringify([RUN]));
    mockPost.mockRejectedValueOnce(new TypeError('network'));
    const first = renderHook(() => useEstate());
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    first.unmount();
    const second = renderHook(() => useEstate());
    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('given the estate read fails, when a copy was loaded before, then the last known bank is shown, not an empty one', async () => {
    const first = renderHook(() => useEstate());
    await waitFor(() => expect(first.result.current.estate.coins).toBe(500));
    first.unmount();
    mockGet.mockResolvedValue(ok({ error: 'boom' }, 500));
    const second = renderHook(() => useEstate());
    await waitFor(() => expect(second.result.current.status).toBe('error'));
    expect(second.result.current.estate.coins).toBe(500);
  });
});
