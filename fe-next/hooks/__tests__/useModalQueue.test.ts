import { renderHook, act } from '@testing-library/react';
import { useModalQueue } from '../useModalQueue';

describe('useModalQueue', () => {
  it('returns null when no modals are ready', () => {
    const { result } = renderHook(() =>
      useModalQueue({
        modals: [
          { id: 'a', priority: 1, isReady: false },
          { id: 'b', priority: 2, isReady: false },
        ],
      })
    );
    expect(result.current.activeModalId).toBeNull();
  });

  it('returns the highest-priority ready modal', () => {
    const { result } = renderHook(() =>
      useModalQueue({
        modals: [
          { id: 'low', priority: 3, isReady: true },
          { id: 'high', priority: 1, isReady: true },
          { id: 'mid', priority: 2, isReady: true },
        ],
      })
    );
    expect(result.current.activeModalId).toBe('high');
  });

  it('advances to next modal after dismiss', () => {
    const { result } = renderHook(() =>
      useModalQueue({
        modals: [
          { id: 'first', priority: 1, isReady: true },
          { id: 'second', priority: 2, isReady: true },
        ],
      })
    );

    expect(result.current.activeModalId).toBe('first');

    act(() => {
      result.current.dismiss('first');
    });

    expect(result.current.activeModalId).toBe('second');
  });

  it('returns null after all ready modals are dismissed', () => {
    const { result } = renderHook(() =>
      useModalQueue({
        modals: [
          { id: 'only', priority: 1, isReady: true },
        ],
      })
    );

    act(() => {
      result.current.dismiss('only');
    });

    expect(result.current.activeModalId).toBeNull();
  });

  it('resets dismissed set when all modals become not-ready', () => {
    let modals = [
      { id: 'a', priority: 1, isReady: true },
      { id: 'b', priority: 2, isReady: true },
    ];

    const { result, rerender } = renderHook(() =>
      useModalQueue({ modals })
    );

    act(() => {
      result.current.dismiss('a');
      result.current.dismiss('b');
    });
    expect(result.current.activeModalId).toBeNull();

    // All modals become not-ready (new game cycle)
    modals = [
      { id: 'a', priority: 1, isReady: false },
      { id: 'b', priority: 2, isReady: false },
    ];
    rerender();

    // Now they become ready again — dismissed set should be reset
    modals = [
      { id: 'a', priority: 1, isReady: true },
      { id: 'b', priority: 2, isReady: true },
    ];
    rerender();

    expect(result.current.activeModalId).toBe('a');
  });

  it('skips modals that are not ready', () => {
    const { result } = renderHook(() =>
      useModalQueue({
        modals: [
          { id: 'a', priority: 1, isReady: false },
          { id: 'b', priority: 2, isReady: true },
        ],
      })
    );
    expect(result.current.activeModalId).toBe('b');
  });

  it('handles empty modals array', () => {
    const { result } = renderHook(() =>
      useModalQueue({ modals: [] })
    );
    expect(result.current.activeModalId).toBeNull();
  });
});
