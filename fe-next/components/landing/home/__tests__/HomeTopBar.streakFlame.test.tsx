import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeTopBar } from '../HomeTopBar';
import { useAccountStreak } from '@/hooks/useAccountStreak';

vi.mock('@/components/AvatarLite', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-lite-stub" />,
}));

vi.mock('@/hooks/useAccountStreak', () => ({
  useAccountStreak: vi.fn(() => ({ streak: 3, loading: false })),
}));

const t = (key: string, _params?: unknown) => key;

describe('HomeTopBar streak flame', () => {
  beforeEach(() => {
    vi.mocked(useAccountStreak).mockReturnValue({ streak: 3, loading: false });
  });

  it('shows the tiered streak flame in the chip instead of an icon', () => {
    render(
      <HomeTopBar
        profile={null}
        language="en"
        t={t as never}
        profileLoading={false}
      />,
    );
    const chip = screen.getByTestId('home-streak-chip');
    expect(chip.querySelector('[data-testid="streak-flame"]')).toHaveAttribute('data-tier', 'flame');
  });

  it('shows no sleeping flame while the streak is still loading', () => {
    // Given a returning player whose streak has not resolved
    vi.mocked(useAccountStreak).mockReturnValue({ streak: 0, loading: true });
    // When the bar renders
    render(<HomeTopBar profile={null} language="en" t={t as never} profileLoading={false} />);
    // Then the chip keeps its space without implying the streak is out
    const chip = screen.getByTestId('home-streak-chip');
    expect(chip.querySelector('[data-testid="streak-flame"]')).toBeNull();
    expect(chip.querySelector('[data-testid="home-streak-flame-slot"]')).not.toBeNull();
  });
});
