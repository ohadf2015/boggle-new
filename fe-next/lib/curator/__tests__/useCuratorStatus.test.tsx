import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const authState = { user: null as { id: string } | null, loading: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));

import { useCuratorStatus } from '../useCuratorStatus';

beforeEach(() => {
  authState.user = null;
  authState.loading = false;
  vi.restoreAllMocks();
});

describe('useCuratorStatus', () => {
  it('reports non-curator and does not fetch when signed out', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useCuratorStatus());
    expect(result.current.isCurator).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and exposes curator languages for a signed-in curator', async () => {
    authState.user = { id: 'u1' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        isCurator: true,
        isAdmin: false,
        languages: ['he'],
        assignments: [{ language: 'he', trust_tier: 2, active: true, curator_points: 30 }],
      }),
    } as Response);

    const { result } = renderHook(() => useCuratorStatus());
    await waitFor(() => expect(result.current.isCurator).toBe(true));
    expect(result.current.languages).toEqual(['he']);
    expect(result.current.assignments[0].trust_tier).toBe(2);
    expect(result.current.isLoading).toBe(false);
  });
});
