/**
 * ScoreBadge — solved/fail pill + optional streak pill, clickable.
 *
 * Locks current rendered behavior before reimplementing its internals on
 * top of GameBadge (variant="score-success"/"score-fail"/"streak", size
 * "lg" to match the original text-sm/px-2 py-1/w-4 h-4 dimensions) instead
 * of hand-rolled divs. Public props/behavior stay identical.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ScoreBadge } from '../ScoreBadge';

const baseProps = {
  attemptsUsed: 3,
  targetWord: 'WORD',
  streakDays: 0,
  language: 'en' as const,
};

describe('ScoreBadge', () => {
  it('shows attempts used out of 10 when solved', () => {
    render(<ScoreBadge {...baseProps} solved />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('shows X/10 when not solved', () => {
    render(<ScoreBadge {...baseProps} solved={false} />);
    expect(screen.getByText('X/10')).toBeInTheDocument();
  });

  it('shows a streak pill when streakDays > 0', () => {
    render(<ScoreBadge {...baseProps} solved streakDays={5} />);
    expect(screen.getByText('🔥5')).toBeInTheDocument();
  });

  it('omits the streak pill when streakDays is 0', () => {
    render(<ScoreBadge {...baseProps} solved streakDays={0} />);
    expect(screen.queryByText(/🔥/)).not.toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ScoreBadge {...baseProps} solved onClick={onClick} />);
    fireEvent.click(screen.getByText('3/10'));
    expect(onClick).toHaveBeenCalled();
  });
});
