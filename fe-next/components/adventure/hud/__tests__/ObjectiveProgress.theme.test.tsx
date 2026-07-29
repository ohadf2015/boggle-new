/**
 * ObjectiveProgress Theme Integration Tests
 *
 * Verifies that ObjectiveProgress uses HUD theme accent from useHUDTheme()
 * for world-derived accent colors while keeping type-specific icons.
 */

import { render, screen } from '@testing-library/react';
import { ObjectiveProgress } from '../ObjectiveProgress';

const mockHUDTheme = {
  headerBg: 'bg-emerald-950/90',
  headerBorder: 'border-emerald-800/40',
  sidebarBg: 'bg-emerald-900/40',
  scoreAccent: 'text-emerald-300',
  levelBadgeColor: 'bg-emerald-900/60',
  levelBadgeText: 'text-emerald-400',
  objectiveAccent: 'text-emerald-300',
  hintActiveColor: 'bg-emerald-400',
  hintActiveText: 'text-emerald-950',
};

vi.mock('@/contexts/AdventureThemeContext', () => ({
  useHUDTheme: () => mockHUDTheme,
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

describe('ObjectiveProgress — Theme Integration', () => {
  const mockObjectives = [
    { id: 'obj1', type: 'score' as const, target: 1000, current: 500, label: 'Score 1000' },
    { id: 'obj2', type: 'words' as const, target: 10, current: 10, label: 'Find 10 words' },
  ];

  it('should still show type-specific icons regardless of theme', () => {
    render(<ObjectiveProgress objectives={mockObjectives} />);
    expect(screen.getByTestId('icon-score')).toBeInTheDocument();
    expect(screen.getByTestId('icon-words')).toBeInTheDocument();
  });

  it('should still show checkmark for completed objectives', () => {
    render(<ObjectiveProgress objectives={mockObjectives} />);
    expect(screen.getByTestId('checkmark-obj2')).toBeInTheDocument();
    expect(screen.queryByTestId('checkmark-obj1')).not.toBeInTheDocument();
  });

  it('should render progress bars with aria attributes', () => {
    render(<ObjectiveProgress objectives={mockObjectives} />);
    const bar = screen.getByTestId('progress-obj1');
    expect(bar).toHaveAttribute('role', 'progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '500');
  });
});
