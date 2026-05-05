/**
 * BlastCountUp — number tween for results score.
 * Vitest env triggers the synchronous fast-path in the component (no GSAP),
 * so tests assert the final formatted string lands directly.
 */
import { render, screen } from '@testing-library/react';
import { BlastCountUp } from '../BlastCountUp';

describe('BlastCountUp', () => {
  it('renders the formatted final value (test env fast-path)', () => {
    render(<BlastCountUp value={12345} />);
    expect(screen.getByTestId('blast-count-up').textContent).toBe('12,345');
  });

  it('respects custom locale formatting', () => {
    render(<BlastCountUp value={1234567} locale="de-DE" />);
    // German uses '.' as thousand separator
    expect(screen.getByTestId('blast-count-up').textContent).toBe('1.234.567');
  });

  it('renders zero correctly', () => {
    render(<BlastCountUp value={0} />);
    expect(screen.getByTestId('blast-count-up').textContent).toBe('0');
  });

  it('applies className passthrough', () => {
    render(<BlastCountUp value={42} className="text-lime-400" />);
    expect(screen.getByTestId('blast-count-up').className).toContain('text-lime-400');
  });

  it('exposes data-testid override', () => {
    render(<BlastCountUp value={42} data-testid="my-score" />);
    expect(screen.getByTestId('my-score')).toBeInTheDocument();
  });
});
