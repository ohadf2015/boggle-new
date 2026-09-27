import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockT = vi.fn((key: string) => key);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

vi.mock('@/hooks/useClassroomLeaderboard', () => ({
  useClassroomLeaderboard: () => ({
    topThree: [],
    currentUserRank: { rank: 3, totalXp: 500 },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({ currentStreak: 5, isLoaded: true, lastWinDate: null }),
}));

vi.mock('@/backend/modules/xpManager', () => ({
  getXpProgress: () => ({
    currentLevel: 7,
    xpInCurrentLevel: 200,
    xpNeededForNextLevel: 500,
    progressPercent: 40,
  }),
}));

vi.mock('@/components/education/milestones/MilestoneTracker', () => ({
  MilestoneTracker: () => <div data-testid="milestone-tracker" />,
}));

vi.mock('@/components/education/milestones/MilestoneCelebration', () => ({
  MilestoneCelebration: () => null,
}));

vi.mock('@/lib/supabase/education/milestones', () => ({
  checkMilestoneCrossed: () => null,
  getMilestoneRewards: () => [],
}));

vi.mock('@/components/ui/InteractiveMascot', () => ({
  // Echoes `sizeClassName` the way the real component does — it concatenates it
  // onto the same wrapper it puts `role="button"` on, which is the element the
  // contrast audit measures. A mock that swallowed the prop would let a missing
  // edge class pass here and fail in the browser.
  InteractiveMascot: ({ sizeClassName }: { sizeClassName?: string }) => (
    <div data-testid="mascot" role="button" className={sizeClassName} />
  ),
}));

vi.mock('framer-motion', () => {
  const R = require('react');
  const Div = R.forwardRef(function Div(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return R.createElement('div', { ...rest, ref }, children);
  });
  return {
    m: { div: Div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { StudentHubProgressZone } from '../StudentHubProgressZone';

describe('StudentHubProgressZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders XP level', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders streak count', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    // Streak shows "5 common.days"
    expect(screen.getByText(/5\s+common\.days/)).toBeInTheDocument();
  });

  it('renders milestone tracker', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByTestId('milestone-tracker')).toBeInTheDocument();
  });

  it('renders rank display', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  /**
   * The mascot in the lime header takes `enableHover`, and `InteractiveMascot`
   * turns any interactivity into `role="button"` + `tabIndex=0`. The live
   * contrast audit therefore judges it as a control and measured edgeRatio 0:
   * it is a transparent box sitting on the same lime fill as its parent, so
   * nothing marks where it begins. Both of the obvious retreats are worse — a
   * mascot that cannot react is not this product, and dropping the role would
   * hide a focusable element from the audit rather than fix it. A black ring is
   * the house answer on a light fill (black-on-lime measures 20.7:1, against
   * the 3:1 the edge rule asks for) and it reads as a badge, not a patch.
   */
  it('gives the header mascot an edge, since it is exposed as a control', () => {
    const { container } = render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    const mascot = container.querySelector('[role="button"]');
    expect(mascot).not.toBeNull();
    // Width written literally: twMerge folds `border-neo` into the same class
    // group as `border-neo-<colour>` and drops the width, leaving it borderless.
    expect(mascot!.className).toContain('border-[2px]');
    expect(mascot!.className).toContain('border-neo-black');
  });
});
