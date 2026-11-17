import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { StreakView } from '@/hooks/useStreakView';

let mockUser: { id: string } | null = { id: 'u1' };
let mockView: Partial<StreakView>;
let mockCrazyGames = false;
const refresh = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('@/hooks/useStreakView', () => ({ useStreakView: () => ({ ...mockView, refresh }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockCrazyGames }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) =>
    String(loader).includes('AuthModal')
      ? (props: { isOpen: boolean; initialMode?: string }) =>
          props.isOpen ? <div data-testid="auth-modal-stub" data-mode={props.initialMode} /> : null
      : (props: { milestone: { days: number }; mode?: string; onSignup?: () => void }) => (
          <div data-testid="reveal-stub" data-mode={props.mode ?? 'claim'}>
            {props.milestone.days}
            {props.onSignup && <button type="button" data-testid="reveal-signup" onClick={props.onSignup} />}
          </div>
        ),
}));

import { StreakMilestonePopup } from '../StreakMilestonePopup';

const ready = { loading: false, isGuest: false, current: 7, playedToday: true, milestone: { claimable: { days: 7, coins: 60 }, next: null } };
const guestAt = (current: number): Partial<StreakView> => ({
  loading: false,
  isGuest: true,
  current,
  playedToday: true,
  milestone: { claimable: null, next: null },
});

function settle() {
  act(() => { vi.advanceTimersByTime(2000); });
}

describe('StreakMilestonePopup', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUser = { id: 'u1' };
    mockView = ready;
    mockCrazyGames = false;
    refresh.mockClear();
    vi.useFakeTimers();
  });

  it('refetches the streak after the results land, since the score may still be saving', () => {
    render(<StreakMilestonePopup source="test" blocked={false} />);
    expect(refresh).toHaveBeenCalledWith(true);
    settle();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('Given a reward is ready, opens the claim moment after the second look, once per milestone', () => {
    const first = render(<StreakMilestonePopup source="test" blocked={false} />);
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
    settle();
    expect(screen.getByTestId('reveal-stub')).toHaveTextContent('7');
    expect(screen.getByTestId('reveal-stub')).toHaveAttribute('data-mode', 'claim');
    first.unmount();
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
  });

  it('Given the claim moment opened, the home cheer for that streak run stays quiet', async () => {
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    const { cheerMilestone } = await import('../milestoneCheer');
    const { getDailyChallengeDate } = await import('@/utils/dailyChallenge/dateUtils');
    expect(localStorage.getItem(cheerMilestone(7, true, getDailyChallengeDate())!.key)).toBe('1');
  });

  it('waits while another popup (the day prize) holds the screen', () => {
    render(<StreakMilestonePopup source="test" blocked />);
    settle();
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
  });

  it('Given a guest on day 30, cheers the streak and offers sign-up to keep it', () => {
    mockUser = null;
    mockView = guestAt(30);
    render(<StreakMilestonePopup source="test" blocked={false} />);
    expect(refresh).not.toHaveBeenCalled();
    settle();
    expect(screen.getByTestId('reveal-stub')).toHaveAttribute('data-mode', 'cheer');
    expect(screen.getByTestId('reveal-stub')).toHaveTextContent('30');
    fireEvent.click(screen.getByTestId('reveal-signup'));
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
    expect(screen.getByTestId('auth-modal-stub')).toHaveAttribute('data-mode', 'signup');
  });

  it.each([100, 365])('Given a guest on day %i, cheers it', (days) => {
    mockUser = null;
    mockView = guestAt(days);
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.getByTestId('reveal-stub')).toHaveTextContent(String(days));
  });

  it.each([7, 14, 31])('Given a guest on day %i, stays quiet (not a celebrated milestone)', (days) => {
    mockUser = null;
    mockView = guestAt(days);
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
  });

  it('Given a guest on CrazyGames, cheers without the sign-up nudge', () => {
    mockUser = null;
    mockCrazyGames = true;
    mockView = guestAt(30);
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.getByTestId('reveal-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('reveal-signup')).toBeNull();
  });

  it('Given a guest cheer, does not repeat after a reload', () => {
    mockUser = null;
    mockView = guestAt(30);
    const first = render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.getByTestId('reveal-stub')).toBeInTheDocument();
    first.unmount();
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
  });

  it('Given a signed-in player on day 365 with nothing to claim, cheers it without a sign-up nudge', () => {
    mockView = { ...ready, current: 365, milestone: { claimable: null, next: null } };
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.getByTestId('reveal-stub')).toHaveAttribute('data-mode', 'cheer');
    expect(screen.getByTestId('reveal-stub')).toHaveTextContent('365');
    expect(screen.queryByTestId('reveal-signup')).toBeNull();
  });

  it('Given the 30-day claim opened and closed, the cheer does not follow it as a second modal', () => {
    mockView = { ...ready, current: 30, milestone: { claimable: { days: 30, coins: 250 }, next: null } };
    const { rerender } = render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.getByTestId('reveal-stub')).toHaveAttribute('data-mode', 'claim');
    mockView = { ...mockView, milestone: { claimable: null, next: null } };
    rerender(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.getAllByTestId('reveal-stub')).toHaveLength(1);
    expect(screen.getByTestId('reveal-stub')).toHaveAttribute('data-mode', 'claim');
  });

  it('Given the streak is still loading, shows nothing', () => {
    mockUser = null;
    mockView = { ...guestAt(30), loading: true, isGuest: false };
    render(<StreakMilestonePopup source="test" blocked={false} />);
    settle();
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
  });

  it('Given a guest cheer is due while the score reveal is up, waits for it', () => {
    mockUser = null;
    mockView = guestAt(30);
    const { rerender } = render(<StreakMilestonePopup source="test" blocked />);
    settle();
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
    rerender(<StreakMilestonePopup source="test" blocked={false} />);
    expect(screen.getByTestId('reveal-stub')).toBeInTheDocument();
  });
});
