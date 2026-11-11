import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('@/lib/daily/streakClient', () => ({ claimStreakMilestoneRequest: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn(), fireFireworks: vi.fn() }));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));
vi.mock('@/utils/coinEarnedFx', () => ({ emitCoinEarned: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { claimStreakMilestoneRequest } from '@/lib/daily/streakClient';
import { emitCoinEarned } from '@/utils/coinEarnedFx';
import { StreakMilestoneReveal } from '../StreakMilestoneReveal';

describe('StreakMilestoneReveal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('celebrates the milestone with the flame of its tier and the coins on offer', () => {
    render(<StreakMilestoneReveal milestone={{ days: 7, coins: 60 }} source="test" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('dailyStreak.flame.milestoneTitle:7');
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', 'blue');
    expect(screen.getByTestId('streak-milestone-claim')).toHaveTextContent('dailyStreak.flame.claim:60');
  });

  it('pays on claim and flies the coins once', async () => {
    const onClaimed = vi.fn();
    vi.mocked(claimStreakMilestoneRequest).mockResolvedValue({ ok: true, days: 7, coins: 60, claimed: true });
    render(<StreakMilestoneReveal milestone={{ days: 7, coins: 60 }} source="test" onClose={vi.fn()} onClaimed={onClaimed} />);
    fireEvent.click(screen.getByTestId('streak-milestone-claim'));
    await waitFor(() => expect(screen.getByTestId('streak-milestone-paid')).toHaveTextContent('dailyStreak.flame.paid:60'));
    expect(emitCoinEarned).toHaveBeenCalledTimes(1);
    expect(onClaimed).toHaveBeenCalled();
  });

  it('Given a repeat claim (already paid), shows the reward without flying coins again', async () => {
    vi.mocked(claimStreakMilestoneRequest).mockResolvedValue({ ok: true, days: 7, coins: 60, claimed: false });
    render(<StreakMilestoneReveal milestone={{ days: 7, coins: 60 }} source="test" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('streak-milestone-claim'));
    await waitFor(() => expect(screen.getByTestId('streak-milestone-paid')).toBeInTheDocument());
    expect(emitCoinEarned).not.toHaveBeenCalled();
  });

  it('Given the claim fails, says so and lets the player retry', async () => {
    vi.mocked(claimStreakMilestoneRequest).mockResolvedValue({ ok: false, reason: 'failed' });
    render(<StreakMilestoneReveal milestone={{ days: 7, coins: 60 }} source="test" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('streak-milestone-claim'));
    await waitFor(() => expect(screen.getByTestId('streak-milestone-failed')).toBeInTheDocument());
    expect(screen.getByTestId('streak-milestone-claim')).not.toBeDisabled();
  });
});
