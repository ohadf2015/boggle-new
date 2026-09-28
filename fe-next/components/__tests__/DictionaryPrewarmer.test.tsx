import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prewarmMock = vi.fn();
const pathnameMock = vi.fn<() => string | null>(() => '/en/singleplayer');

vi.mock('@/hooks/useDictionaryCache', () => ({
  prewarmDictionary: (lang: string) => prewarmMock(lang),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

import DictionaryPrewarmer from '../DictionaryPrewarmer';

describe('DictionaryPrewarmer', () => {
  beforeEach(() => {
    prewarmMock.mockReset();
    prewarmMock.mockResolvedValue(undefined);
    pathnameMock.mockReturnValue('/en/blog');
    try { localStorage.clear(); } catch { /* jsdom */ }
  });

  it('prewarms eagerly on non-game nested routes (no idle/timeout deferral)', () => {
    pathnameMock.mockReturnValue('/en/blog');
    render(<DictionaryPrewarmer lang="en" />);
    expect(prewarmMock).toHaveBeenCalledWith('en');
  });

  it('does not fetch the 704KB dictionary during the /singleplayer LCP window', () => {
    pathnameMock.mockReturnValue('/en/singleplayer');
    render(<DictionaryPrewarmer lang="en" />);
    expect(prewarmMock).not.toHaveBeenCalled();
  });

  it('never warms the dictionary on /singleplayer (idle is still inside the PSI load window)', () => {
    vi.useFakeTimers();
    const ric = (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback;
    pathnameMock.mockReturnValue('/en/singleplayer');
    render(<DictionaryPrewarmer lang="en" />);
    expect(prewarmMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(prewarmMock).not.toHaveBeenCalled();
    vi.useRealTimers();
    if (ric) (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback = ric;
  });

  it('re-prewarms when the language changes', () => {
    pathnameMock.mockReturnValue('/en/blog');
    const { rerender } = render(<DictionaryPrewarmer lang="en" />);
    prewarmMock.mockClear();
    rerender(<DictionaryPrewarmer lang="he" />);
    expect(prewarmMock).toHaveBeenCalledWith('he');
  });

  it('swallows rejection so mount never breaks', async () => {
    prewarmMock.mockRejectedValueOnce(new Error('network dead'));
    expect(() => render(<DictionaryPrewarmer lang="en" />)).not.toThrow();
    await Promise.resolve();
  });

  it('skips the warm on the locale landing page for first-time visitors (2.8MB saving)', () => {
    pathnameMock.mockReturnValue('/en');
    render(<DictionaryPrewarmer lang="en" />);
    expect(prewarmMock).not.toHaveBeenCalled();
  });

  it('still warms on the landing page when the SW cache flag is set (cache hit, no network)', () => {
    pathnameMock.mockReturnValue('/he/');
    try { localStorage.setItem('lc_sw_cached', '1'); } catch { /* jsdom */ }
    render(<DictionaryPrewarmer lang="he" />);
    expect(prewarmMock).toHaveBeenCalledWith('he');
  });

  it('treats a null pathname as non-landing and warms', () => {
    pathnameMock.mockReturnValue(null);
    render(<DictionaryPrewarmer lang="en" />);
    expect(prewarmMock).toHaveBeenCalledWith('en');
  });
});
