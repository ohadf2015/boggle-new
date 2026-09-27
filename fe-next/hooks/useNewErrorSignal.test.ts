import { renderHook, act } from '@testing-library/react';
import { useNewErrorSignal } from './useNewErrorSignal';

/**
 * useNewErrorSignal drives shake/feedback animations on form errors.
 * It must fire ONLY when a genuinely new error appears — never on mount of an
 * already-errored field, never when an error is cleared, never on an unrelated
 * re-render with the same error. Each distinct new error re-arms the signal so
 * the animation can replay.
 */
describe('useNewErrorSignal', () => {
  it('starts at 0 with no error', () => {
    const { result } = renderHook(({ error }) => useNewErrorSignal(error), {
      initialProps: { error: null as string | null },
    });
    expect(result.current).toBe(0);
  });

  it('does NOT fire when a field mounts already showing an error', () => {
    // Re-opening a form that still has a stale error should not shake on mount.
    const { result } = renderHook(({ error }) => useNewErrorSignal(error), {
      initialProps: { error: 'Invalid email' as string | null },
    });
    expect(result.current).toBe(0);
  });

  it('fires once when an error first appears', () => {
    const { result, rerender } = renderHook(
      ({ error }) => useNewErrorSignal(error),
      { initialProps: { error: null as string | null } },
    );
    act(() => rerender({ error: 'Invalid email' }));
    expect(result.current).toBe(1);
  });

  it('does NOT re-fire on a re-render with the SAME error', () => {
    const { result, rerender } = renderHook(
      ({ error }) => useNewErrorSignal(error),
      { initialProps: { error: null as string | null } },
    );
    act(() => rerender({ error: 'Invalid email' }));
    act(() => rerender({ error: 'Invalid email' }));
    expect(result.current).toBe(1);
  });

  it('does NOT fire when the error is cleared', () => {
    const { result, rerender } = renderHook(
      ({ error }) => useNewErrorSignal(error),
      { initialProps: { error: null as string | null } },
    );
    act(() => rerender({ error: 'Invalid email' }));
    act(() => rerender({ error: null }));
    expect(result.current).toBe(1);
  });

  it('re-fires when the error changes to a DIFFERENT message', () => {
    const { result, rerender } = renderHook(
      ({ error }) => useNewErrorSignal(error),
      { initialProps: { error: null as string | null } },
    );
    act(() => rerender({ error: 'Invalid email' }));
    act(() => rerender({ error: 'Email already taken' }));
    expect(result.current).toBe(2);
  });

  it('treats empty string as no error', () => {
    const { result, rerender } = renderHook(
      ({ error }) => useNewErrorSignal(error),
      { initialProps: { error: '' as string | null } },
    );
    act(() => rerender({ error: '' }));
    expect(result.current).toBe(0);
  });

  it('re-arms across appear → clear → reappear', () => {
    const { result, rerender } = renderHook(
      ({ error }) => useNewErrorSignal(error),
      { initialProps: { error: null as string | null } },
    );
    act(() => rerender({ error: 'A' }));
    act(() => rerender({ error: null }));
    act(() => rerender({ error: 'B' }));
    expect(result.current).toBe(2);
  });
});
