import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BlastScoreMilestone } from '../BlastScoreMilestone';

// Inline motion children so the pill is queryable immediately.
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = () => {
    const Comp = ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      void initial; void animate; void exit; void transition;
      return <div {...rest}>{children}</div>;
    };
    return Comp;
  };
  return {
    AdaptiveMotion: new Proxy({}, { get: () => passthrough() }),
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const playAchievementSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playAchievementSound }),
}));

describe('BlastScoreMilestone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    playAchievementSound.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing while score is under the first threshold', () => {
    render(<BlastScoreMilestone score={50} />);
    expect(screen.queryByTestId('blast-milestone-pill')).toBeNull();
    expect(playAchievementSound).not.toHaveBeenCalled();
  });

  it('pops a pill + plays sound when crossing the 100 threshold', () => {
    render(<BlastScoreMilestone score={120} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    expect(pill).toBeInTheDocument();
    // Pops the lowest un-crossed tier (100) with its fallback "100!" label.
    expect(pill.textContent).toContain('100!');
    // Shows the tier threshold value (not the raw score) — that's the milestone.
    expect(pill.textContent).toContain('100');
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
  });

  it('uses t() for the tier label when provided', () => {
    const t = (key: string) => `tr:${key}`;
    render(<BlastScoreMilestone score={120} t={t} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    // Crosses 100 first — label routes through t().
    expect(pill.textContent).toContain('tr:blast.milestone.100');
  });

  it('formats large milestone values with thousands separator', () => {
    // Bump lastMilestoneRef past lower tiers by starting just below 1000
    // then rerendering to 1200 — tier 1000 pops and "1,000" should render.
    const { rerender } = render(<BlastScoreMilestone score={120} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={260} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={520} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={780} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={1200} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    expect(pill.textContent).toContain('1,000');
  });

  it('auto-hides the pill after ~1600ms', () => {
    render(<BlastScoreMilestone score={150} />);
    expect(screen.getByTestId('blast-milestone-pill')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1700); });
    expect(screen.queryByTestId('blast-milestone-pill')).toBeNull();
  });

  it('does not re-fire for the same threshold across re-renders', () => {
    const { rerender } = render(<BlastScoreMilestone score={120} />);
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1700); });

    // Score climbs but stays under the next threshold (250).
    rerender(<BlastScoreMilestone score={200} />);
    expect(screen.queryByTestId('blast-milestone-pill')).toBeNull();
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
  });

  it('auto-hides pill even when score changes after milestone', () => {
    const { rerender } = render(<BlastScoreMilestone score={120} />);
    expect(screen.getByTestId('blast-milestone-pill')).toBeInTheDocument();
    // Score changes mid-animation (no new milestone crossed)
    rerender(<BlastScoreMilestone score={140} />);
    rerender(<BlastScoreMilestone score={180} />);
    // Pill should still dismiss after the timer
    act(() => { vi.advanceTimersByTime(1700); });
    expect(screen.queryByTestId('blast-milestone-pill')).toBeNull();
  });

  it('fires a fresh pill when a higher threshold is crossed', () => {
    const { rerender } = render(<BlastScoreMilestone score={120} />);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(playAchievementSound).toHaveBeenCalledTimes(1);

    rerender(<BlastScoreMilestone score={260} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    // Pill now shows the 250 tier threshold, not the raw score.
    expect(pill.textContent).toContain('250');
    expect(playAchievementSound).toHaveBeenCalledTimes(2);
  });
});
