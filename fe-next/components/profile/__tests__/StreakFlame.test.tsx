/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { StreakFlame } from '@/components/profile/StreakFlame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

describe('StreakFlame', () => {
  it('renders nothing when streak is 0 (no false flex)', () => {
    const { container } = render(<StreakFlame days={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for negative/undefined streaks', () => {
    const { container } = render(<StreakFlame days={undefined as unknown as number} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the day count when streak is active', () => {
    render(<StreakFlame days={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('labels the streak for screen readers via translation key', () => {
    render(<StreakFlame days={3} />);
    // aria-label uses the streak translation key
    expect(screen.getByLabelText(/profile\.streakDays/i)).toBeInTheDocument();
  });
});
