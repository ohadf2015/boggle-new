import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMissedDailies } from '../useMissedDailies';
import { getWithAuth } from '@/utils/authFetch';

vi.mock('@/utils/authFetch', () => ({ getWithAuth: vi.fn() }));

describe('useMissedDailies', () => {
  // Hook fetches via getWithAuth (Bearer-token wrapper), not raw fetch.
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = getWithAuth as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches word-hunt missed dailies by default', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ missed: [{ date: '2025-01-19', puzzleNumber: 21 }] }),
    });

    const { result } = renderHook(() => useMissedDailies());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/api/daily/missed?mode=word-hunt');
    expect(result.current.missed).toEqual([{ date: '2025-01-19', puzzleNumber: 21 }]);
  });

  it('fetches word-wheel missed dailies when mode is word-wheel', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ missed: [{ date: '2025-01-18', puzzleNumber: 20 }] }),
    });

    const { result } = renderHook(() => useMissedDailies('word-wheel'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/api/daily/missed?mode=word-wheel');
    expect(result.current.missed).toEqual([{ date: '2025-01-18', puzzleNumber: 20 }]);
  });

  it('returns empty list on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMissedDailies('word-wheel'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.missed).toEqual([]);
  });

  it('does not fetch when disabled', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ missed: [] }),
    });

    renderHook(() => useMissedDailies('word-hunt', false));

    // Give the hook time to complete (it shouldn't)
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Given the server answers, Then status is ok', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ missed: [] }) });
    const { result } = renderHook(() => useMissedDailies());
    await waitFor(() => expect(result.current.status).toBe('ok'));
  });

  it('Given a 5xx or network error, Then status is error so callers do not read an empty list as "all played"', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    const { result } = renderHook(() => useMissedDailies());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('Given it is disabled, Then status stays idle and nothing is fetched', () => {
    const { result } = renderHook(() => useMissedDailies('word-hunt', false));
    expect(result.current.status).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
