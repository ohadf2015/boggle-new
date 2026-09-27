/**
 * BlastScoreFly — stuck-popup regression.
 * In MP, a board update from any player re-renders the board mid-flight and
 * interrupts the Framer Motion animation, so onAnimationComplete never fires
 * and the "+N" popup is orphaned on screen forever. A timeout fallback must
 * guarantee the fly is removed regardless.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { BlastScoreFly, type ScoreFlyEvent } from '../BlastScoreFly';

// Stub AdaptiveMotion so onAnimationComplete NEVER fires (mirrors the stuck
// MP case where the animation is interrupted before completion).
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, onAnimationComplete: _oac, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      void _oac; // deliberately dropped — animation never "completes"
      return <div {...props}>{children}</div>;
    },
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const fly: ScoreFlyEvent = { id: 'fly-1', score: 13, startX: 50, startY: 50, tier: 2 };

describe('BlastScoreFly stuck-popup guard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('removes a fly via a timeout fallback even if onAnimationComplete never fires', () => {
    const onComplete = vi.fn();
    render(<BlastScoreFly flies={[fly]} onComplete={onComplete} />);

    // Animation interrupted: onAnimationComplete dropped, so nothing yet.
    expect(onComplete).not.toHaveBeenCalled();

    // After the max lifetime elapses, the fallback must clear it.
    act(() => { vi.advanceTimersByTime(5000); });

    expect(onComplete).toHaveBeenCalledWith('fly-1');
  });

  it('calls onComplete at most once per fly (idempotent)', () => {
    const onComplete = vi.fn();
    render(<BlastScoreFly flies={[fly]} onComplete={onComplete} />);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onComplete.mock.calls.filter(c => c[0] === 'fly-1')).toHaveLength(1);
  });
});

describe('BlastScoreFly lucky/jackpot bonus tag', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a separate bonus tag showing the lucky upside', () => {
    const luckyFly: ScoreFlyEvent = { id: 'fly-lucky', score: 52, startX: 50, startY: 50, tier: 3, bonus: 12, luckyTier: 'jackpot' };
    render(<BlastScoreFly flies={[luckyFly]} onComplete={vi.fn()} />);
    const tag = screen.getByTestId('score-fly-bonus');
    expect(tag).toBeTruthy();
    expect(tag.textContent).toContain('12');
  });

  it('omits the bonus tag for a plain (common) fly', () => {
    render(<BlastScoreFly flies={[fly]} onComplete={vi.fn()} />);
    expect(screen.queryByTestId('score-fly-bonus')).toBeNull();
  });
});
