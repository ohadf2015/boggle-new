import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prewarmMock = vi.fn();

vi.mock('@/hooks/useDictionaryCache', () => ({
  prewarmDictionary: (lang: string) => prewarmMock(lang),
}));

import DictionaryPrewarmer from '../DictionaryPrewarmer';

describe('DictionaryPrewarmer', () => {
  beforeEach(() => {
    prewarmMock.mockReset();
    prewarmMock.mockResolvedValue(undefined);
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
});
