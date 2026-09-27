import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCoachExampleWord } from '../useCoachExampleWord';

const GRID = [['C', 'A'], ['T', 'S']];
const okResponse = () => ({
  ok: true,
  json: async () => ({ words: { easy: ['CAT'], medium: [], hard: [] } }),
});

describe('useCoachExampleWord', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('resolves a word from the board for a stage that wants one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const { result } = renderHook(() =>
      useCoachExampleWord({ stage: 'idle-nudge', grid: GRID, language: 'en' }),
    );
    await waitFor(() => expect(result.current).toBe('CAT'));
  });

  it('does not call the expensive solver for stages that do not want a word', () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useCoachExampleWord({ stage: 'submit-hint', grid: GRID, language: 'en' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still delivers a word when the stage changes while the request is in flight', async () => {
    // The coach escalates between stages, so deps change mid-fetch by design.
    // A one-shot guard that latches BEFORE the response lands would abort the
    // only attempt and then never retry — the card would silently fall back to
    // the generic copy forever, indistinguishable from the old behaviour.
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const { result, rerender } = renderHook(
      ({ stage }) => useCoachExampleWord({ stage, grid: GRID, language: 'en' }),
      { initialProps: { stage: 'idle-nudge' as const } },
    );
    rerender({ stage: 'validity-hint' as never });
    await waitFor(() => expect(result.current).toBe('CAT'));
  });

  it('retries on a later stage after a failed request rather than latching off', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(
      ({ stage }) => useCoachExampleWord({ stage, grid: GRID, language: 'en' }),
      { initialProps: { stage: 'idle-nudge' as const } },
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ stage: 'validity-hint' as never });
    await waitFor(() => expect(result.current).toBe('CAT'));
  });

  it('never fires more than once after a successful resolve', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = renderHook(
      ({ stage }) => useCoachExampleWord({ stage, grid: GRID, language: 'en' }),
      { initialProps: { stage: 'idle-nudge' as const } },
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender({ stage: 'validity-hint' as never });
    rerender({ stage: 'tap-hint' as never });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
