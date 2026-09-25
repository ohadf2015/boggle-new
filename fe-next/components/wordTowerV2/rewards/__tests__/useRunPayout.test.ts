import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRunPayout } from '../useRunPayout';
import type { RunSummary, ChestRoll } from '@/lib/wordTowerV2/estate';

describe('useRunPayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show pending state while server call is in flight, then paid with server coins', async () => {
    let resolveReport: any = null;
    const reportPromise = new Promise((resolve) => {
      resolveReport = resolve;
    });

    const mockReportRun = vi.fn(() => reportPromise);
    const mockGetSummary = vi.fn((): RunSummary => ({
      floors: 10,
      perfects: 0,
      bestCombo: 0,
      crates: 0,
      heightM: 5,
    }));

    const { result } = renderHook(() =>
      useRunPayout({
        over: true,
        ready: true,
        getSummary: mockGetSummary,
        reportRun: mockReportRun,
      })
    );

    // Initially pending with 0 coins
    expect(result.current.payoutStatus.status).toBe('pending');
    expect(result.current.payoutStatus.coins).toBe(0);
    expect(result.current.waiting).toBe(true);
    expect(result.current.payout).toBe(null);

    // Resolve with server values
    resolveReport({ coins: 500, chest: { tier: 'rare', coins: 100, shields: 1, bricks: 0, blueprints: 0 } });

    // Wait for the state to update
    await waitFor(() => {
      expect(result.current.waiting).toBe(false);
    });

    // Should now show paid with server-returned coins
    expect(result.current.payoutStatus.status).toBe('paid');
    expect(result.current.payoutStatus.coins).toBe(500);
    expect(result.current.payout?.coins).toBe(500);
    expect(result.current.payout?.chest.coins).toBe(100);
  });

  it('should show none status if report fails', async () => {
    const mockReportRun = vi.fn(() => Promise.reject(new Error('Network error')));
    const mockGetSummary = vi.fn((): RunSummary => ({
      floors: 10,
      perfects: 0,
      bestCombo: 0,
      crates: 0,
      heightM: 5,
    }));

    const { result } = renderHook(() =>
      useRunPayout({
        over: true,
        ready: true,
        getSummary: mockGetSummary,
        reportRun: mockReportRun,
      })
    );

    // Initially pending
    expect(result.current.payoutStatus.status).toBe('pending');
    expect(result.current.waiting).toBe(true);

    // Wait for error handling
    await waitFor(() => {
      expect(result.current.waiting).toBe(false);
    });

    // Should show none status and null payout (no coins shown)
    expect(result.current.payoutStatus.status).toBe('none');
    expect(result.current.payoutStatus.coins).toBe(0);
    expect(result.current.payout).toBeNull();
  });

  it('should show none status if reportRun returns null (guest offline)', async () => {
    const mockReportRun = vi.fn(() => Promise.resolve(null));
    const mockGetSummary = vi.fn((): RunSummary => ({
      floors: 10,
      perfects: 0,
      bestCombo: 0,
      crates: 0,
      heightM: 5,
    }));

    const { result } = renderHook(() =>
      useRunPayout({
        over: true,
        ready: true,
        getSummary: mockGetSummary,
        reportRun: mockReportRun,
      })
    );

    // Wait for completion
    await waitFor(() => {
      expect(result.current.waiting).toBe(false);
    });

    // Should show none status (no payout)
    expect(result.current.payoutStatus.status).toBe('none');
    expect(result.current.payoutStatus.coins).toBe(0);
    expect(result.current.payout).toBeNull();
  });

  it('should fire report only once per run', async () => {
    const mockReportRun = vi.fn(() => Promise.resolve({ coins: 100, chest: { tier: 'common', coins: 0, shields: 0, bricks: 0, blueprints: 0 } }));
    const mockGetSummary = vi.fn((): RunSummary => ({
      floors: 10,
      perfects: 0,
      bestCombo: 0,
      crates: 0,
      heightM: 5,
    }));

    const { result, rerender } = renderHook(
      ({ over, ready }: { over: boolean; ready: boolean }) =>
        useRunPayout({
          over,
          ready,
          getSummary: mockGetSummary,
          reportRun: mockReportRun,
        }),
      { initialProps: { over: true, ready: true } }
    );

    await waitFor(() => {
      expect(result.current.payout).not.toBeNull();
    });

    // Rerender with new props should not fire again
    rerender({ over: true, ready: true });

    expect(mockReportRun).toHaveBeenCalledTimes(1);
  });

  it('should reset status to idle when a new run starts', async () => {
    const mockReportRun = vi.fn(() => Promise.resolve({ coins: 100, chest: { tier: 'common', coins: 0, shields: 0, bricks: 0, blueprints: 0 } }));
    const mockGetSummary = vi.fn((): RunSummary => ({
      floors: 10,
      perfects: 0,
      bestCombo: 0,
      crates: 0,
      heightM: 5,
    }));

    const { result, rerender } = renderHook(
      ({ over }: { over: boolean }) =>
        useRunPayout({
          over,
          ready: true,
          getSummary: mockGetSummary,
          reportRun: mockReportRun,
        }),
      { initialProps: { over: true } }
    );

    // Wait for payout
    await waitFor(() => {
      expect(result.current.payout).not.toBeNull();
    });
    expect(result.current.payoutStatus.status).toBe('paid');

    // New run starts (over becomes false)
    rerender({ over: false });

    // Status should reset to idle
    expect(result.current.payoutStatus.status).toBe('idle');
    expect(result.current.payout).toBeNull();
  });
});
