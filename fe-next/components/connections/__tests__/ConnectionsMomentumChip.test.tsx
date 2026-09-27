import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionsMomentumChip from '../ConnectionsMomentumChip';
import { momentumState } from '@/lib/connections/momentum';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

describe('ConnectionsMomentumChip', () => {
  it('shows the "to reward" nudge mid-run with a progress bar', () => {
    render(<ConnectionsMomentumChip state={momentumState({ solvedThisSession: 2, streak: 2 })} />);
    expect(screen.getByText('connections.momentum.toReward')).toBeTruthy();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('40'); // 2/5
  });

  it('shows the on-fire hype on a hot streak', () => {
    render(<ConnectionsMomentumChip state={momentumState({ solvedThisSession: 6, streak: 6 })} />);
    expect(screen.getByText('connections.momentum.onFire')).toBeTruthy();
  });

  it('shows the reward-earned message with a full bar at a milestone', () => {
    render(<ConnectionsMomentumChip state={momentumState({ solvedThisSession: 5, streak: 5 })} />);
    expect(screen.getByText('connections.momentum.rewardEarned')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows the start nudge before any solve', () => {
    render(<ConnectionsMomentumChip state={momentumState({ solvedThisSession: 0, streak: 0 })} />);
    expect(screen.getByText('connections.momentum.start')).toBeTruthy();
  });
});
