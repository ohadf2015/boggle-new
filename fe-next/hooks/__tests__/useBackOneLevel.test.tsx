/**
 * useBackOneLevel — returns a callback that navigates exactly one level up the
 * URL hierarchy (router.push(parent)), using router.back() only as an
 * optimization when we genuinely arrived from the parent (referrer === parent).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBackOneLevel } from '../useBackOneLevel';

const pushMock = vi.fn();
const backMock = vi.fn();
let currentPath = '/en/daily/archive';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  usePathname: () => currentPath,
}));

function setReferrer(value: string) {
  Object.defineProperty(document, 'referrer', { configurable: true, value });
}

describe('useBackOneLevel', () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    setReferrer('');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://lexiclash.live' },
    });
  });
  afterEach(() => setReferrer(''));

  it('pushes the hierarchical parent by default (no useful referrer)', () => {
    currentPath = '/en/daily/archive';
    const { result } = renderHook(() => useBackOneLevel());
    result.current();
    expect(pushMock).toHaveBeenCalledWith('/en/daily');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('uses router.back() when the referrer IS the parent (same origin)', () => {
    currentPath = '/en/daily/archive';
    setReferrer('https://lexiclash.live/en/daily');
    const { result } = renderHook(() => useBackOneLevel());
    result.current();
    expect(backMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('pushes parent (not back) when referrer is a different page', () => {
    currentPath = '/en/daily/archive';
    setReferrer('https://lexiclash.live/en/profile');
    const { result } = renderHook(() => useBackOneLevel());
    result.current();
    expect(pushMock).toHaveBeenCalledWith('/en/daily');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('pushes parent (not back) when referrer is a foreign origin', () => {
    currentPath = '/en/daily/archive';
    setReferrer('https://google.com/en/daily');
    const { result } = renderHook(() => useBackOneLevel());
    result.current();
    expect(pushMock).toHaveBeenCalledWith('/en/daily');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('honors an explicit parent override', () => {
    currentPath = '/en/teacher/classroom/abc/analytics';
    const { result } = renderHook(() => useBackOneLevel('/en/teacher'));
    result.current();
    expect(pushMock).toHaveBeenCalledWith('/en/teacher');
  });
});
