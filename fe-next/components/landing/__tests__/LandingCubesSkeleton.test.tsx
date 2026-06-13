import { render, screen } from '@testing-library/react';
import { LandingCubesSkeleton } from '../LandingCubesSkeleton';

/**
 * The cubes landing loads into a BENTO (daily strip + a 2×2 anchor + small square
 * cubes), not the old card column. The loading skeleton must mirror THAT shape so
 * the swap from skeleton→content causes no layout shift / no jarring re-flow.
 */
describe('LandingCubesSkeleton', () => {
  it('renders a labelled, decorative (aria-hidden) skeleton', () => {
    render(<LandingCubesSkeleton />);
    const root = screen.getByTestId('landing-cubes-skeleton');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });

  it('reserves the daily-hero strip above the grid', () => {
    render(<LandingCubesSkeleton />);
    expect(screen.getByTestId('cubes-skeleton-daily')).toBeInTheDocument();
  });

  it('reserves a 2×2 anchor placeholder plus a row of small square cubes', () => {
    render(<LandingCubesSkeleton />);
    expect(screen.getByTestId('cubes-skeleton-anchor')).toBeInTheDocument();
    // enough small cubes to wrap the anchor (matches the live bento density)
    expect(screen.getAllByTestId('cubes-skeleton-cube').length).toBeGreaterThanOrEqual(5);
  });

  it('matches the live bento width (max-w-5xl, not the old max-w-4xl card column)', () => {
    render(<LandingCubesSkeleton />);
    const root = screen.getByTestId('landing-cubes-skeleton');
    expect(root.className).toMatch(/max-w-5xl/);
  });
});
