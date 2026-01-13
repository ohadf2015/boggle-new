/**
 * Test for loading state layout consistency
 * Ensures loading.tsx uses the modern PageLoader with proper layout
 */
import { render } from '@testing-library/react';
import Loading from '@/app/[locale]/loading';

// Mock framer-motion for simpler testing
jest.mock('framer-motion', () => ({
  motion: {
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
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

describe('Loading Layout', () => {
  it('should use modern screen-fit layout instead of old min-h-screen', () => {
    const { container } = render(<Loading />);

    const loadingContainer = container.firstChild as HTMLElement;

    // Should NOT use old min-h-screen approach
    expect(loadingContainer.className).not.toContain('min-h-screen');

    // Should use modern layout approach
    expect(loadingContainer.className).toContain('screen-fit');
  });

  it('should have proper background styling consistent with landing page', () => {
    const { container } = render(<Loading />);

    const loadingContainer = container.firstChild as HTMLElement;

    // Should use neo-brutalist background consistent with landing page
    expect(loadingContainer.className).toContain('bg-neo-navy');
  });

  it('should render NeoLoader component with mascot variant', () => {
    const { container } = render(<Loading />);

    // The loader should render with proper structure
    // Check for the presence of the loader elements
    const loaderContent = container.querySelector('.flex.flex-col');
    expect(loaderContent).toBeTruthy();
  });

  it('should have centered content within the loader', () => {
    const { container } = render(<Loading />);

    const loadingContainer = container.firstChild as HTMLElement;

    // Should have centering classes
    expect(loadingContainer.className).toContain('flex');
    expect(loadingContainer.className).toContain('items-center');
    expect(loadingContainer.className).toContain('justify-center');
  });
});
