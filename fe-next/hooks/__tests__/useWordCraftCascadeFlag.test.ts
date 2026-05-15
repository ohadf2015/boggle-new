import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../usePostHogFlag', () => ({
  usePostHogFlag: vi.fn(() => false),
}));

import { usePostHogFlag } from '../usePostHogFlag';
import { useWordCraftCascadeFlag } from '../useWordCraftCascadeFlag';

describe('useWordCraftCascadeFlag', () => {
  const origEnv = process.env.NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV;
  afterEach(() => {
    process.env.NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV = origEnv;
    vi.mocked(usePostHogFlag).mockReturnValue(false);
  });

  it('returns true when the PostHog flag is on', () => {
    vi.mocked(usePostHogFlag).mockReturnValue(true);
    process.env.NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV = '0';
    const { result } = renderHook(() => useWordCraftCascadeFlag());
    expect(result.current).toBe(true);
  });

  it('returns true when the dev override env var is set', () => {
    vi.mocked(usePostHogFlag).mockReturnValue(false);
    process.env.NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV = '1';
    const { result } = renderHook(() => useWordCraftCascadeFlag());
    expect(result.current).toBe(true);
  });

  it('returns false when neither the flag nor the override is set', () => {
    vi.mocked(usePostHogFlag).mockReturnValue(false);
    process.env.NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV = '0';
    const { result } = renderHook(() => useWordCraftCascadeFlag());
    expect(result.current).toBe(false);
  });
});
