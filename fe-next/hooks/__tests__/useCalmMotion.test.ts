import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * useCalmMotion is the canonical gate for PERPETUAL decorative motion. It is
 * true when EITHER the OS `prefers-reduced-motion` flag is set OR in-app Cozy
 * Mode is on — closing the blind spot where components gated infinite loops on
 * the OS flag alone, which the in-app cozy audience rarely sets.
 */

let osReduced = false;
let cosy = false;

vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => osReduced,
}));
vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => cosy,
}));

import { useCalmMotion } from '../useCalmMotion';

describe('useCalmMotion', () => {
  beforeEach(() => {
    osReduced = false;
    cosy = false;
  });

  it('is false when neither OS reduced-motion nor cozy is active (full motion)', () => {
    const { result } = renderHook(() => useCalmMotion());
    expect(result.current).toBe(false);
  });

  it('is true when only the OS prefers-reduced-motion flag is set', () => {
    osReduced = true;
    const { result } = renderHook(() => useCalmMotion());
    expect(result.current).toBe(true);
  });

  it('is true when only in-app Cozy Mode is on (the blind spot it closes)', () => {
    cosy = true;
    const { result } = renderHook(() => useCalmMotion());
    expect(result.current).toBe(true);
  });

  it('is true when both are active', () => {
    osReduced = true;
    cosy = true;
    const { result } = renderHook(() => useCalmMotion());
    expect(result.current).toBe(true);
  });
});
