import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { TAP_MIN, IDLE_MS, ESCALATE_MS } from '../../lib/ftue/mpStuckCoach';
import { stuckCoachKey } from '../../lib/ftue/stuckCoachMemory';

const shownSpy = vi.fn();
const outcomeSpy = vi.fn();
vi.mock('../../utils/posthogEngagement', () => ({
  trackMpStuckCoachShown: (...a: unknown[]) => shownSpy(...a),
  trackMpStuckCoachOutcome: (...a: unknown[]) => outcomeSpy(...a),
}));

let exampleWord: string | null = 'cat';
vi.mock('../useCoachExampleWord', () => ({ useCoachExampleWord: () => exampleWord }));

import { useStuckCoach, AUTO_HIDE_MS, type UseStuckCoachArgs } from '../useStuckCoach';
import { setCoachOnScreen } from '../../lib/tutorial/modeCoachStore';

function args(overrides: Partial<UseStuckCoachArgs> = {}): UseStuckCoachArgs {
  return { mode: 'classic', active: true, wordsFound: 0, totalGamesPlayed: 0, isDesktop: false, ...overrides };
}

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('useStuckCoach', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    exampleWord = 'cat';
    setCoachOnScreen(false);
    shownSpy.mockClear();
    outcomeSpy.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows tap-hint after repeated single taps and remembers the mode at show-time', () => {
    const { result } = renderHook(() => useStuckCoach(args()));
    act(() => {
      for (let i = 0; i < TAP_MIN; i++) result.current.markTap();
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.stage).toBe('tap-hint');
    expect(shownSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: 'tap-hint', mode: 'classic' }));
    expect(localStorage.getItem(stuckCoachKey('classic'))).toBe('shown');
  });

  it('given a generic mode, nudges after IDLE_MS of no activity, and activity restarts the clock', () => {
    const { result } = renderHook(() => useStuckCoach(args({ mode: 'blast', totalGamesPlayed: undefined })));
    tick(IDLE_MS - 2000);
    act(() => result.current.markActivity());
    tick(IDLE_MS - 1000);
    expect(result.current.visible).toBe(false);
    tick(2000);
    expect(result.current.stage).toBe('idle-nudge');
    expect(shownSpy).toHaveBeenCalledWith(expect.objectContaining({ mode: 'blast' }));
  });

  it('reports "helped" when the mode counts its first word while the card is up', () => {
    const { result, rerender } = renderHook((p: UseStuckCoachArgs) => useStuckCoach(p), { initialProps: args() });
    tick(IDLE_MS + 1000);
    expect(result.current.visible).toBe(true);
    tick(2000);
    rerender(args({ wordsFound: 1 }));
    expect(result.current.visible).toBe(false);
    expect(outcomeSpy).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'helped', mode: 'classic' }));
    expect(localStorage.getItem(stuckCoachKey('classic'))).toBe('found');
  });

  it('escalates an ignored nudge to a real word from the board, then never shows a third card', () => {
    const { result } = renderHook(() => useStuckCoach(args()));
    tick(IDLE_MS + 1000);
    expect(result.current.stage).toBe('idle-nudge');
    tick(AUTO_HIDE_MS);
    expect(result.current.visible).toBe(false);
    expect(outcomeSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: 'idle-nudge', outcome: 'ignored' }));

    tick(ESCALATE_MS + 1000);
    expect(result.current.stage).toBe('example');
    expect(result.current.exampleWord).toBe('cat');

    tick(AUTO_HIDE_MS + 60_000);
    expect(shownSpy).toHaveBeenCalledTimes(2);
    expect(result.current.visible).toBe(false);
  });

  it('does not escalate without a word to show (wheel modes)', () => {
    exampleWord = null;
    const { result } = renderHook(() => useStuckCoach(args({ mode: 'wheelRush', totalGamesPlayed: undefined })));
    tick(IDLE_MS + 1000);
    tick(AUTO_HIDE_MS + ESCALATE_MS + 30_000);
    expect(shownSpy).toHaveBeenCalledTimes(1);
    expect(result.current.visible).toBe(false);
  });

  it('"Got it" ends the episode: dismissed outcome, callback, no escalation', () => {
    const onDismissed = vi.fn();
    const { result } = renderHook(() => useStuckCoach(args({ onDismissed })));
    tick(IDLE_MS + 1000);
    act(() => result.current.dismiss());
    expect(outcomeSpy).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'dismissed' }));
    expect(onDismissed).toHaveBeenCalledTimes(1);
    tick(ESCALATE_MS + 30_000);
    expect(shownSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onShown with the stage so modes keep their legacy events', () => {
    const onShown = vi.fn();
    renderHook(() => useStuckCoach(args({ onShown })));
    tick(IDLE_MS + 1000);
    expect(onShown).toHaveBeenCalledWith('idle-nudge');
  });

  it('never shows for classic veterans', () => {
    const { result } = renderHook(() => useStuckCoach(args({ totalGamesPlayed: 5 })));
    tick(IDLE_MS * 3);
    expect(result.current.visible).toBe(false);
  });

  it('is once-ever per mode: a later round on this device stays silent', () => {
    const first = renderHook(() => useStuckCoach(args({ mode: 'blast' })));
    tick(IDLE_MS + 1000);
    first.unmount();
    shownSpy.mockClear();

    const later = renderHook(() => useStuckCoach(args({ mode: 'blast' })));
    tick(IDLE_MS * 3);
    expect(later.result.current.visible).toBe(false);
    expect(shownSpy).not.toHaveBeenCalled();
  });

  it('a word found in a mode marks the player experienced there, even with no coach shown', () => {
    const first = renderHook((p: UseStuckCoachArgs) => useStuckCoach(p), { initialProps: args({ mode: 'dailyWheel' }) });
    first.rerender(args({ mode: 'dailyWheel', wordsFound: 2 }));
    first.unmount();

    const later = renderHook(() => useStuckCoach(args({ mode: 'dailyWheel' })));
    tick(IDLE_MS * 3);
    expect(later.result.current.visible).toBe(false);
  });

  it('stays silent while inactive', () => {
    const { result } = renderHook(() => useStuckCoach(args({ active: false })));
    tick(IDLE_MS * 3);
    expect(result.current.visible).toBe(false);
  });

  it('returns a stable reference across renders when nothing changed', () => {
    const { result, rerender } = renderHook(() => useStuckCoach(args()));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('stays quiet while a mode coach card is on screen, and counts idle only from its dismissal', () => {
    setCoachOnScreen(true);
    const { result } = renderHook(() => useStuckCoach(args()));
    tick(20_000);
    expect(result.current.visible).toBe(false);
    act(() => { setCoachOnScreen(false); vi.advanceTimersByTime(5_000); });
    expect(result.current.visible).toBe(false);
    tick(10_000);
    expect(result.current.stage).toBe('idle-nudge');
  });

  describe('dead-time telemetry (ungated)', () => {
    it('fires once per session after the threshold, even for a coached mode or under a mode coach', () => {
      localStorage.setItem(stuckCoachKey('blast'), 'found');
      setCoachOnScreen(true);
      const onDeadTime = vi.fn();
      const { result, rerender } = renderHook((p: UseStuckCoachArgs) => useStuckCoach(p), {
        initialProps: args({ mode: 'blast', sessionKey: 1, deadTime: { enabled: true, thresholdMs: 15_000, onDeadTime } }),
      });
      tick(10_000);
      act(() => result.current.markActivity());
      tick(14_000);
      expect(onDeadTime).not.toHaveBeenCalled();
      tick(2_000);
      expect(onDeadTime).toHaveBeenCalledTimes(1);
      tick(60_000);
      expect(onDeadTime).toHaveBeenCalledTimes(1);

      rerender(args({ mode: 'blast', sessionKey: 2, deadTime: { enabled: true, thresholdMs: 15_000, onDeadTime } }));
      tick(16_000);
      expect(onDeadTime).toHaveBeenCalledTimes(2);
    });

    it('restarts its clock when tracking turns back on (pause, late board)', () => {
      const onDeadTime = vi.fn();
      const { rerender } = renderHook((p: UseStuckCoachArgs) => useStuckCoach(p), {
        initialProps: args({ active: false, deadTime: { enabled: false, thresholdMs: 15_000, onDeadTime } }),
      });
      tick(20_000);
      rerender(args({ active: false, deadTime: { enabled: true, thresholdMs: 15_000, onDeadTime } }));
      tick(2_000);
      expect(onDeadTime).not.toHaveBeenCalled();
      tick(14_000);
      expect(onDeadTime).toHaveBeenCalledTimes(1);
    });

    it('runs while the coach itself is inactive', () => {
      const onDeadTime = vi.fn();
      renderHook(() => useStuckCoach(args({ active: false, deadTime: { enabled: true, thresholdMs: 15_000, onDeadTime } })));
      tick(16_000);
      expect(onDeadTime).toHaveBeenCalledTimes(1);
    });
  });
});
