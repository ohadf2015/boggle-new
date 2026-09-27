import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveWt2Screen, trackWt2Exit, trackWt2ExitOnce } from '../exitTracking';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/utils/growthTracking');

const baseState = () => ({
  dictError: false,
  dictReady: true,
  phase: 'composing' as const,
  showOver: false,
  resultsReady: false,
  forceResults: false,
  district: false,
  raiding: false,
  smashing: false,
  floors: 5,
});

describe('wt2_exit tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveWt2Screen', () => {
    it('should resolve to error when dictError is true', () => {
      expect(resolveWt2Screen({ ...baseState(), dictError: true })).toBe('error');
    });

    it('should resolve to loading when dictReady is false', () => {
      expect(resolveWt2Screen({ ...baseState(), dictReady: false })).toBe('loading');
    });

    it('should resolve to wreck when smashing is true (highest priority)', () => {
      expect(
        resolveWt2Screen({
          ...baseState(),
          smashing: true,
          district: true,
          raiding: true,
        }),
      ).toBe('wreck');
    });

    it('should resolve to raid when raiding is true', () => {
      expect(
        resolveWt2Screen({
          ...baseState(),
          raiding: true,
          district: true,
        }),
      ).toBe('raid');
    });

    it('should resolve to estate when district is true', () => {
      expect(resolveWt2Screen({ ...baseState(), district: true })).toBe('estate');
    });

    it('should resolve to results when showOver is true and resultsReady is true', () => {
      expect(
        resolveWt2Screen({ ...baseState(), showOver: true, resultsReady: true }),
      ).toBe('results');
    });

    it('should resolve to results when forceResults is true', () => {
      expect(resolveWt2Screen({ ...baseState(), forceResults: true })).toBe('results');
    });

    it('should resolve to run during composing phase', () => {
      expect(resolveWt2Screen({ ...baseState(), phase: 'composing' })).toBe('run');
    });

    it('should resolve to run during swinging phase', () => {
      expect(resolveWt2Screen({ ...baseState(), phase: 'swinging' })).toBe('run');
    });

    it('should resolve to run when phase is over but floors > 0', () => {
      expect(resolveWt2Screen({ ...baseState(), phase: 'over', floors: 10 })).toBe('run');
    });

    it('should resolve to home when phase is over and floors are 0', () => {
      expect(resolveWt2Screen({ ...baseState(), phase: 'over', floors: 0 })).toBe('home');
    });

    it('should resolve to home when composing with no floors (lobby)', () => {
      expect(resolveWt2Screen({ ...baseState(), phase: 'composing', floors: 0 })).toBe('home');
    });
  });

  describe('trackWt2Exit', () => {
    it('should fire wt2_exit event with the screen name', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);

      trackWt2Exit('run');

      expect(mockTrack).toHaveBeenCalledWith('wt2_exit', { from: 'run' });
    });

    it('should fire exactly once per call', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);

      trackWt2Exit('run');
      trackWt2Exit('results');

      const exitCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_exit');
      expect(exitCalls.length).toBe(2);
      expect(exitCalls[0]?.[1]).toEqual({ from: 'run' });
      expect(exitCalls[1]?.[1]).toEqual({ from: 'results' });
    });

    it('should fire for all screen types', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const screens = ['home', 'run', 'results', 'estate', 'raid', 'wreck', 'loading', 'error'] as const;

      screens.forEach((screen) => trackWt2Exit(screen));

      const exitCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_exit');
      expect(exitCalls.length).toBe(screens.length);

      screens.forEach((screen, i) => {
        expect(exitCalls[i]?.[1]).toEqual({ from: screen });
      });
    });
  });

  describe('trackWt2ExitOnce', () => {
    it('should fire once on first call', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const guard = { current: false };

      trackWt2ExitOnce(guard, 'run');

      const exitCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_exit');
      expect(exitCalls.length).toBe(1);
      expect(exitCalls[0]?.[1]).toEqual({ from: 'run' });
    });

    it('should not fire on second call', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const guard = { current: false };

      trackWt2ExitOnce(guard, 'run');
      trackWt2ExitOnce(guard, 'results');

      const exitCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_exit');
      expect(exitCalls.length).toBe(1);
      expect(exitCalls[0]?.[1]).toEqual({ from: 'run' });
    });
  });
});
