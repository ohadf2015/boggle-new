import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakFlame } from '../StreakFlame';

describe('StreakFlame', () => {
  it.each([
    [0, 'none'],
    [2, 'ember'],
    [5, 'flame'],
    [9, 'blue'],
    [20, 'violet'],
    [45, 'legendary'],
  ])('Given %i days, draws the %s tier', (days, tier) => {
    render(<StreakFlame days={days} size={64} />);
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', tier);
  });

  it('crowns only the legendary tier', () => {
    const { rerender } = render(<StreakFlame days={29} size={64} />);
    expect(screen.queryByTestId('streak-flame-crown')).toBeNull();
    rerender(<StreakFlame days={30} size={64} />);
    expect(screen.getByTestId('streak-flame-crown')).toBeInTheDocument();
  });

  it('is decorative art: hidden from screen readers', () => {
    render(<StreakFlame days={3} size={64} />);
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a worried face while the streak is at risk, and a still flame when not animated', () => {
    render(<StreakFlame days={3} size={64} mood="worried" animated={false} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame).toHaveAttribute('data-mood', 'worried');
    expect(flame.querySelector('[data-animated="true"]')).toBeNull();
  });
});
