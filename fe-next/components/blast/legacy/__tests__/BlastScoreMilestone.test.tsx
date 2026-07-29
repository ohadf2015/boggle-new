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

// Fixed seed → deterministic jittered thresholds. Scores in these tests are
// chosen OUTSIDE every tier's jitter band so crossings are guaranteed regardless
// of the exact jitter, and the de-rounded behaviour can be asserted cleanly.
const SEED = 42;

describe('BlastScoreMilestone (de-rounded)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    playAchievementSound.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing while score is under the first threshold', () => {
    render(<BlastScoreMilestone score={40} seed={SEED} />);
    expect(screen.queryByTestId('blast-milestone-pill')).toBeNull();
    expect(playAchievementSound).not.toHaveBeenCalled();
  });

  it('pops a pill + plays sound when crossing the first tier', () => {
    render(<BlastScoreMilestone score={140} seed={SEED} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    expect(pill).toBeInTheDocument();
    // Tier label still anchors to the round tier (fallback "100!").
    expect(pill.textContent).toContain('100!');
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
  });

  it('shows the player\'s ACTUAL (organic) score, not the round threshold', () => {
    render(<BlastScoreMilestone score={137} seed={SEED} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    // The displayed number is the real score (137), not a round 100.
    expect(pill.textContent).toContain('137');
  });

  it('uses t() for the tier label when provided', () => {
    const t = (key: string) => `tr:${key}`;
    render(<BlastScoreMilestone score={140} seed={SEED} t={t} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    expect(pill.textContent).toContain('tr:blast.milestone.100');
  });

  it('formats large scores with a thousands separator', () => {
    const { rerender } = render(<BlastScoreMilestone score={140} seed={SEED} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={300} seed={SEED} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={600} seed={SEED} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={900} seed={SEED} />);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<BlastScoreMilestone score={1234} seed={SEED} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    expect(pill.textContent).toContain('1,234');
  });

  it('auto-hides the pill after ~1600ms', () => {
    render(<BlastScoreMilestone score={150} seed={SEED} />);
    expect(screen.getByTestId('blast-milestone-pill')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1700); });
    expect(screen.queryByTestId('blast-milestone-pill')).toBeNull();
  });

  it('does not re-fire for the same threshold across re-renders', () => {
    const { rerender } = render(<BlastScoreMilestone score={140} seed={SEED} />);
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1700); });
    // Score climbs but stays under the next tier (250 band tops out at 268).
    rerender(<BlastScoreMilestone score={200} seed={SEED} />);
    expect(screen.queryByTestId('blast-milestone-pill')).toBeNull();
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
  });

  it('fires a fresh pill when a higher tier is crossed', () => {
    const { rerender } = render(<BlastScoreMilestone score={140} seed={SEED} />);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(playAchievementSound).toHaveBeenCalledTimes(1);

    rerender(<BlastScoreMilestone score={300} seed={SEED} />);
    const pill = screen.getByTestId('blast-milestone-pill');
    expect(pill.textContent).toContain('250!');
    expect(pill.textContent).toContain('300');
    expect(playAchievementSound).toHaveBeenCalledTimes(2);
  });
});
