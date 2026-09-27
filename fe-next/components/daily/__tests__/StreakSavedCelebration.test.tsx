import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StreakSavedCelebration from '../StreakSavedCelebration';

// Keep the test light — stub the heavy celebration deps
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: true, enableComplexAnimations: false }),
}));
vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: () => <div data-testid="mascot" />,
}));

const t = (key: string, params?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'streak.saved.title': 'Streak Saved!',
    'streak.saved.subtitle': 'A Streak Freeze covered your missed day.',
    'streak.saved.freezesLeft': `${params?.count ?? 0} freezes left`,
    'streak.saved.freezesLeftNone': 'No freezes left',
    'streak.saved.dismiss': 'Phew! Keep it going',
  };
  return map[key] ?? key;
};

describe('StreakSavedCelebration', () => {
  it('renders nothing when closed', () => {
    render(<StreakSavedCelebration isOpen={false} onClose={() => {}} freezesRemaining={2} t={t} />);
    expect(screen.queryByText('Streak Saved!')).toBeNull();
  });

  it('shows title + subtitle when open', () => {
    render(<StreakSavedCelebration isOpen onClose={() => {}} freezesRemaining={2} t={t} />);
    expect(screen.getByText('Streak Saved!')).toBeTruthy();
    expect(screen.getByText('A Streak Freeze covered your missed day.')).toBeTruthy();
  });

  it('shows remaining freezes count', () => {
    render(<StreakSavedCelebration isOpen onClose={() => {}} freezesRemaining={2} t={t} />);
    expect(screen.getByText('2 freezes left')).toBeTruthy();
  });

  it('shows the no-freezes-left copy when remaining is 0', () => {
    render(<StreakSavedCelebration isOpen onClose={() => {}} freezesRemaining={0} t={t} />);
    expect(screen.getByText('No freezes left')).toBeTruthy();
  });

  it('calls onClose when the dismiss button is clicked', () => {
    const onClose = vi.fn();
    render(<StreakSavedCelebration isOpen onClose={onClose} freezesRemaining={1} t={t} />);
    fireEvent.click(screen.getByText('Phew! Keep it going'));
    expect(onClose).toHaveBeenCalled();
  });
});
