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
    pathnameMock.mockReturnValue('/en/singleplayer');
    try { localStorage.clear(); } catch { /* jsdom */ }
  });

  it('prewarms eagerly on mount (no idle/timeout deferral)', () => {
    // Must fire immediately so the active-locale dictionary is fetched (and thus
    // SW-cached) before the user can go offline. A short-lived session may never
    // reach a requestIdleCallback, so deferral would leave the dict cold.
    render(<DictionaryPrewarmer lang="en" />);
    expect(prewarmMock).toHaveBeenCalledWith('en');
  });

  it('re-prewarms when the language changes', () => {
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
