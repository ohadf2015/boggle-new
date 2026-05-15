import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCascadeRun } from '../cascade/useCascadeRun';

const makeDict = (...words: string[]) =>
  new Set(words.map((w) => w.toLowerCase()));

describe('cascade/useCascadeRun', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in intro phase with a filled grid', () => {
    const { result } = renderHook(() =>
      useCascadeRun({
        seed: 7,
        dict: makeDict('star'),
        locale: 'en',
        boardSize: 7,
        disableTicker: true,
      }),
    );
    expect(result.current.state.phase).toBe('intro');
    expect(result.current.state.grid.cells.length).toBe(49);
  });

  it('startRun transitions intro → playing', () => {
    const { result } = renderHook(() =>
      useCascadeRun({
        seed: 7,
        dict: makeDict('star'),
        locale: 'en',
        boardSize: 7,
        disableTicker: true,
      }),
    );
    act(() => result.current.startRun());
    expect(result.current.state.phase).toBe('playing');
  });

  it('tickFire advances fire row when ticker disabled', () => {
    const { result } = renderHook(() =>
      useCascadeRun({
        seed: 7,
        dict: makeDict('star'),
        locale: 'en',
        boardSize: 7,
        disableTicker: true,
      }),
    );
    act(() => result.current.startRun());
    act(() => result.current.tickFire(13_000));
    expect(result.current.state.fire.fireRow).toBe(1);
  });

  it('exposes restart that returns to intro', () => {
    const { result } = renderHook(() =>
      useCascadeRun({
        seed: 7,
        dict: makeDict('star'),
        locale: 'en',
        boardSize: 7,
        disableTicker: true,
      }),
    );
    act(() => result.current.startRun());
    act(() => result.current.tickFire(13_000));
    act(() => result.current.restart());
    expect(result.current.state.phase).toBe('intro');
    expect(result.current.state.fire.fireRow).toBe(0);
  });

  it('rAF ticker advances fire while playing', () => {
    let rafCb: ((ts: number) => void) | null = null;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useCascadeRun({
        seed: 7,
        dict: makeDict('star'),
        locale: 'en',
        boardSize: 7,
      }),
    );
    act(() => result.current.startRun());
    // Two RAF frames separated by 13s
    act(() => rafCb!(0));
    act(() => rafCb!(13_000));
    expect(result.current.state.fire.fireRow).toBe(1);

    rafSpy.mockRestore();
  });

  it('rAF ticker pauses when document hidden', () => {
    let rafCb: ((ts: number) => void) | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const visSpy = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');

    const { result } = renderHook(() =>
      useCascadeRun({
        seed: 7,
        dict: makeDict('star'),
        locale: 'en',
        boardSize: 7,
      }),
    );
    act(() => result.current.startRun());
    act(() => rafCb!(0));
    act(() => rafCb!(13_000));
    // Fire row should remain 0 because tab was hidden
    expect(result.current.state.fire.fireRow).toBe(0);
    visSpy.mockRestore();
  });
});
