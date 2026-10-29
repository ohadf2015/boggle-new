/**
 * exp-mp-auto-continue-v1: the results screen's existing auto-advance ring,
 * extended. control keeps today's behaviour exactly; auto-continue also rolls
 * the series-final screen into a new series and scopes a cancel to one screen.
 * Classrooms never auto-advance (the teacher paces the room) in either arm.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockExperiment, mockTrack } = vi.hoisted(() => ({
  mockExperiment: { variant: 'control' as string, trackExposure: vi.fn() },
  mockTrack: vi.fn(),
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => mockExperiment }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => mockTrack(...a) }));

import { autoContinuePlan, useMpAutoContinue } from '../useMpAutoContinue';
import { AUTO_ADVANCE_CANCEL_KEY } from '../useAutoAdvance';

type Args = Parameters<typeof useMpAutoContinue>[0];
const handlers = () => ({ onStartNext: vi.fn(), onNewSeries: vi.fn(), onReady: vi.fn() });
const args = (over: Partial<Args> = {}): Args => ({
  branch: 'intermission', isClassroom: false, isHost: true, isReady: false,
  armed: true, paused: false, persistCancel: true, ...handlers(), ...over,
});

describe('autoContinuePlan', () => {
  it('control: between rounds only, cancel lasts the session (today)', () => {
    expect(autoContinuePlan({ variant: 'control', branch: 'intermission', isClassroom: false, isHost: true, isReady: false }))
      .toEqual({ enabled: true, cancelScope: 'session', action: 'start', labelKey: 'mpUi.results.autoIn' });
    expect(autoContinuePlan({ variant: 'control', branch: 'final', isClassroom: false, isHost: true, isReady: false }).enabled).toBe(false);
  });

  it('auto-continue: the series final rolls into a new series (host) / ready (joiner)', () => {
    expect(autoContinuePlan({ variant: 'auto-continue', branch: 'final', isClassroom: false, isHost: true, isReady: false }))
      .toEqual({ enabled: true, cancelScope: 'screen', action: 'newSeries', labelKey: 'mpUi.results.autoRematchIn' });
    expect(autoContinuePlan({ variant: 'auto-continue', branch: 'final', isClassroom: false, isHost: false, isReady: false }).action).toBe('ready');
  });

  it.each(['control', 'auto-continue'])('%s: never in a classroom, never for a joiner who is already in', (variant) => {
    for (const branch of ['intermission', 'final'] as const) {
      expect(autoContinuePlan({ variant, branch, isClassroom: true, isHost: true, isReady: false }).enabled).toBe(false);
      expect(autoContinuePlan({ variant, branch, isClassroom: false, isHost: false, isReady: true }).enabled).toBe(false);
    }
  });

  it('nothing before the branch is locked', () => {
    expect(autoContinuePlan({ variant: 'auto-continue', branch: null, isClassroom: false, isHost: true, isReady: false }).enabled).toBe(false);
  });
});

describe('useMpAutoContinue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mockExperiment.variant = 'control';
    mockExperiment.trackExposure.mockClear();
    mockTrack.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('control, host between rounds: starts the next round after 10s', () => {
    const a = args();
    renderHook(() => useMpAutoContinue(a));
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(a.onStartNext).toHaveBeenCalledTimes(1);
  });

  it('control, series final: no ring (today)', () => {
    const a = args({ branch: 'final' });
    const { result } = renderHook(() => useMpAutoContinue(a));
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(result.current.active).toBe(false);
    expect(a.onNewSeries).not.toHaveBeenCalled();
  });

  it('auto-continue, host on the series final: a new series starts after the countdown', () => {
    mockExperiment.variant = 'auto-continue';
    const a = args({ branch: 'final' });
    const { result } = renderHook(() => useMpAutoContinue(a));
    expect(result.current.labelKey).toBe('mpUi.results.autoRematchIn');
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(a.onNewSeries).toHaveBeenCalledTimes(1);
    expect(a.onStartNext).not.toHaveBeenCalled();
  });

  it('auto-continue, joiner on the series final: readies up (the host starts the room)', () => {
    mockExperiment.variant = 'auto-continue';
    const a = args({ branch: 'final', isHost: false });
    renderHook(() => useMpAutoContinue(a));
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(a.onReady).toHaveBeenCalledTimes(1);
    expect(a.onNewSeries).not.toHaveBeenCalled();
  });

  it('auto-continue: a cancel stops this screen and is not carried to the next one', () => {
    mockExperiment.variant = 'auto-continue';
    const a = args();
    const { result } = renderHook(() => useMpAutoContinue(a));
    act(() => { result.current.cancel(); });
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(a.onStartNext).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(AUTO_ADVANCE_CANCEL_KEY)).toBeNull();
  });

  it('control: a cancel is remembered for the session (today)', () => {
    const { result } = renderHook(() => useMpAutoContinue(args()));
    act(() => { result.current.cancel(); });
    expect(sessionStorage.getItem(AUTO_ADVANCE_CANCEL_KEY)).toBe('1');
  });

  it('classroom: no ring in either arm', () => {
    mockExperiment.variant = 'auto-continue';
    const a = args({ isClassroom: true, branch: 'final' });
    const { result } = renderHook(() => useMpAutoContinue(a));
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(result.current.active).toBe(false);
    expect(a.onNewSeries).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('fires replay_countdown_shown once when the ring starts counting, with the arm', () => {
    const { rerender } = renderHook((p: { armed: boolean }) => useMpAutoContinue(args({ armed: p.armed })), { initialProps: { armed: false } });
    expect(mockTrack).not.toHaveBeenCalled();
    rerender({ armed: true });
    rerender({ armed: true });
    const shown = mockTrack.mock.calls.filter((c) => c[0] === 'replay_countdown_shown');
    expect(shown).toHaveLength(1);
    expect(shown[0][1]).toMatchObject({ surface: 'mp_results', branch: 'intermission', role: 'host', seconds: 10, variant: 'control' });
    expect(mockExperiment.trackExposure).toHaveBeenCalled();
  });

  it('fires results_autoplay_cancelled with the seconds that were left', () => {
    const { result } = renderHook(() => useMpAutoContinue(args({ isHost: false })));
    act(() => { vi.advanceTimersByTime(3_000); });
    act(() => { result.current.cancel(); });
    expect(mockTrack).toHaveBeenCalledWith('results_autoplay_cancelled', expect.objectContaining({ surface: 'mp_results', role: 'player', seconds_left: 7 }));
  });
});
