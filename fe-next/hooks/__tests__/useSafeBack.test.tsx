/**
 * useSafeBack — "return to where you came from" for leaf pages with no
 * hierarchy parent. router.back() whenever there's a prior history entry (which
 * during SPA browsing is where they came from); otherwise push an explicit
 * fallback so a true deep-link never overshoots/leaves the site.
 *
 * We do NOT check document.referrer: it's frozen at document load and never
 * updates across pushState nav, so it can't distinguish in-app browsing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSafeBack } from '../useSafeBack';

const pushMock = vi.fn();
const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}));

function setHistoryLength(len: number) {
  Object.defineProperty(window.history, 'length', { configurable: true, value: len });
}

describe('useSafeBack', () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
  });

  it('goes back when there is prior history (the common in-app case)', () => {
    setHistoryLength(3);
    const { result } = renderHook(() => useSafeBack('/en'));
    result.current();
    expect(backMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('pushes the fallback on a true deep-link with no prior history', () => {
    setHistoryLength(1);
    const { result } = renderHook(() => useSafeBack('/he'));
    result.current();
    expect(pushMock).toHaveBeenCalledWith('/he');
    expect(backMock).not.toHaveBeenCalled();
  });
});
