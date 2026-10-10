import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickResultsRays, ConfettiPuff, SparkleLoop, CoinFlight } from '../QuickResultsFx';

describe('QuickResultsRays', () => {
  it('renders a decorative ray layer in the given color', () => {
    render(<QuickResultsRays color="#ffe135" spinning />);
    const rays = screen.getByTestId('quick-results-rays');
    expect(rays).toHaveAttribute('aria-hidden', 'true');
    expect(rays.innerHTML).toContain('#ffe135');
    expect(rays).toHaveAttribute('data-spinning', 'true');
  });

  it('stays as a still backdrop when motion is off', () => {
    render(<QuickResultsRays color="#ffe135" spinning={false} />);
    expect(screen.getByTestId('quick-results-rays')).toHaveAttribute('data-spinning', 'false');
  });
});

describe('ConfettiPuff', () => {
  it('is sparse: never more than sixteen pieces', () => {
    render(<ConfettiPuff count={200} enabled />);
    expect(screen.getByTestId('quick-confetti').querySelectorAll('[data-piece]')).toHaveLength(16);
  });

  it('is short: every piece plays once and is gone within two seconds', () => {
    render(<ConfettiPuff count={16} enabled />);
    for (const piece of screen.getByTestId('quick-confetti').querySelectorAll<HTMLElement>('[data-piece]')) {
      const delay = parseFloat(piece.style.animationDelay);
      const duration = parseFloat(piece.style.animationDuration);
      expect(delay + duration).toBeLessThanOrEqual(2);
      expect(piece.style.animationIterationCount || '1').toBe('1');
    }
  });

  it('renders nothing with no pieces or motion off', () => {
    const { unmount } = render(<ConfettiPuff count={0} enabled />);
    expect(screen.queryByTestId('quick-confetti')).toBeNull();
    unmount();
    render(<ConfettiPuff count={10} enabled={false} />);
    expect(screen.queryByTestId('quick-confetti')).toBeNull();
  });
});

describe('SparkleLoop', () => {
  it('keeps a few twinkles going, never a shower', () => {
    render(<SparkleLoop enabled />);
    const sparks = screen.getByTestId('quick-results-sparkles').querySelectorAll('[data-spark]');
    expect(sparks.length).toBeGreaterThan(0);
    expect(sparks.length).toBeLessThanOrEqual(4);
  });
});

describe('CoinFlight', () => {
  it('flies coins from the reward to the wallet and hides them from assistive tech', () => {
    render(<CoinFlight count={20} from={{ x: 100, y: 500 }} to={{ x: 340, y: 24 }} enabled />);
    const flight = screen.getByTestId('quick-coin-flight');
    expect(flight).toHaveAttribute('aria-hidden', 'true');
    const coins = flight.querySelectorAll<HTMLElement>('[data-coin]');
    expect(coins).toHaveLength(8);
    expect(coins[0].style.getPropertyValue('--dx')).toBe('240px');
    expect(coins[0].style.getPropertyValue('--dy')).toBe('-476px');
  });

  it('waits until both ends are measured', () => {
    render(<CoinFlight count={5} from={null} to={{ x: 1, y: 1 }} enabled />);
    expect(screen.queryByTestId('quick-coin-flight')).toBeNull();
  });
});
