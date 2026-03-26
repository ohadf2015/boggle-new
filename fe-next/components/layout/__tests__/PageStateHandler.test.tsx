import { render, screen } from '@testing-library/react';
import { PageStateHandler } from '../PageStateHandler';

// Mock PageLoader to capture passed props
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ size, text }: { size?: string; text?: string }) => (
    <div
      data-testid="page-loader"
      data-size={size}
    >
      {text && <span data-testid="loader-text">{text}</span>}
    </div>
  ),
}));

// Mock dependencies
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('PageStateHandler', () => {
  it('should render children when not loading and no error', () => {
    render(
      <PageStateHandler isLoading={false} error={null}>
        <div data-testid="content">Content</div>
      </PageStateHandler>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should render loading state with mascot-letters variant', () => {
    render(
      <PageStateHandler isLoading={true} error={null}>
        <div>Content</div>
      </PageStateHandler>
    );

    const loader = screen.getByTestId('page-loader');
    expect(loader).toBeInTheDocument();
  });

  it('should render loading state with medium size by default', () => {
    render(
      <PageStateHandler isLoading={true} error={null}>
        <div>Content</div>
      </PageStateHandler>
    );

    const loader = screen.getByTestId('page-loader');
    expect(loader).toHaveAttribute('data-size', 'md');
  });

  it('should display loading text from translations', () => {
    render(
      <PageStateHandler isLoading={true} error={null}>
        <div>Content</div>
      </PageStateHandler>
    );

    expect(screen.getByTestId('loader-text')).toBeInTheDocument();
  });

  it('should use custom loadingText when provided', () => {
    render(
      <PageStateHandler isLoading={true} loadingText="Custom loading...">
        <div>Content</div>
      </PageStateHandler>
    );

    expect(screen.getByTestId('loader-text')).toHaveTextContent('Custom loading...');
  });

  it('should render custom loading component when provided', () => {
    render(
      <PageStateHandler
        isLoading={true}
        loadingComponent={<div data-testid="custom-loader">Custom Loader</div>}
      >
        <div>Content</div>
      </PageStateHandler>
    );

    expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('page-loader')).not.toBeInTheDocument();
  });
});
