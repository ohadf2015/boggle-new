import { renderHook, act } from '@testing-library/react';
import { useReducedEffects, setReducedEffects } from './useReducedEffects';

const STORAGE_KEY = 'boggle_reduce_effects';

describe('useReducedEffects', () => {
  beforeEach(() => {
    // Reset the shared module store + persisted value before each test.
    setReducedEffects(false);
    window.localStorage.clear();
  });

  it('defaults to false (effects ON) when nothing is persisted', () => {
    const { result } = renderHook(() => useReducedEffects());
    expect(result.current[0]).toBe(false);
  });

  it('toggle() turns effects-reduction on and persists it', () => {
    const { result } = renderHook(() => useReducedEffects());

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('toggle() twice returns to false', () => {
    const { result } = renderHook(() => useReducedEffects());

    act(() => result.current[1]());
    act(() => result.current[1]());

    expect(result.current[0]).toBe(false);
  });

  it('setReducedEffects updates an already-mounted hook (reactive store)', () => {
    const { result } = renderHook(() => useReducedEffects());

    act(() => {
      setReducedEffects(true);
    });

    expect(result.current[0]).toBe(true);
  });

  it('keeps two independent hook instances in sync', () => {
    const a = renderHook(() => useReducedEffects());
    const b = renderHook(() => useReducedEffects());

    act(() => {
      a.result.current[1]();
    });

    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
  });

  it('reads a previously persisted value on a fresh module load', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    vi.resetModules();

    const fresh = await import('./useReducedEffects');
    const { result } = renderHook(() => fresh.useReducedEffects());

    expect(result.current[0]).toBe(true);
  });
});
