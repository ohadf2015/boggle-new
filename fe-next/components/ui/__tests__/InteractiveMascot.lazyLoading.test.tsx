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
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} data-testid="mascot-image" {...props} />;
  },
}));

// Mock device performance hook to enable animations
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
    tier: 'high',
  }),
}));

describe('InteractiveMascot - Lazy Loading', () => {
  beforeEach(() => {
    // Clear tracked constructor calls
    mockImageConstructorCalls.length = 0;

    // Store original Image constructor
    originalImage = window.Image;

    // Mock Image constructor to track preload attempts
    (window.Image as any) = function MockImageConstructor() {
      const img = {
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        // Track when src is set (this is the preload call)
        set src(value: string) {
          mockImageConstructorCalls.push(value);
          // Simulate async load
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        },
        get src() {
          return '';
        },
      };
      return img;
    };
  });

  afterEach(() => {
    // Restore original Image constructor
    window.Image = originalImage;
    jest.clearAllMocks();
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
      expect(screen.getByAltText(/Lexi mascot - happy/i)).toBeInTheDocument();
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
      '/mascot/main-nobg.gif',
      '/mascot/play-nobg.gif',
      '/mascot/study-nobg.gif',
      '/mascot/oops-nobg.gif',
      '/mascot/celebration-nobg.gif',
      '/mascot/dj-nobg.gif',
      '/mascot/trophy-nobg.gif',
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
      expect(screen.getAllByTestId('mascot-image')).toHaveLength(3);
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
      expect(screen.getByAltText(/Lexi mascot - happy/i)).toBeInTheDocument();
    });

    // Wait for lazy preloading to occur
    await waitFor(() => {
      // Lazy preload: only hover (gaming) and click (celebration) variants should be preloaded
      expect(mockImageConstructorCalls.length).toBeGreaterThan(0);
    }, { timeout: 1000 });

    // THEN: Only the hover and click target variants should be preloaded
    // happy → hover: gaming, click: celebration
    expect(mockImageConstructorCalls.length).toBe(2);
    expect(mockImageConstructorCalls.includes('/mascot/play-nobg.gif')).toBe(true); // gaming (hover)
    expect(mockImageConstructorCalls.includes('/mascot/celebration-nobg.gif')).toBe(true); // celebration (click)

    // AND: Other unused variants should NOT be preloaded
    expect(mockImageConstructorCalls.includes('/mascot/main-nobg.gif')).toBe(false); // happy (already shown via Next Image)
    expect(mockImageConstructorCalls.includes('/mascot/study-nobg.gif')).toBe(false); // thinking
    expect(mockImageConstructorCalls.includes('/mascot/oops-nobg.gif')).toBe(false); // oops
    expect(mockImageConstructorCalls.includes('/mascot/dj-nobg.gif')).toBe(false); // dj
    expect(mockImageConstructorCalls.includes('/mascot/trophy-nobg.gif')).toBe(false); // trophy
  });
});
