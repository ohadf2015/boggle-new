/**
 * useChurnSignals Hook Tests
 *
 * Regression guard for the "failed to report signals {}" + app-unresponsive
 * report. The hook must:
 *  - report via an authenticated POST (so it stops 401-ing),
 *  - keep a STABLE reportSignals identity across the 1Hz session-length
 *    re-renders (so the report interval is not torn down/recreated every
 *    second — the source of the unresponsiveness),
 *  - guard against overlapping in-flight reports,
 *  - log a real Error (never an empty {}) when a report fails,
 *  - no-op cleanly when there is no authenticated user.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

const { mockPostWithAuth } = vi.hoisted(() => ({ mockPostWithAuth: vi.fn() }));
vi.mock('@/utils/authFetch', () => ({
  postWithAuth: (...args: unknown[]) => mockPostWithAuth(...args),
}));

const { mockLoggerError, mockLoggerWarn, mockLoggerDebug } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerDebug: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  default: {
    error: (...a: unknown[]) => mockLoggerError(...a),
    warn: (...a: unknown[]) => mockLoggerWarn(...a),
    log: vi.fn(),
    debug: (...a: unknown[]) => mockLoggerDebug(...a),
  },
}));

import { useChurnSignals } from '../useChurnSignals';

const okResponse = () => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response;

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
  mockPostWithAuth.mockReset();
  mockPostWithAuth.mockResolvedValue(okResponse());
  mockLoggerError.mockReset();
  mockLoggerWarn.mockReset();
  mockLoggerDebug.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useChurnSignals', () => {
  it('reports via authenticated POST to the churn-signals endpoint', async () => {
    const { result } = renderHook(() => useChurnSignals());

    await act(async () => {
      await result.current.reportSignals();
    });

    expect(mockPostWithAuth).toHaveBeenCalledTimes(1);
    expect(mockPostWithAuth.mock.calls[0][0]).toBe('/api/growth/churn-signals');
  });

  it('does not start overlapping reports while one is in flight', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    mockPostWithAuth.mockReturnValue(new Promise<Response>((res) => { resolveFetch = res; }));

    const { result } = renderHook(() => useChurnSignals());

    await act(async () => {
      // fire two reports back-to-back before the first resolves
      result.current.reportSignals();
      result.current.reportSignals();
    });

    expect(mockPostWithAuth).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(okResponse());
    });
  });

  // This is a best-effort, fire-and-forget telemetry beacon. A failed report
  // never affects the user, so transient failures must NOT reach Sentry — only
  // `error`/`warn` are forwarded (utils/logger.ts); `debug` is console-only.
  // Sentry JAVASCRIPT-NEXTJS-1KQ was 278 escalating "status 502" events that
  // were just deploy-churn (the single Railway instance restarting), not a fault.

  it('downgrades a network failure to debug (the Error is preserved, never Sentry error)', async () => {
    mockPostWithAuth.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useChurnSignals());

    await act(async () => {
      await result.current.reportSignals();
    });

    await waitFor(() => expect(mockLoggerDebug).toHaveBeenCalled());
    // The Error is still passed (regression guard against empty "{}" serialisation).
    const errArg = mockLoggerDebug.mock.calls[0].find((a: unknown) => a instanceof Error);
    expect(errArg).toBeInstanceOf(Error);
    // ...but it must never hit the Sentry-bound levels.
    expect(mockLoggerError).not.toHaveBeenCalled();
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('treats a transient 5xx (e.g. 502 during a deploy) as debug, never Sentry', async () => {
    mockPostWithAuth.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) } as unknown as Response);

    const { result } = renderHook(() => useChurnSignals());

    await act(async () => {
      await result.current.reportSignals();
    });

    await waitFor(() => expect(mockLoggerDebug).toHaveBeenCalled());
    expect(mockLoggerError).not.toHaveBeenCalled();
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('treats a 401 (token expiry on a beacon) as debug, never Sentry', async () => {
    mockPostWithAuth.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as unknown as Response);

    const { result } = renderHook(() => useChurnSignals());

    await act(async () => {
      await result.current.reportSignals();
    });

    await waitFor(() => expect(mockLoggerDebug).toHaveBeenCalled());
    expect(mockLoggerError).not.toHaveBeenCalled();
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('preserves visibility for a 4xx contract error (warn → Sentry), since that is a real regression', async () => {
    mockPostWithAuth.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) } as unknown as Response);

    const { result } = renderHook(() => useChurnSignals());

    await act(async () => {
      await result.current.reportSignals();
    });

    await waitFor(() => expect(mockLoggerWarn).toHaveBeenCalled());
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('keeps a stable reportSignals identity across re-renders', () => {
    const { result, rerender } = renderHook(() => useChurnSignals());
    const first = result.current.reportSignals;
    rerender();
    rerender();
    expect(result.current.reportSignals).toBe(first);
  });

  it('does nothing when there is no authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useChurnSignals());

    await act(async () => {
      await result.current.reportSignals();
    });

    expect(mockPostWithAuth).not.toHaveBeenCalled();
  });

  it('fires the periodic report exactly once per interval despite 1Hz re-renders', async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useChurnSignals());

      // Advance 5 minutes worth of 1-second session-length ticks + the report interval.
      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      // Exactly one periodic report — not zero (interval never reset away) and
      // not many (no duplicate intervals stacking up).
      expect(mockPostWithAuth).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
