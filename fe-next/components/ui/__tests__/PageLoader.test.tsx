import { render, screen } from '@testing-library/react';
import { PageLoader } from '../PageLoader';

// Mock Mascot component
vi.mock('../Mascot', () => ({
  Mascot: ({ variant, size }: { variant: string; size: string }) => (
    <div data-testid="mascot" data-variant={variant} data-size={size} />
  ),
}));

// Mock useDevicePerformance hook
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
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

  it('should paint bg-neo-navy to block body halftone pattern on full-page loaders', () => {
    const { container } = render(<PageLoader />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('bg-neo-navy');
  });

  it('should not paint bg-neo-navy in nested mode', () => {
    const { container } = render(<PageLoader nested />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).not.toHaveClass('bg-neo-navy');
  });

  it('should render minimal loader without colorful spinner rings', () => {
    const { container } = render(<PageLoader />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/border-neo-cyan/);
    expect(html).not.toMatch(/border-neo-pink/);
    expect(html).not.toMatch(/border-t-neo-cyan/);
    expect(html).not.toMatch(/border-r-neo-pink/);
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
    it('should render simple dots loader when prefersReducedMotion is true', () => {
      (globalThis as any).mockUseDevicePerformance.mockReturnValue({
        ...(globalThis as any).defaultDevicePerformanceValue,
        prefersReducedMotion: true,
        enableComplexAnimations: true,
      });

      render(<PageLoader />);

      const loader = screen.getByTestId('page-loader');
      expect(loader).toBeInTheDocument();
    });
  });
});
