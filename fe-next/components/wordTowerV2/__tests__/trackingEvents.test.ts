import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTowerRun } from '../useTowerRun';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/utils/growthTracking');
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
    playComboSound: vi.fn(),
    playWordLengthSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
    user: null,
  }),
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinActions: () => ({
    refreshCoins: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: vi.fn().mockResolvedValue({ ok: false }),
  postWithAuth: vi.fn().mockResolvedValue({ ok: false }),
}));

describe('WT2 Engagement Event Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('wt2_run_ended', () => {
    it('should track when run finishes with cashout', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const { result } = renderHook(() => useTowerRun({ seed: undefined }));

      act(() => {
        result.current.finish();
      });

      // Find the wt2_run_ended call
      const runEndedCall = mockTrack.mock.calls.find(([name]) => name === 'wt2_run_ended');
      expect(runEndedCall).toBeDefined();
      expect(runEndedCall?.[1]).toMatchObject({
        daily: false,
        heightM: expect.any(Number),
        floors: expect.any(Number),
        cause: 'cashout',
      });
    });

    it('should track daily run with daily flag', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const { result } = renderHook(() => useTowerRun({ seed: 12345 }));

      act(() => {
        result.current.finish();
      });

      const runEndedCall = mockTrack.mock.calls.find(([name]) => name === 'wt2_run_ended');
      expect(runEndedCall?.[1]).toMatchObject({
        daily: true,
        cause: 'cashout',
      });
    });

    it('should track wt2_run_ended with correct cause field and prevent duplicates via endedRef guard', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const { result } = renderHook(() => useTowerRun({ seed: undefined }));

      // Capture the finish callback before calling it, so both calls use the same closure
      const finish = result.current.finish;

      // Call finish twice in same act — the phase check passes for both (stale closure),
      // but the endedRef guard at line 206 prevents the second event.
      // If line 206 is deleted, this test fails (2 events instead of 1).
      act(() => {
        finish();
        finish();
      });

      const runEndedCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_run_ended');
      expect(runEndedCalls.length).toBe(1);

      // Verify the single event has cashout cause
      const [, data] = runEndedCalls[0];
      expect(data?.cause).toBe('cashout');
      expect(data?.heightM).toEqual(expect.any(Number));
      expect(data?.floors).toEqual(expect.any(Number));
    });

    it('should reset endedRef guard on restart and allow new wt2_run_ended event', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const { result } = renderHook(() => useTowerRun({ seed: undefined }));

      // First run: finish
      act(() => {
        result.current.finish();
      });

      let runEndedCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_run_ended');
      expect(runEndedCalls.length).toBe(1);

      // Clear mocks and restart
      vi.clearAllMocks();

      act(() => {
        result.current.restart();
      });

      // Second run: finish again
      act(() => {
        result.current.finish();
      });

      runEndedCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_run_ended');
      // Should have 1 event from the second run (first run's event was cleared)
      expect(runEndedCalls.length).toBe(1);
      expect(runEndedCalls[0]?.[1]?.cause).toBe('cashout');
    });
  });

});
