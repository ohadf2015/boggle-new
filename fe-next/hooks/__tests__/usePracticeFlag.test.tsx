import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

import { usePracticeFlag } from '../usePracticeFlag';

describe('usePracticeFlag', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('returns true when ?practice=1', () => {
    mockGet.mockImplementation((k: string) => (k === 'practice' ? '1' : null));
    const { result } = renderHook(() => usePracticeFlag());
    expect(result.current).toBe(true);
  });

  it('returns true for ?practice=true (lenient)', () => {
    mockGet.mockImplementation((k: string) => (k === 'practice' ? 'true' : null));
    const { result } = renderHook(() => usePracticeFlag());
    expect(result.current).toBe(true);
  });

  it('returns false when flag missing', () => {
    mockGet.mockReturnValue(null);
    const { result } = renderHook(() => usePracticeFlag());
    expect(result.current).toBe(false);
  });

  it('returns false for ?practice=0 (explicit off)', () => {
    mockGet.mockImplementation((k: string) => (k === 'practice' ? '0' : null));
    const { result } = renderHook(() => usePracticeFlag());
    expect(result.current).toBe(false);
  });

  it('returns false for unrelated truthy strings', () => {
    mockGet.mockImplementation((k: string) => (k === 'practice' ? 'no' : null));
    const { result } = renderHook(() => usePracticeFlag());
    expect(result.current).toBe(false);
  });
});
