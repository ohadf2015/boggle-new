import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useV2Exit } from '../useV2Exit';
import * as exitTracking from '@/lib/wordTowerV2/exitTracking';

vi.mock('@/lib/wordTowerV2/exitTracking');

const mockT = (key: string) => key;

describe('useV2Exit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for leaveOpen when not requested', () => {
    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'composing',
        floors: 5,
        daily: false,
        finish: vi.fn(),
        bankRun: vi.fn(),
        router: { push: vi.fn() } as any,
        language: 'en',
        getScreen: () => 'run',
        t: mockT,
      })
    );

    expect(result.current.leaveDialog.open).toBe(false);
  });

  it('should open the dialog when requestExit is called mid-run (phase composing, floors > 0)', () => {
    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'composing',
        floors: 5,
        daily: false,
        finish: vi.fn(),
        bankRun: vi.fn(),
        router: { push: vi.fn() } as any,
        language: 'en',
        getScreen: () => 'run',
        t: mockT,
      })
    );

    act(() => {
      result.current.requestExit();
    });

    expect(result.current.leaveDialog.open).toBe(true);
  });

  it('should close the dialog on cancelLeave', () => {
    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'composing',
        floors: 5,
        daily: false,
        finish: vi.fn(),
        bankRun: vi.fn(),
        router: { push: vi.fn() } as any,
        language: 'en',
        getScreen: () => 'run',
        t: mockT,
      })
    );

    act(() => {
      result.current.requestExit();
    });
    expect(result.current.leaveDialog.open).toBe(true);

    act(() => {
      result.current.cancelLeave();
    });
    expect(result.current.leaveDialog.open).toBe(false);
  });

  it('should call finish on confirmLeave mid-run and close dialog', () => {
    const mockFinish = vi.fn();
    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'composing',
        floors: 5,
        daily: false,
        finish: mockFinish,
        bankRun: vi.fn(),
        router: { push: vi.fn() } as any,
        language: 'en',
        getScreen: () => 'run',
        t: mockT,      })
    );

    act(() => {
      result.current.requestExit();
    });

    act(() => {
      result.current.confirmLeave();
    });

    expect(mockFinish).toHaveBeenCalledOnce();
    expect(result.current.leaveDialog.open).toBe(false);
  });

  it('should not fire wt2_exit on confirm during mid-run (it fires later on actual exit)', () => {
    const mockTrackWt2Exit = vi.fn();
    vi.mocked(exitTracking.trackWt2Exit).mockImplementation(mockTrackWt2Exit);

    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'composing',
        floors: 5,
        daily: false,
        finish: vi.fn(),
        bankRun: vi.fn(),
        router: { push: vi.fn() } as any,
        language: 'en',
        getScreen: () => 'run',
        t: mockT,      })
    );

    act(() => {
      result.current.requestExit();
    });

    act(() => {
      result.current.confirmLeave();
    });

    expect(mockTrackWt2Exit).not.toHaveBeenCalled();
  });

  it('should fire wt2_exit when calling requestExit at phase over', async () => {
    const mockTrackWt2Exit = vi.fn();
    vi.mocked(exitTracking.trackWt2Exit).mockImplementation(mockTrackWt2Exit);
    const mockRouter = { push: vi.fn() };
    const mockBankRun = vi.fn(() => Promise.resolve());

    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'over',
        floors: 5,
        daily: false,
        finish: vi.fn(),
        bankRun: mockBankRun,
        router: mockRouter as any,
        language: 'en',
        getScreen: () => 'results',
        t: mockT,      })
    );

    await act(async () => {
      result.current.requestExit();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockTrackWt2Exit).toHaveBeenCalledOnce();
    expect(mockTrackWt2Exit).toHaveBeenCalledWith('results');
    expect(mockBankRun).toHaveBeenCalledOnce();
    expect(mockRouter.push).toHaveBeenCalledWith('/en');
  });

  it('should fire wt2_exit only once even if requestExit is called multiple times at phase over', async () => {
    const mockTrackWt2Exit = vi.fn();
    vi.mocked(exitTracking.trackWt2Exit).mockImplementation(mockTrackWt2Exit);
    const mockRouter = { push: vi.fn() };
    const mockBankRun = vi.fn(() => Promise.resolve());

    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'over',
        floors: 5,
        daily: false,
        finish: vi.fn(),
        bankRun: mockBankRun,
        router: mockRouter as any,
        language: 'en',
        getScreen: () => 'results',
        t: mockT,      })
    );

    await act(async () => {
      result.current.requestExit();
      result.current.requestExit();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockTrackWt2Exit).toHaveBeenCalledTimes(1);
  });

  it('should not open dialog when requestExit called with phase over (immediate exit)', async () => {
    const mockRouter = { push: vi.fn() };
    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'over',
        floors: 5,
        daily: false,
        finish: vi.fn(),
        bankRun: vi.fn(() => Promise.resolve()),
        router: mockRouter as any,
        language: 'en',
        getScreen: () => 'results',
        t: mockT,      })
    );

    await act(async () => {
      result.current.requestExit();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.leaveDialog.open).toBe(false);
  });

  it('should immediately exit when calling requestExit at phase over with 0 floors (no need to dialog)', async () => {
    const mockRouter = { push: vi.fn() };
    const mockTrackWt2Exit = vi.fn();
    vi.mocked(exitTracking.trackWt2Exit).mockImplementation(mockTrackWt2Exit);

    const { result } = renderHook(() =>
      useV2Exit({
        phase: 'over',
        floors: 0,
        daily: false,
        finish: vi.fn(),
        bankRun: vi.fn(() => Promise.resolve()),
        router: mockRouter as any,
        language: 'en',
        getScreen: () => 'home',
        t: mockT,      })
    );

    await act(async () => {
      result.current.requestExit();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockTrackWt2Exit).toHaveBeenCalledWith('home');
    expect(mockRouter.push).toHaveBeenCalled();
  });

  it('should resolve screen at tracking time, not call time (screen can change)', async () => {
    const mockTrackWt2Exit = vi.fn();
    vi.mocked(exitTracking.trackWt2Exit).mockImplementation(mockTrackWt2Exit);
    let screen: 'run' | 'results' = 'run';
    const getScreen = () => screen;

    const mockRouter = { push: vi.fn() };
    const { rerender } = renderHook(
      () =>
        useV2Exit({
          phase: 'composing',
          floors: 5,
          daily: false,
          finish: vi.fn(),
          bankRun: vi.fn(() => Promise.resolve()),
          router: mockRouter as any,
          language: 'en',
          getScreen,
          t: mockT,
        }),
      { initialProps: {} }
    );

    // Mid-run: request dialog
    const { result } = renderHook(
      () =>
        useV2Exit({
          phase: 'composing',
          floors: 5,
          daily: false,
          finish: vi.fn(),
          bankRun: vi.fn(() => Promise.resolve()),
          router: mockRouter as any,
          language: 'en',
          getScreen,
          t: mockT,
        }),
      { initialProps: {} }
    );

    act(() => {
      result.current.requestExit();
    });
    expect(result.current.leaveDialog.open).toBe(true);

    // Confirm and finish
    act(() => {
      result.current.confirmLeave();
    });

    // Rerender with phase 'over' (results ready)
    screen = 'results';
    // Simulate the effect of phase changing to 'over'
    // In the real app this happens via rerender, but we test the flow with manual call
    const { result: result2 } = renderHook(
      () =>
        useV2Exit({
          phase: 'over',
          floors: 5,
          daily: false,
          finish: vi.fn(),
          bankRun: vi.fn(() => Promise.resolve()),
          router: mockRouter as any,
          language: 'en',
          getScreen,
          t: mockT,
        }),
      { initialProps: {} }
    );

    // Now request exit at phase over
    await act(async () => {
      result2.current.requestExit();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockTrackWt2Exit).toHaveBeenCalledWith('results');
  });

  describe('leaveDialog prop structure', () => {
    it('should return leaveDialog with daily-specific copy when daily is true', () => {
      const mockT = vi.fn((key: string) => {
        const strings: Record<string, string> = {
          'wordTowerV2.leaveDaily.title': 'Leave today\'s climb?',
          'wordTowerV2.leaveDaily.desc': 'Leaving ends today\'s climb. Your height counts.',
          'wordTowerV2.leaveFree.title': 'Leave this climb?',
          'wordTowerV2.leaveFree.desc': 'Leaving cashes out your coins.',
          'wordTowerV2.leaveKeep': 'Keep climbing',
          'wordTowerV2.leaveGo': 'Leave',
        };
        return strings[key] || key;
      });

      const { result } = renderHook(() =>
        useV2Exit({
          phase: 'composing',
          floors: 5,
          daily: true,
          finish: vi.fn(),
          bankRun: vi.fn(),
          router: { push: vi.fn() } as any,
          language: 'en',
          getScreen: () => 'run',
        t: mockT,          t: mockT,
        })
      );

      expect(result.current.leaveDialog).toBeDefined();
      expect(result.current.leaveDialog.title).toBe('Leave today\'s climb?');
      expect(result.current.leaveDialog.description).toBe('Leaving ends today\'s climb. Your height counts.');
    });

    it('should return leaveDialog with free-run-specific copy when daily is false', () => {
      const mockT = vi.fn((key: string) => {
        const strings: Record<string, string> = {
          'wordTowerV2.leaveDaily.title': 'Leave today\'s climb?',
          'wordTowerV2.leaveDaily.desc': 'Leaving ends today\'s climb. Your height counts.',
          'wordTowerV2.leaveFree.title': 'Leave this climb?',
          'wordTowerV2.leaveFree.desc': 'Leaving cashes out your coins.',
          'wordTowerV2.leaveKeep': 'Keep climbing',
          'wordTowerV2.leaveGo': 'Leave',
        };
        return strings[key] || key;
      });

      const { result } = renderHook(() =>
        useV2Exit({
          phase: 'composing',
          floors: 5,
          daily: false,
          finish: vi.fn(),
          bankRun: vi.fn(),
          router: { push: vi.fn() } as any,
          language: 'en',
          getScreen: () => 'run',
        t: mockT,          t: mockT,
        })
      );

      expect(result.current.leaveDialog).toBeDefined();
      expect(result.current.leaveDialog.title).toBe('Leave this climb?');
      expect(result.current.leaveDialog.description).toBe('Leaving cashes out your coins.');
    });
  });

  describe('goHome callback', () => {
    it('should fire wt2_exit once when goHome is called at phase over', async () => {
      const mockTrackWt2Exit = vi.fn();
      vi.mocked(exitTracking.trackWt2Exit).mockImplementation(mockTrackWt2Exit);
      const mockRouter = { push: vi.fn() };
      const mockBankRun = vi.fn(() => Promise.resolve());
      const mockT = vi.fn((key: string) => key);

      const { result } = renderHook(() =>
        useV2Exit({
          phase: 'over',
          floors: 5,
          daily: false,
          finish: vi.fn(),
          bankRun: mockBankRun,
          router: mockRouter as any,
          language: 'en',
          getScreen: () => 'results',
        t: mockT,          t: mockT,
        })
      );

      await act(async () => {
        result.current.goHome();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(mockTrackWt2Exit).toHaveBeenCalledOnce();
      expect(mockTrackWt2Exit).toHaveBeenCalledWith('results');
      expect(mockBankRun).toHaveBeenCalledOnce();
      expect(mockRouter.push).toHaveBeenCalledWith('/en');
    });

    it('should fire wt2_exit only once even if goHome is called multiple times at phase over', async () => {
      const mockTrackWt2Exit = vi.fn();
      vi.mocked(exitTracking.trackWt2Exit).mockImplementation(mockTrackWt2Exit);
      const mockRouter = { push: vi.fn() };
      const mockBankRun = vi.fn(() => Promise.resolve());
      const mockT = vi.fn((key: string) => key);

      const { result } = renderHook(() =>
        useV2Exit({
          phase: 'over',
          floors: 5,
          daily: false,
          finish: vi.fn(),
          bankRun: mockBankRun,
          router: mockRouter as any,
          language: 'en',
          getScreen: () => 'results',
        t: mockT,          t: mockT,
        })
      );

      await act(async () => {
        result.current.goHome();
        result.current.goHome();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(mockTrackWt2Exit).toHaveBeenCalledTimes(1);
    });
  });
});
