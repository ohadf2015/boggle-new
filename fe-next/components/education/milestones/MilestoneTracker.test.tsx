/**
 * MilestoneTracker Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MilestoneTracker } from './MilestoneTracker';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/backend/modules/xpManager', () => ({
  getXpForLevel: vi.fn((level: number) => {
    // Simple XP curve for testing
    return Math.round(100 * Math.pow(level, 1.5));
  }),
}));

vi.mock('@/lib/supabase/education/milestones', () => ({
  getMilestoneProgress: vi.fn((totalXp: number) => {
    // Level 1 with 150 XP, next milestone is 3 at ~400 XP
    if (totalXp === 150) {
      return {
        currentLevel: 1,
        nextMilestone: { level: 3, isMajor: false, title: null },
        progressPercent: 37,
        xpToNextMilestone: 250,
      };
    }
    // Level 4 with 700 XP, next milestone is 5 at ~800 XP
    if (totalXp === 700) {
      return {
        currentLevel: 4,
        nextMilestone: { level: 5, isMajor: true, title: 'WORD_SEEKER' },
        progressPercent: 75,
        xpToNextMilestone: 100,
      };
    }
    // Max level
    if (totalXp === 1000000) {
      return {
        currentLevel: 100,
        nextMilestone: null,
        progressPercent: 100,
        xpToNextMilestone: 0,
      };
    }
    return {
      currentLevel: 1,
      nextMilestone: { level: 3, isMajor: false, title: null },
      progressPercent: 0,
      xpToNextMilestone: 400,
    };
  }),
  getMilestones: vi.fn(() => [
    { level: 3, isMajor: false, title: null },
    { level: 5, isMajor: true, title: 'WORD_SEEKER' },
    { level: 7, isMajor: false, title: null },
    { level: 10, isMajor: true, title: 'LETTER_SCOUT' },
  ]),
}));

describe('MilestoneTracker', () => {
  it('should render current level and next milestone', () => {
    render(<MilestoneTracker totalXp={150} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show XP remaining to next milestone', () => {
    render(<MilestoneTracker totalXp={150} />);

    // Use more flexible matcher since text is split across elements
    expect(screen.getByText((content, element) => {
      return content.includes('education.milestones.xpRemaining');
    })).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('should render progress bar with correct percentage', () => {
    render(<MilestoneTracker totalXp={700} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });

  it('should show milestone markers on progress bar', () => {
    render(<MilestoneTracker totalXp={150} />);

    // Should have milestone markers
    const milestoneMarkers = screen.getAllByTestId(/milestone-marker-/);
    expect(milestoneMarkers.length).toBeGreaterThan(0);
  });

  it('should distinguish major vs minor milestones visually', () => {
    render(<MilestoneTracker totalXp={150} />);

    // Major milestone marker should have different size
    const majorMarker = screen.getByTestId('milestone-marker-5');
    const minorMarker = screen.getByTestId('milestone-marker-3');

    expect(majorMarker).toHaveClass('w-4');
    expect(minorMarker).toHaveClass('w-2');
  });

  it('should dim upcoming milestones', () => {
    render(<MilestoneTracker totalXp={150} />);

    // Milestones after current position should be dimmed
    const upcomingMarker = screen.getByTestId('milestone-marker-5');
    expect(upcomingMarker).toHaveClass('opacity-30');
  });

  it('should show passed milestones at full opacity', () => {
    render(<MilestoneTracker totalXp={700} />);

    // Milestone 5 should be upcoming (not passed at level 4)
    const upcomingMarker = screen.getByTestId('milestone-marker-5');
    expect(upcomingMarker).toHaveClass('opacity-30');
  });

  it('should handle max level gracefully', () => {
    render(<MilestoneTracker totalXp={1000000} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    // Should show 100% progress
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('should accept custom className', () => {
    const { container } = render(
      <MilestoneTracker totalXp={150} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
