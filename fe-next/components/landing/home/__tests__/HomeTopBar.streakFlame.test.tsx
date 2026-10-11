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

  it('flickers the flame only under motion-safe so reduced-motion users get a still icon', () => {
    render(
      <HomeTopBar
        profile={null}
        language="en"
        t={t as never}
        profileLoading={false}
      />,
    );
    const chip = screen.getByTestId('home-streak-chip');
    const flame = chip.querySelector('svg');
    expect(flame).not.toBeNull();
    expect(flame?.getAttribute('class')).toContain('motion-safe:animate-streak-flicker');
  });
});
