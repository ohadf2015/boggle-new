import { render, screen } from '@testing-library/react';
import { PageLoader } from '../PageLoader';

const mascotSrc = () => (screen.getByTestId('loader-mascot') as HTMLImageElement).getAttribute('src');

describe('PageLoader', () => {
  it('renders the loader with a status role for screen readers', () => {
    render(<PageLoader />);
    const loader = screen.getByTestId('page-loader');
    expect(loader).toHaveAttribute('role', 'status');
    expect(loader).toHaveAttribute('aria-busy', 'true');
  });

  it('uses transparent mascot art so no dark square shows on the page pattern', () => {
    render(<PageLoader />);
    expect(mascotSrc()).toMatch(/-nobg\.webp$/);
  });

  it.each([
    ['thinking', '/mascot/bridge-think-nobg.webp'],
    ['explorer', '/mascot/explorer-nobg.webp'],
    ['knight', '/mascot/hello-nobg.webp'],
    ['happy', '/mascot/hello-nobg.webp'],
    ['spectating', '/mascot/popcorn-nobg.webp'],
    ['waiting', '/mascot/waiting-hop-nobg.webp'],
  ] as const)('maps mascotVariant %s to transparent art', (variant, src) => {
    render(<PageLoader mascotVariant={variant} />);
    expect(mascotSrc()).toBe(src);
  });

  it('paints no background of its own, full-page or nested, so the body pattern runs unbroken', () => {
    const { container, rerender } = render(<PageLoader />);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/\bbg-/);
    rerender(<PageLoader nested />);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/\bbg-/);
  });

  it('fills its parent full-page, and may shrink when nested', () => {
    const { container, rerender } = render(<PageLoader />);
    const wrapper = () => container.firstChild as HTMLElement;
    expect(wrapper()).toHaveClass('flex-1', 'flex', 'items-center', 'justify-center');
    expect(wrapper()).not.toHaveClass('min-h-0');
    rerender(<PageLoader nested />);
    expect(wrapper()).toHaveClass('flex-1', 'min-h-0');
  });

  it('lets the caption inherit its surface text colour (white on navy, ink on cream cards)', () => {
    render(<PageLoader text="Loading profile..." />);
    expect(screen.getByText('Loading profile...').className).not.toMatch(/\btext-(neo-|white|black|foreground)/);
  });

  it('renders three bouncing tiles under the mascot', () => {
    render(<PageLoader />);
    expect(screen.getAllByTestId('loader-tile')).toHaveLength(3);
  });

  it('marks the mascot high priority by default and lets callers opt out', () => {
    const { rerender } = render(<PageLoader />);
    expect(screen.getByTestId('loader-mascot')).toHaveAttribute('fetchpriority', 'high');
    rerender(<PageLoader priority={false} />);
    expect(screen.getByTestId('loader-mascot')).not.toHaveAttribute('fetchpriority');
  });

  it('merges a caller className onto the wrapper', () => {
    const { container } = render(<PageLoader className="relative z-10" />);
    expect(container.firstChild).toHaveClass('relative', 'z-10');
  });
});
