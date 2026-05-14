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

  it('should have skeleton mode cards for seamless transition', () => {
    const { container } = render(<Loading />);

    // Should render skeleton cards in grid structure
    const grid = container.querySelector('.grid');
    expect(grid).toBeTruthy();
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).toContain('sm:grid-cols-2');

    // Should have multiple skeleton elements with pulse animation
    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });
});
