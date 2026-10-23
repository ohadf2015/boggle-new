import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEduReducedMotion } from '@/lib/education/motion';
import { useCalmMotion } from '@/components/teacher/hq/useCalmMotion';

const stubMatchMedia = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

afterEach(() => vi.unstubAllGlobals());

describe('useEduReducedMotion', () => {
  it('is true when the OS asks for reduced motion', () => {
    stubMatchMedia(true);
    expect(renderHook(() => useEduReducedMotion()).result.current).toBe(true);
  });

  it('is false when neither the OS nor the in-app switch reduces motion', () => {
    stubMatchMedia(false);
    expect(renderHook(() => useEduReducedMotion()).result.current).toBe(false);
  });

  it('is the same hook HQ already uses, so the two never disagree', () => {
    expect(useCalmMotion).toBe(useEduReducedMotion);
  });
});
