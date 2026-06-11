/**
 * useDailyAvatarPart — owns the daily-avatar-part reward state (status fetch,
 * cooldown ticking, claim POST). Extracted from DailyAvatarPartCard so both the
 * missions-hub card and the lobby reward button share one source of truth.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

let isAuthenticated = true;
let hasRealAdProvider = true;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      let out = key;
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
      return out;
    },
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated }) }));
vi.mock('@/hooks/useHasRealAdProvider', () => ({ useHasRealAdProvider: () => hasRealAdProvider }));

import { useDailyAvatarPart } from '../useDailyAvatarPart';

function mockStatus(body: Record<string, unknown>, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => body } as Response);
}

describe('useDailyAvatarPart', () => {
  beforeEach(() => {
    isAuthenticated = true;
    hasRealAdProvider = true;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not render and does not fetch when no real ad provider', async () => {
    hasRealAdProvider = false;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { result } = renderHook(() => useDailyAvatarPart());
    expect(result.current.shouldRender).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not render when unauthenticated (server would 401)', async () => {
    isAuthenticated = false;
    vi.stubGlobal('fetch', vi.fn());
    const { result } = renderHook(() => useDailyAvatarPart());
    expect(result.current.shouldRender).toBe(false);
  });

  it('renders eligible when status says eligible with parts remaining', async () => {
    vi.stubGlobal('fetch', mockStatus({
      cooldownActive: false, nextClaimAt: null, unownedCount: 12, eligible: true,
    }));
    const { result } = renderHook(() => useDailyAvatarPart());
    await waitFor(() => expect(result.current.shouldRender).toBe(true));
    expect(result.current.eligible).toBe(true);
    expect(result.current.exhausted).toBe(false);
    expect(result.current.cooldownActive).toBe(false);
  });

  it('reports cooldown with a remaining label when on cooldown', async () => {
    const next = new Date(Date.now() + 3 * 3_600_000 + 20 * 60_000).toISOString();
    vi.stubGlobal('fetch', mockStatus({
      cooldownActive: true, nextClaimAt: next, unownedCount: 5, eligible: false,
    }));
    const { result } = renderHook(() => useDailyAvatarPart());
    await waitFor(() => expect(result.current.shouldRender).toBe(true));
    expect(result.current.eligible).toBe(false);
    expect(result.current.cooldownActive).toBe(true);
    expect(result.current.remainingLabel).toBe('3h 20m');
  });

  it('reports exhausted when no parts remain', async () => {
    vi.stubGlobal('fetch', mockStatus({
      cooldownActive: false, nextClaimAt: null, unownedCount: 0, eligible: false,
    }));
    const { result } = renderHook(() => useDailyAvatarPart());
    await waitFor(() => expect(result.current.shouldRender).toBe(true));
    expect(result.current.exhausted).toBe(true);
  });

  it('claim() POSTs, returns granted id, and flips to cooldown', async () => {
    const next = new Date(Date.now() + 24 * 3_600_000).toISOString();
    const fetchSpy = vi.fn()
      // initial GET
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        cooldownActive: false, nextClaimAt: null, unownedCount: 4, eligible: true,
      }) } as Response)
      // POST claim
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        granted: 'accessories:halo', nextClaimAt: next,
      }) } as Response);
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useDailyAvatarPart());
    await waitFor(() => expect(result.current.eligible).toBe(true));

    let granted: string | null = null;
    await act(async () => { granted = await result.current.claim(); });

    expect(granted).toBe('accessories:halo');
    expect(fetchSpy).toHaveBeenLastCalledWith('/api/avatar/claim-daily-part', { method: 'POST' });
    expect(result.current.granted).toBe('accessories:halo');
    expect(result.current.eligible).toBe(false);
    expect(result.current.cooldownActive).toBe(true);
  });

  it('openModal / closeModal toggle modalOpen', async () => {
    vi.stubGlobal('fetch', mockStatus({
      cooldownActive: false, nextClaimAt: null, unownedCount: 3, eligible: true,
    }));
    const { result } = renderHook(() => useDailyAvatarPart());
    await waitFor(() => expect(result.current.shouldRender).toBe(true));
    act(() => result.current.openModal());
    expect(result.current.modalOpen).toBe(true);
    act(() => result.current.closeModal());
    expect(result.current.modalOpen).toBe(false);
  });
});
