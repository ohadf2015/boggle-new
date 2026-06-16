import { vi, type Mock, } from 'vitest';
/**
 * Test for loading state layout consistency
 * Ensures loading.tsx uses proper skeleton layout matching the landing page
 */
import { render } from '@testing-library/react';
import Loading from '@/app/[locale]/loading';

// Mock framer-motion for simpler testing
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, ...domProps } = props as Record<string, unknown>;
      return <p {...domProps}>{children}</p>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock useDevicePerformance hook
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

describe('Loading Layout', () => {
  it('should use modern flex layout with page-content-safe', () => {
    const { container } = render(<Loading />);

    const loadingContainer = container.firstChild as HTMLElement;

    // Should NOT use old min-h-screen approach
    expect(loadingContainer.className).not.toContain('min-h-screen');

    // Should use modern flex layout with page-content-safe for proper spacing
    expect(loadingContainer.className).toContain('flex-1');
    expect(loadingContainer.className).toContain('flex');
    expect(loadingContainer.className).toContain('flex-col');
    expect(loadingContainer.className).toContain('page-content-safe');
    expect(loadingContainer.className).toContain('h-full');
  });

  it('should have proper background styling consistent with landing page', () => {
    const { container } = render(<Loading />);

    const loadingContainer = container.firstChild as HTMLElement;

    // Should use neo-brutalist background consistent with landing page
    // Uses dark:bg-neo-navy for dark mode
    expect(loadingContainer.className).toContain('bg-neo-navy');
  });

  it('should render skeleton structure matching landing page', () => {
    const { container } = render(<Loading />);

    // Should have header skeleton
    const header = container.querySelector('header');
    expect(header).toBeTruthy();

    // Should have main content area
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.className).toContain('flex-1');
  });

  it('reserves a season-strip placeholder above the hero to match LandingView order', () => {
    const { container, getByTestId } = render(<Loading />);

    // LandingSeasonHero renders FIRST in LandingView (above the hero). The route
    // skeleton must reserve its space or the real content shifts down on swap.
    const seasonStrip = getByTestId('loading-season-strip');
    expect(seasonStrip).toBeTruthy();

    // It must be the first child of <main> (before the hero block).
    const main = container.querySelector('main');
    expect(main?.firstElementChild).toBe(seasonStrip);
  });

  it('renders the cubes bento skeleton (matches the live LandingModeCubes layout)', () => {
    const { container, getByTestId } = render(<Loading />);

    // Cubes is the only homepage layout now — the route skeleton must mirror the
    // bento (daily strip + 2×2 anchor + small cubes), not the retired 2×2 card grid.
    expect(getByTestId('landing-cubes-skeleton')).toBeTruthy();
    expect(getByTestId('cubes-skeleton-anchor')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="cubes-skeleton-cube"]').length).toBeGreaterThan(0);

    // Cubes bento grid (not the control grid-cols-1 sm:grid-cols-2 column).
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('grid-cols-2');
    expect(grid?.className).toContain('md:grid-cols-4');

    // Header/hero shimmer still pulses.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
