/**
 * @jest-environment jsdom
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDesktopLayout, useIsDesktop, useIsTv } from '../useDesktopLayout';

// Mock window dimensions
const setWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

// Trigger resize event
const triggerResize = () => {
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

describe('useDesktopLayout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('layout type detection', () => {
    it('should detect mobile layout for small screens', () => {
      // GIVEN a mobile viewport size
      setWindowDimensions(375, 667);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should detect mobile layout
      expect(result.current.type).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isTv).toBe(false);
    });

    it('should detect tablet layout for medium screens', () => {
      // GIVEN a tablet viewport size
      setWindowDimensions(768, 600);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should detect tablet layout
      expect(result.current.type).toBe('tablet');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isTv).toBe(false);
    });

    it('should detect desktop layout for large screens with sufficient height', () => {
      // GIVEN a desktop viewport size
      setWindowDimensions(1280, 800);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should detect desktop layout
      expect(result.current.type).toBe('desktop');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTv).toBe(false);
    });

    it('should detect TV layout for very large screens', () => {
      // GIVEN a TV viewport size
      setWindowDimensions(1920, 1080);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should detect TV layout
      expect(result.current.type).toBe('tv');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isTv).toBe(true);
    });

    it('should classify wide desktop with low height as tablet (not desktop)', () => {
      // GIVEN a wide screen but with low height
      setWindowDimensions(1280, 500);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should NOT be desktop (height too low)
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.type).toBe('tablet');
    });
  });

  describe('CrazyGames minimum viewport detection', () => {
    it('should meet CrazyGames minimum at 821x462', () => {
      // GIVEN the CrazyGames minimum desktop viewport
      setWindowDimensions(821, 462);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should meet CrazyGames minimum
      expect(result.current.meetsCrazyGamesMin).toBe(true);
    });

    it('should NOT meet CrazyGames minimum at 800x450', () => {
      // GIVEN a viewport below CrazyGames minimum
      setWindowDimensions(800, 450);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should NOT meet CrazyGames minimum
      expect(result.current.meetsCrazyGamesMin).toBe(false);
    });
  });

  describe('screen characteristics', () => {
    it('should detect tall screens', () => {
      // GIVEN a tall screen
      setWindowDimensions(800, 900);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should detect tall screen
      expect(result.current.isTallScreen).toBe(true);
    });

    it('should detect wide screens', () => {
      // GIVEN a widescreen aspect ratio (width >= 1.5 * height)
      setWindowDimensions(1200, 600);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN it should detect wide screen
      expect(result.current.isWideScreen).toBe(true);
      expect(result.current.aspectRatio).toBe(2);
    });

    it('should calculate aspect ratio correctly', () => {
      // GIVEN a 16:9 viewport
      setWindowDimensions(1920, 1080);

      // WHEN the hook is rendered
      const { result } = renderHook(() => useDesktopLayout());
      triggerResize();
      vi.runAllTimers();

      // THEN the aspect ratio should be approximately 16:9
      expect(result.current.aspectRatio).toBeCloseTo(1.778, 2);
    });
  });

  describe('responsive behavior', () => {
    it('should update layout when window is resized', async () => {
      // GIVEN initial desktop viewport
      setWindowDimensions(1280, 800);
      const { result, rerender } = renderHook(() => useDesktopLayout());

      // Wait for initial effect to run
      await act(async () => {
        vi.runAllTimers();
      });
      expect(result.current.isDesktop).toBe(true);

      // WHEN window is resized to mobile
      setWindowDimensions(375, 667);
      await act(async () => {
        window.dispatchEvent(new Event('resize'));
        vi.runAllTimers();
      });

      // Force rerender to pick up state changes
      rerender();

      // THEN layout should update to mobile
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should debounce resize events', async () => {
      // GIVEN a rendered hook
      setWindowDimensions(1280, 800);
      const { result, rerender } = renderHook(() => useDesktopLayout({ debounceMs: 200 }));

      // Wait for initial calculation
      await act(async () => {
        vi.runAllTimers();
      });

      // WHEN multiple rapid resizes happen
      await act(async () => {
        setWindowDimensions(500, 500);
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(50);

        setWindowDimensions(600, 600);
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(50);

        setWindowDimensions(375, 667);
        window.dispatchEvent(new Event('resize'));
      });

      // Before debounce completes, layout may still reflect earlier state
      rerender();

      // THEN after debounce, layout should update to final size
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      rerender();

      expect(result.current.width).toBe(375);
      expect(result.current.isMobile).toBe(true);
    });
  });

  describe('custom options', () => {
    it('should respect custom desktop width threshold', () => {
      // GIVEN custom desktop threshold of 1400px
      setWindowDimensions(1280, 800);

      // WHEN the hook is rendered with custom options
      const { result } = renderHook(() =>
        useDesktopLayout({ desktopMinWidth: 1400 })
      );
      triggerResize();
      vi.runAllTimers();

      // THEN 1280px should NOT be desktop
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.type).toBe('tablet');
    });

    it('should respect custom desktop height threshold', () => {
      // GIVEN custom desktop height threshold of 900px
      setWindowDimensions(1280, 800);

      // WHEN the hook is rendered with custom options
      const { result } = renderHook(() =>
        useDesktopLayout({ desktopMinHeight: 900 })
      );
      triggerResize();
      vi.runAllTimers();

      // THEN 800px height should NOT be desktop
      expect(result.current.isDesktop).toBe(false);
    });
  });
});

describe('useIsDesktop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for desktop screens', () => {
    // GIVEN a desktop viewport
    setWindowDimensions(1280, 800);

    // WHEN the hook is rendered
    const { result } = renderHook(() => useIsDesktop());
    triggerResize();
    vi.runAllTimers();

    // THEN it should return true
    expect(result.current).toBe(true);
  });

  it('should return false for mobile screens', () => {
    // GIVEN a mobile viewport
    setWindowDimensions(375, 667);

    // WHEN the hook is rendered
    const { result } = renderHook(() => useIsDesktop());
    triggerResize();
    vi.runAllTimers();

    // THEN it should return false
    expect(result.current).toBe(false);
  });
});

describe('useIsTv', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for TV screens', () => {
    // GIVEN a TV viewport
    setWindowDimensions(1920, 1080);

    // WHEN the hook is rendered
    const { result } = renderHook(() => useIsTv());
    triggerResize();
    vi.runAllTimers();

    // THEN it should return true
    expect(result.current).toBe(true);
  });

  it('should return false for non-TV screens', () => {
    // GIVEN a desktop viewport
    setWindowDimensions(1280, 800);

    // WHEN the hook is rendered
    const { result } = renderHook(() => useIsTv());
    triggerResize();
    vi.runAllTimers();

    // THEN it should return false
    expect(result.current).toBe(false);
  });
});
