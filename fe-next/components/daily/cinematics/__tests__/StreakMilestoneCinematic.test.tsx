import React from 'react';
import { render, screen } from '@testing-library/react';

import * as remotion from 'remotion';

vi.mock('../../../../lib/remotion/fonts', () => ({
  fredokaFamily: 'Fredoka, sans-serif',
  rubikFamily: 'Rubik, sans-serif',
}));

import { StreakMilestoneCinematic, STREAK_MILESTONE_DURATION_FRAMES } from '../StreakMilestoneCinematic';

beforeEach(() => {
  remotion.useCurrentFrame.mockReturnValue(150);
  remotion.useVideoConfig.mockReturnValue({ fps: 30, width: 1280, height: 720, durationInFrames: 240 });
  remotion.interpolate.mockImplementation((frame: number, inputRange: number[], outputRange: number[]) => {
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const t = Math.max(0, Math.min(1, (frame - inMin) / (inMax - inMin)));
    return outMin + t * (outMax - outMin);
  });
  remotion.spring.mockReturnValue(1);
});

describe('StreakMilestoneCinematic', () => {
  const defaultProps = {
    streakCount: 30,
    milestone: 30 as const,
    emoji: '🔥',
    title: '30 Day Streak!',
    subtitle: 'MILESTONE!',
  };

  it('should render the composition', () => {
    render(<StreakMilestoneCinematic {...defaultProps} />);
    expect(screen.getAllByTestId('absolute-fill').length).toBeGreaterThan(0);
  });

  it('should display streak count', () => {
    render(<StreakMilestoneCinematic {...defaultProps} />);
    // Count animation at frame 150 should show full count (30)
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('should display emoji', () => {
    render(<StreakMilestoneCinematic {...defaultProps} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<StreakMilestoneCinematic {...defaultProps} />);
    expect(screen.getByText('30 Day Streak!')).toBeInTheDocument();
  });

  it('should display subtitle', () => {
    render(<StreakMilestoneCinematic {...defaultProps} />);
    expect(screen.getByText('MILESTONE!')).toBeInTheDocument();
  });

  it('should render rewards when provided', () => {
    render(
      <StreakMilestoneCinematic
        {...defaultProps}
        rewards={[{ type: 'gold', amount: 50 }]}
      />
    );
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('GOLD')).toBeInTheDocument();
  });

  it('should have confetti for milestone >= 30', () => {
    render(<StreakMilestoneCinematic {...defaultProps} />);
    const confetti = screen.queryAllByTestId('confetti-piece');
    expect(confetti.length).toBeGreaterThan(0);
  });

  it('should NOT have confetti for small milestones', () => {
    render(
      <StreakMilestoneCinematic
        {...defaultProps}
        streakCount={7}
        milestone={7}
        title="7 Day Streak!"
      />
    );
    const confetti = screen.queryAllByTestId('confetti-piece');
    expect(confetti).toHaveLength(0);
  });

  it('should export correct duration', () => {
    expect(STREAK_MILESTONE_DURATION_FRAMES).toBe(240);
  });
});
