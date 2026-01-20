import { render, screen } from '@testing-library/react';
import { PageLoader } from '../PageLoader';

// Mock NeoLoader since we only want to test PageLoader wrapper logic
jest.mock('../NeoLoader', () => ({
  NeoLoader: ({ variant, size, text, mascotVariant }: any) => (
    <div
      data-testid="neo-loader"
      data-variant={variant}
      data-size={size}
      data-mascot-variant={mascotVariant}
    >
      {text && <span data-testid="loader-text">{text}</span>}
    </div>
  ),
}));

describe('PageLoader', () => {
  it('should render with default props', () => {
    render(<PageLoader />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-variant', 'mascot-letters');
    expect(loader).toHaveAttribute('data-size', 'lg');
  });

  it('should render with mascot-letters variant by default', () => {
    render(<PageLoader />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toHaveAttribute('data-variant', 'mascot-letters');
  });

  it('should pass variant prop to NeoLoader', () => {
    render(<PageLoader variant="mascot" />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toHaveAttribute('data-variant', 'mascot');
  });

  it('should pass size prop to NeoLoader', () => {
    render(<PageLoader size="md" />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toHaveAttribute('data-size', 'md');
  });

  it('should pass text prop to NeoLoader', () => {
    render(<PageLoader text="Loading profile..." />);

    const text = screen.getByTestId('loader-text');
    expect(text).toHaveTextContent('Loading profile...');
  });

  it('should pass mascotVariant prop to NeoLoader', () => {
    render(<PageLoader variant="mascot" mascotVariant="happy" />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toHaveAttribute('data-mascot-variant', 'happy');
  });

  it('should render full-page container with correct classes', () => {
    const { container } = render(<PageLoader />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('screen-fit');
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });

  it('should use dots variant when specified', () => {
    render(<PageLoader variant="dots" />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toHaveAttribute('data-variant', 'dots');
  });

  it('should use sm size when specified', () => {
    render(<PageLoader size="sm" />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toHaveAttribute('data-size', 'sm');
  });

  it('should use letters variant when specified', () => {
    render(<PageLoader variant="letters" />);

    const loader = screen.getByTestId('neo-loader');
    expect(loader).toHaveAttribute('data-variant', 'letters');
  });

  describe('nested mode (for Suspense fallbacks)', () => {
    it('should use flex-1 instead of screen-fit when nested=true', () => {
      const { container } = render(<PageLoader nested />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex-1');
      expect(wrapper).not.toHaveClass('screen-fit');
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
});
