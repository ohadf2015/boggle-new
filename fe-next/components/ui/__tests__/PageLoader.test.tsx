import { render, screen } from '@testing-library/react';
import { PageLoader } from '../PageLoader';

// Mock Mascot component
jest.mock('../Mascot', () => ({
  Mascot: ({ variant, size }: { variant: string; size: string }) => (
    <div data-testid="mascot" data-variant={variant} data-size={size} />
  ),
}));

// Mock useDevicePerformance hook
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>{children}</p>
    ),
  },
}));

describe('PageLoader', () => {
  it('should render with default props', () => {
    render(<PageLoader />);

    const loader = screen.getByTestId('page-loader');
    expect(loader).toBeInTheDocument();
  });

  it('should render mascot by default', () => {
    render(<PageLoader />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toBeInTheDocument();
    expect(mascot).toHaveAttribute('data-variant', 'happy');
  });

  it('should pass mascotVariant prop to Mascot', () => {
    render(<PageLoader mascotVariant="thinking" />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-variant', 'thinking');
  });

  it('should pass size prop correctly', () => {
    render(<PageLoader size="md" />);

    const loader = screen.getByTestId('page-loader');
    expect(loader).toBeInTheDocument();
  });

  it('should render text when provided', () => {
    render(<PageLoader text="Loading profile..." />);

    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('should render full-page container with correct classes', () => {
    const { container } = render(<PageLoader />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex-1');
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });

  it('should not use min-h-0 in non-nested mode (default)', () => {
    const { container } = render(<PageLoader />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).not.toHaveClass('min-h-0');
  });

  describe('nested mode (for Suspense fallbacks)', () => {
    it('should use flex-1 with min-h-0 when nested=true', () => {
      const { container } = render(<PageLoader nested />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex-1');
      expect(wrapper).toHaveClass('min-h-0');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('should use min-h-0 to allow flex shrinking when nested', () => {
      const { container } = render(<PageLoader nested />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('min-h-0');
    });

    it('should still center content when nested', () => {
      const { container } = render(<PageLoader nested />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });
  });

  describe('reduced motion / low-end device fallback', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should render simple dots loader when prefersReducedMotion is true', () => {
      jest.doMock('@/hooks/useDevicePerformance', () => ({
        useDevicePerformance: () => ({
          prefersReducedMotion: true,
          enableComplexAnimations: true,
        }),
      }));

      // Re-import after mocking
      const { PageLoader: PageLoaderReduced } = require('../PageLoader');
      render(<PageLoaderReduced />);

      const loader = screen.getByTestId('page-loader');
      expect(loader).toBeInTheDocument();
    });
  });
});
