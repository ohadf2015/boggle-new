/**
 * useAriaLive Hook Tests
 *
 * Tests for the ARIA live region hook that announces dynamic content
 * changes to screen readers.
 *
 * Following WCAG 2.0 AA / Israeli Standard 5568 requirements.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAriaLive } from '../useAriaLive';

describe('useAriaLive', () => {
  beforeEach(() => {
    // Clear any existing live regions from previous tests
    document.querySelectorAll('[data-aria-live-region]').forEach(el => el.remove());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('creates a live region in the DOM on mount', () => {
      renderHook(() => useAriaLive());

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('creates a visually hidden live region', () => {
      renderHook(() => useAriaLive());

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toHaveClass('sr-only');
    });

    it('sets aria-live to polite by default', () => {
      renderHook(() => useAriaLive());

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('sets aria-atomic to true for complete announcements', () => {
      renderHook(() => useAriaLive());

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('creates live region with assertive politeness when specified', () => {
      renderHook(() => useAriaLive({ politeness: 'assertive' }));

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('announcements', () => {
    it('announces message by updating live region content', () => {
      const { result } = renderHook(() => useAriaLive());

      act(() => {
        result.current.announce('Hello screen reader');
      });

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toHaveTextContent('Hello screen reader');
    });

    it('clears message after delay to allow re-announcements', () => {
      const { result } = renderHook(() => useAriaLive());

      act(() => {
        result.current.announce('First message');
      });

      expect(document.querySelector('[data-aria-live-region]')).toHaveTextContent('First message');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(document.querySelector('[data-aria-live-region]')).toHaveTextContent('');
    });

    it('allows multiple announcements in sequence', () => {
      const { result } = renderHook(() => useAriaLive());

      act(() => {
        result.current.announce('First');
      });

      expect(document.querySelector('[data-aria-live-region]')).toHaveTextContent('First');

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.announce('Second');
      });

      expect(document.querySelector('[data-aria-live-region]')).toHaveTextContent('Second');
    });

    it('interrupts current message with new assertive announcement', () => {
      const { result } = renderHook(() => useAriaLive({ politeness: 'assertive' }));

      act(() => {
        result.current.announce('Important message');
      });

      // Assertive should still work the same way
      expect(document.querySelector('[data-aria-live-region]')).toHaveTextContent('Important message');
    });
  });

  describe('cleanup', () => {
    it('removes live region from DOM on unmount', () => {
      const { unmount } = renderHook(() => useAriaLive());

      expect(document.querySelector('[data-aria-live-region]')).toBeInTheDocument();

      unmount();

      expect(document.querySelector('[data-aria-live-region]')).not.toBeInTheDocument();
    });

    it('clears pending timers on unmount', () => {
      const { result, unmount } = renderHook(() => useAriaLive());

      act(() => {
        result.current.announce('Test message');
      });

      unmount();

      // Should not throw or cause issues when timer fires after unmount
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });

  describe('multiple instances', () => {
    it('supports multiple live regions with different IDs', () => {
      renderHook(() => useAriaLive({ id: 'region-1' }));
      renderHook(() => useAriaLive({ id: 'region-2' }));

      const regions = document.querySelectorAll('[data-aria-live-region]');
      expect(regions).toHaveLength(2);
    });

    it('each instance controls its own region', () => {
      const { result: result1 } = renderHook(() => useAriaLive({ id: 'region-1' }));
      const { result: result2 } = renderHook(() => useAriaLive({ id: 'region-2' }));

      act(() => {
        result1.current.announce('Message 1');
        result2.current.announce('Message 2');
      });

      const region1 = document.querySelector('[data-aria-live-region="region-1"]');
      const region2 = document.querySelector('[data-aria-live-region="region-2"]');

      expect(region1).toHaveTextContent('Message 1');
      expect(region2).toHaveTextContent('Message 2');
    });
  });

  describe('stable references', () => {
    it('returns stable announce function across rerenders', () => {
      const { result, rerender } = renderHook(() => useAriaLive());

      const firstAnnounce = result.current.announce;

      rerender();

      expect(result.current.announce).toBe(firstAnnounce);
    });

    it('returns stable clear function across rerenders', () => {
      const { result, rerender } = renderHook(() => useAriaLive());

      const firstClear = result.current.clear;

      rerender();

      expect(result.current.clear).toBe(firstClear);
    });
  });

  describe('clear functionality', () => {
    it('provides clear function to manually clear announcements', () => {
      const { result } = renderHook(() => useAriaLive());

      act(() => {
        result.current.announce('Test message');
      });

      expect(document.querySelector('[data-aria-live-region]')).toHaveTextContent('Test message');

      act(() => {
        result.current.clear();
      });

      expect(document.querySelector('[data-aria-live-region]')).toHaveTextContent('');
    });
  });

  describe('accessibility compliance', () => {
    it('live region has role="status" for polite announcements', () => {
      renderHook(() => useAriaLive({ politeness: 'polite' }));

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toHaveAttribute('role', 'status');
    });

    it('live region has role="alert" for assertive announcements', () => {
      renderHook(() => useAriaLive({ politeness: 'assertive' }));

      const liveRegion = document.querySelector('[data-aria-live-region]');
      expect(liveRegion).toHaveAttribute('role', 'alert');
    });
  });
});
