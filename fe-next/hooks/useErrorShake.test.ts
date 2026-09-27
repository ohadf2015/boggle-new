import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// Capture the controls object framer hands back so we can assert on .start().
// Real useAnimationControls returns a STABLE ref across renders — mirror that,
// otherwise the effect's [signal, controls] dep would re-fire every render.
const startSpy = vi.fn();
const stableControls = { start: startSpy };
vi.mock('framer-motion', () => ({
  useAnimationControls: () => stableControls,
}));

import { useErrorShake } from './useErrorShake';

describe('useErrorShake', () => {
  beforeEach(() => startSpy.mockClear());

  it('does not shake on mount with no error', () => {
    renderHook(({ error }) => useErrorShake(error), {
      initialProps: { error: null as string | null },
    });
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('does not shake on mount that already has an error', () => {
    renderHook(({ error }) => useErrorShake(error), {
      initialProps: { error: 'stale' as string | null },
    });
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('shakes once when a new error appears', () => {
    const { rerender } = renderHook(({ error }) => useErrorShake(error), {
      initialProps: { error: null as string | null },
    });
    act(() => rerender({ error: 'Invalid email' }));
    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  it('does not shake when the error is cleared', () => {
    const { rerender } = renderHook(({ error }) => useErrorShake(error), {
      initialProps: { error: null as string | null },
    });
    act(() => rerender({ error: 'Invalid email' }));
    startSpy.mockClear();
    act(() => rerender({ error: null }));
    expect(startSpy).not.toHaveBeenCalled();
  });
});
