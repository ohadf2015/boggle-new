import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { StreakView } from '@/hooks/useStreakView';

let mockUser: { id: string } | null = { id: 'u1' };
let mockView: Partial<StreakView>;
const refresh = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('@/hooks/useStreakView', () => ({ useStreakView: () => ({ ...mockView, refresh }) }));

vi.mock('next/dynamic', () => ({
  default: () => (props: { milestone: { days: number } }) => <div data-testid="reveal-stub">{props.milestone.days}</div>,
}));

import { StreakMilestonePopup } from '../StreakMilestonePopup';

const ready = { loading: false, milestone: { claimable: { days: 7, coins: 60 }, next: null } };

describe('StreakMilestonePopup', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUser = { id: 'u1' };
    mockView = ready;
    refresh.mockClear();
    vi.useRealTimers();
  });

  it('refetches the streak after the results land, since the score may still be saving', () => {
    vi.useFakeTimers();
    render(<StreakMilestonePopup source="test" blocked={false} />);
    expect(refresh).toHaveBeenCalledWith(true);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(refresh).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('Given a reward is ready, opens the claim moment after the second look, once per milestone', () => {
    vi.useFakeTimers();
    const first = render(<StreakMilestonePopup source="test" blocked={false} />);
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId('reveal-stub')).toHaveTextContent('7');
    first.unmount();
    render(<StreakMilestonePopup source="test" blocked={false} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
    vi.useRealTimers();
  });

  it('Given the claim moment opened, the home cheer for that streak run stays quiet', async () => {
    vi.useFakeTimers();
    mockView = { ...ready, current: 7, playedToday: true };
    render(<StreakMilestonePopup source="test" blocked={false} />);
    act(() => { vi.advanceTimersByTime(2000); });
    const { cheerMilestone } = await import('../milestoneCheer');
    const { getDailyChallengeDate } = await import('@/utils/dailyChallenge/dateUtils');
    expect(localStorage.getItem(cheerMilestone(7, true, getDailyChallengeDate())!.key)).toBe('1');
    vi.useRealTimers();
  });

  it('waits while another popup (the day prize) holds the screen', () => {
    vi.useFakeTimers();
    render(<StreakMilestonePopup source="test" blocked />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
    vi.useRealTimers();
  });

  it('Given a guest, never opens (nothing can be claimed)', () => {
    mockUser = null;
    render(<StreakMilestonePopup source="test" blocked={false} />);
    expect(screen.queryByTestId('reveal-stub')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });
});
