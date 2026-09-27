import { renderHook, act } from '@testing-library/react';
import { useFirstTouchKbDemo } from '../useFirstTouchKbDemo';

beforeEach(() => {
  window.localStorage.clear();
});

describe('useFirstTouchKbDemo', () => {
  it('returns shouldShow=true on first MP game ever', () => {
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    expect(result.current.shouldShow).toBe(true);
  });

  it('returns shouldShow=false after markSeen()', () => {
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    act(() => result.current.markSeen());
    expect(result.current.shouldShow).toBe(false);
  });

  it('persists across re-mount: returns false on subsequent mount after markSeen', () => {
    const first = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    act(() => first.result.current.markSeen());
    first.unmount();
    const second = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    expect(second.result.current.shouldShow).toBe(false);
  });

  it('respects disabled flag', () => {
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: false }));
    expect(result.current.shouldShow).toBe(false);
  });

  it('disabled flag does NOT consume the seen flag', () => {
    const first = renderHook(() => useFirstTouchKbDemo({ enabled: false }));
    first.unmount();
    const second = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    expect(second.result.current.shouldShow).toBe(true);
  });
});
