/**
 * Test: InteractiveMascot should only load necessary images on init
 *
 * ISSUE: Currently all 7 mascot GIFs are preloaded immediately on mount via preloadAllMascotImages(),
 * causing unnecessary bandwidth and memory usage.
 *
 * EXPECTED: Only the base variant image should be loaded initially.
 * Other variants should be lazy-loaded when needed (on hover, click, or idle activity).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InteractiveMascot } from '../InteractiveMascot';

// Track Image constructor calls globally
const mockImageConstructorCalls: string[] = [];
let originalImage: typeof window.Image;

// Mock Next.js Image component - just render a simple img
vi.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, width, height }: any) {
    // Only pass standard HTML img attributes, filter out Next.js-specific props
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} data-testid="mascot-image" />;
  },
}));

// Mock device performance hook to enable animations
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
    tier: 'high',
  }),
}));

describe('InteractiveMascot - Lazy Loading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear tracked constructor calls
    mockImageConstructorCalls.length = 0;

    // Store original Image constructor
    originalImage = window.Image;

    // Mock Image constructor to track preload attempts
    (window.Image as any) = function MockImageConstructor() {
      let srcValue = '';
      const img = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        // Track when src is set (this is the preload call)
        set src(value: string) {
          srcValue = value;
          mockImageConstructorCalls.push(value);
          // Simulate async load
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        },
        get src() {
          return srcValue;
        },
      };
      return img;
    };
  });

  afterEach(() => {
    // Restore original Image constructor
    window.Image = originalImage;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should NOT preload all mascot GIFs on initial render', async () => {
    // GIVEN: A mascot with happy variant
    render(
      <InteractiveMascot
        variant="happy"
        size="md"
        enableHover={false}
        enableClick={false}
      />
    );

    // WHEN: Component is mounted
    await waitFor(() => {
      expect(screen.getByTestId('interactive-mascot')).toBeInTheDocument();
    });

    // Wait for any async preloading to occur
    await waitFor(() => {
      // If preloadAllMascotImages() is called, it will preload all 7 GIFs
      // We expect it NOT to be called, so we should have 0 Image constructor calls
      expect(mockImageConstructorCalls.length).toBe(0);
    }, { timeout: 1000 });

    // THEN: preloadAllMascotImages() should NOT have been called
    // So we should NOT see all 7 mascot GIFs being preloaded via Image constructor
    const allMascotPaths = [
      '/mascot/winner.webp',
      '/mascot/play.webp',
      '/mascot/question.webp',
      '/mascot/oops.webp',
      '/mascot/celebration.webp',
      '/mascot/dj.webp',
      '/mascot/trophy.webp',
    ];

    // VERIFY: preloadAllMascotImages was NOT called (no Image constructor calls)
    for (const path of allMascotPaths) {
      expect(mockImageConstructorCalls.includes(path)).toBe(false);
    }
  });

  it('should NOT preload GIFs when multiple mascots mount', async () => {
    // GIVEN: Multiple mascots with different variants
    render(
      <>
        <InteractiveMascot variant="happy" size="md" enableHover={false} enableClick={false} />
        <InteractiveMascot variant="gaming" size="md" enableHover={false} enableClick={false} />
        <InteractiveMascot variant="thinking" size="md" enableHover={false} enableClick={false} />
      </>
    );

    // WHEN: Components are mounted
    await waitFor(() => {
      const nodes = screen.queryAllByTestId('interactive-mascot');
      expect(nodes).toHaveLength(3);
    });

    // Wait for any async preloading to occur
    await waitFor(() => {
      // Even with 3 mascots, preloadAllMascotImages() should NOT be called
      expect(mockImageConstructorCalls.length).toBe(0);
    }, { timeout: 1000 });

    // THEN: No mascot GIFs should be preloaded via Image constructor
    // (Next.js Image component handles the actual rendering)
    expect(mockImageConstructorCalls.length).toBe(0);
  });

  it('should only preload hover and click variants when interactions are enabled', async () => {
    // GIVEN: An interactive mascot with hover and click enabled
    render(
      <InteractiveMascot
        variant="happy"
        size="md"
        enableHover={true}
        enableClick={true}
      />
    );

    // WHEN: Component is mounted
    await waitFor(() => {
      expect(screen.getByTestId('interactive-mascot')).toBeInTheDocument();
    });

    // Preloading is deferred via a 30s post-load setTimeout — advance timers
    vi.advanceTimersByTime(31000);
    await waitFor(() => {
      // Lazy preload: only hover (gaming) and click (celebration) variants should be preloaded
      expect(mockImageConstructorCalls.length).toBeGreaterThan(0);
    }, { timeout: 1000 });

    // THEN: Only the hover and click target variants should be preloaded
    // happy → hover: gaming, click: celebration
    expect(mockImageConstructorCalls.length).toBe(2);
    expect(mockImageConstructorCalls.includes('/mascot/play.webp')).toBe(true); // gaming (hover)
    expect(mockImageConstructorCalls.includes('/mascot/celebration.webp')).toBe(true); // celebration (click)

    // AND: Other unused variants should NOT be preloaded
    expect(mockImageConstructorCalls.includes('/mascot/winner.webp')).toBe(false); // happy (already shown)
    expect(mockImageConstructorCalls.includes('/mascot/question.webp')).toBe(false); // thinking
    expect(mockImageConstructorCalls.includes('/mascot/oops.webp')).toBe(false); // oops
    expect(mockImageConstructorCalls.includes('/mascot/dj.webp')).toBe(false); // dj
    expect(mockImageConstructorCalls.includes('/mascot/trophy.webp')).toBe(false); // trophy
  });
});
