import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules prewarm via requestIdleCallback when available', () => {
    const ricSpy = vi.fn((cb: () => void) => {
      cb();
      return 42;
    });
    const cicSpy = vi.fn();
    (window as unknown as { requestIdleCallback: typeof ricSpy }).requestIdleCallback = ricSpy;
    (window as unknown as { cancelIdleCallback: typeof cicSpy }).cancelIdleCallback = cicSpy;

    const { unmount } = render(<DictionaryPrewarmer lang="en" />);

    expect(ricSpy).toHaveBeenCalledTimes(1);
    expect(prewarmMock).toHaveBeenCalledWith('en');

    unmount();
    expect(cicSpy).toHaveBeenCalledWith(42);

    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (window as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback;
  });

  it('falls back to setTimeout when requestIdleCallback missing', () => {
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    vi.useFakeTimers();

    render(<DictionaryPrewarmer lang="he" />);

    expect(prewarmMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(prewarmMock).toHaveBeenCalledWith('he');
  });

  it('swallows rejection so mount never breaks', async () => {
    prewarmMock.mockRejectedValueOnce(new Error('network dead'));
    (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback = (
      cb: () => void,
    ) => {
      cb();
      return 1;
    };

    expect(() => render(<DictionaryPrewarmer lang="en" />)).not.toThrow();
    await Promise.resolve();

    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  });
});
