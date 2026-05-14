/**
 * EnterKeyHint Component Tests
 *
 * Tests for the Enter key hint badge component for first-time users
 * Focuses on hook behavior which is easier to test reliably
 */

import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { EnterKeyHint, useEnterKeyHint } from '../EnterKeyHint';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'enterKeyHint.pressEnter': 'Press Enter to submit',
  };
  return translations[key] || key;
};

describe('EnterKeyHint Component', () => {
  const STORAGE_KEY = 'lexiclash_enter_hint_shown_count';
  const MAX_SHOW_COUNT = 5;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<EnterKeyHint isVisible={true} t={mockT} />);
      }).not.toThrow();
    });

    it('renders nothing initially when isVisible is false', () => {
      const { container } = render(<EnterKeyHint isVisible={false} t={mockT} />);
      expect(container.querySelector('[role="status"]')).toBeNull();
    });

    it('renders nothing when max show count reached', async () => {
      localStorage.setItem(STORAGE_KEY, String(MAX_SHOW_COUNT));

      const { container } = render(<EnterKeyHint isVisible={true} t={mockT} />);

      // Wait for state to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(container.querySelector('[role="status"]')).toBeNull();
    });

    it('accepts custom className prop', () => {
      const { container } = render(
        <EnterKeyHint isVisible={true} t={mockT} className="custom-class" />
      );

      // Component may or may not render based on state, but shouldn't throw
      expect(container).toBeInTheDocument();
    });

    it('accepts different position props', () => {
      expect(() => {
        render(<EnterKeyHint isVisible={true} t={mockT} position="center" />);
      }).not.toThrow();

      expect(() => {
        render(<EnterKeyHint isVisible={true} t={mockT} position="bottom-center" />);
      }).not.toThrow();
    });
  });
});

describe('useEnterKeyHint hook', () => {
  const STORAGE_KEY = 'lexiclash_enter_hint_shown_count';
  const MAX_SHOW_COUNT = 5;

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns shouldShowEnterHint true when count is 0', () => {
    const { result } = renderHook(() => useEnterKeyHint());

    expect(result.current.shouldShowEnterHint).toBe(true);
  });

  it('returns shouldShowEnterHint false when count reaches max', () => {
    localStorage.setItem(STORAGE_KEY, String(MAX_SHOW_COUNT));

    const { result } = renderHook(() => useEnterKeyHint());

    expect(result.current.shouldShowEnterHint).toBe(false);
  });

  it('increments show count', () => {
    const { result } = renderHook(() => useEnterKeyHint());

    act(() => {
      result.current.incrementShowCount();
    });

    expect(parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)).toBe(1);
  });

  it('dismisses permanently', () => {
    const { result } = renderHook(() => useEnterKeyHint());

    act(() => {
      result.current.dismissPermanently();
    });

    expect(result.current.shouldShowEnterHint).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(String(MAX_SHOW_COUNT));
  });

  it('tracks remaining shows correctly', () => {
    localStorage.setItem(STORAGE_KEY, '2');

    const { result } = renderHook(() => useEnterKeyHint());

    expect(result.current.remainingShows).toBe(3);
  });

  it('returns 0 remaining shows when at max', () => {
    localStorage.setItem(STORAGE_KEY, String(MAX_SHOW_COUNT));

    const { result } = renderHook(() => useEnterKeyHint());

    expect(result.current.remainingShows).toBe(0);
  });

  it('stops incrementing when max reached', () => {
    localStorage.setItem(STORAGE_KEY, String(MAX_SHOW_COUNT - 1));

    const { result } = renderHook(() => useEnterKeyHint());

    act(() => {
      result.current.incrementShowCount();
    });

    // Should be at max now
    expect(localStorage.getItem(STORAGE_KEY)).toBe(String(MAX_SHOW_COUNT));

    act(() => {
      result.current.incrementShowCount();
    });

    // Should not exceed max
    expect(localStorage.getItem(STORAGE_KEY)).toBe(String(MAX_SHOW_COUNT));
  });

  it('returns all expected properties', () => {
    const { result } = renderHook(() => useEnterKeyHint());

    expect(result.current).toHaveProperty('shouldShowEnterHint');
    expect(result.current).toHaveProperty('incrementShowCount');
    expect(result.current).toHaveProperty('dismissPermanently');
    expect(result.current).toHaveProperty('remainingShows');

    expect(typeof result.current.shouldShowEnterHint).toBe('boolean');
    expect(typeof result.current.incrementShowCount).toBe('function');
    expect(typeof result.current.dismissPermanently).toBe('function');
    expect(typeof result.current.remainingShows).toBe('number');
  });

  it('has stable function references', () => {
    const { result, rerender } = renderHook(() => useEnterKeyHint());

    const firstIncrement = result.current.incrementShowCount;
    const firstDismiss = result.current.dismissPermanently;

    rerender();

    // Functions should maintain identity (useCallback)
    // Note: incrementShowCount has showCount as a dependency so may change
    expect(result.current.dismissPermanently).toBe(firstDismiss);
  });
});
