import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickResultsRays, QuickResultsSparkles, CoinFlight } from '../QuickResultsFx';

describe('QuickResultsRays', () => {
  it('renders a decorative ray layer in the given color', () => {
    render(<QuickResultsRays color="#ffe135" enabled />);
    const rays = screen.getByTestId('quick-results-rays');
    expect(rays).toHaveAttribute('aria-hidden', 'true');
    expect(rays.getAttribute('style')).toContain('#ffe135');
  });

  it('renders nothing when motion is disabled', () => {
    render(<QuickResultsRays color="#ffe135" enabled={false} />);
    expect(screen.queryByTestId('quick-results-rays')).toBeNull();
  });
});

describe('QuickResultsSparkles', () => {
  it('caps the sparkle burst at six so the celebration stays sparse', () => {
    render(<QuickResultsSparkles count={40} enabled />);
    const burst = screen.getByTestId('quick-results-sparkles');
    expect(burst.querySelectorAll('[data-spark]')).toHaveLength(6);
  });

  it('renders nothing with a zero count or motion disabled', () => {
    const { unmount } = render(<QuickResultsSparkles count={0} enabled />);
    expect(screen.queryByTestId('quick-results-sparkles')).toBeNull();
    unmount();
    render(<QuickResultsSparkles count={4} enabled={false} />);
    expect(screen.queryByTestId('quick-results-sparkles')).toBeNull();
  });
});

describe('CoinFlight', () => {
  it('flies at most eight coins and hides them from assistive tech', () => {
    render(<CoinFlight count={20} enabled />);
    const flight = screen.getByTestId('quick-coin-flight');
    expect(flight).toHaveAttribute('aria-hidden', 'true');
    expect(flight.querySelectorAll('[data-coin]')).toHaveLength(8);
  });
});
