import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StreakHeatBadge from '../StreakHeatBadge';

let mockChest = {
  loading: false,
  daysCompleted: 2,
  currentStreak: 4,
  completedDates: ['2026-09-03', '2026-09-04'],
  cycleStart: '2026-09-03',
  isClaimable: false,
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (k: string, f?: string) => f ?? k }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <div {...p}>{children}</div>,
    span: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <span {...p}>{children}</span>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));

vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => mockChest,
}));

vi.mock('@/utils/streakShare', () => ({ shareStreak: vi.fn().mockResolvedValue(true) }));

describe('StreakHeatBadge', () => {
  beforeEach(() => {
    mockChest = {
      loading: false,
      daysCompleted: 2,
      currentStreak: 4,
      completedDates: ['2026-09-03', '2026-09-04'],
      cycleStart: '2026-09-03',
      isClaimable: false,
    };
  });

  it('renders the count and the tier mascot', () => {
    render(<StreakHeatBadge streak={4} today="2026-09-04" />);
    expect(screen.getByTestId('streak-heat-badge')).toHaveTextContent('4');
    // Day 4 ⇒ "hot" tier ⇒ kindling.
    expect(screen.getByTestId('mascot-streakKindling')).toBeInTheDocument();
  });

  // Days 1-2 are exactly when a streak is most likely to die, so the badge has
  // to be visible then — that is the whole point of the spark mascot.
  it('shows a one-day streak rather than hiding it until day 3', () => {
    mockChest = { ...mockChest, currentStreak: 1, completedDates: ['2026-09-04'] };
    render(<StreakHeatBadge streak={1} today="2026-09-04" />);
    expect(screen.getByTestId('streak-heat-badge')).toHaveTextContent('1');
    expect(screen.getByTestId('mascot-streakSpark')).toBeInTheDocument();
  });

  it('renders nothing when there is no streak at all', () => {
    mockChest = { ...mockChest, currentStreak: 0, completedDates: [] };
    const { container } = render(<StreakHeatBadge streak={0} today="2026-09-04" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the streak card when tapped', () => {
    render(<StreakHeatBadge streak={4} today="2026-09-04" />);
    expect(screen.queryByTestId('streak-heat-card')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('streak-heat-badge'));
    expect(screen.getByTestId('streak-heat-card')).toBeInTheDocument();
  });

  it('prefers the server streak over the locally passed one when they disagree', () => {
    // The server row is authoritative; a stale localStorage value must not win.
    mockChest = { ...mockChest, currentStreak: 12 };
    render(<StreakHeatBadge streak={4} today="2026-09-04" />);
    expect(screen.getByTestId('streak-heat-badge')).toHaveTextContent('12');
  });

  it('falls back to the local streak for guests with no server cycle', () => {
    mockChest = { ...mockChest, currentStreak: 0, cycleStart: '', completedDates: [] };
    render(<StreakHeatBadge streak={4} today="2026-09-04" />);
    expect(screen.getByTestId('streak-heat-badge')).toHaveTextContent('4');
  });

  it('flags a claimable chest so the badge invites the tap', () => {
    mockChest = { ...mockChest, isClaimable: true };
    render(<StreakHeatBadge streak={7} today="2026-09-09" />);
    expect(screen.getByTestId('streak-heat-badge')).toHaveAttribute('data-claimable', 'true');
  });

  it('uses no emoji', () => {
    const { container } = render(<StreakHeatBadge streak={4} today="2026-09-04" />);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
