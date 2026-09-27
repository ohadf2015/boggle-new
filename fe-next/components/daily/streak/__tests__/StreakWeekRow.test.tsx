import React from 'react';
import { render, screen } from '@testing-library/react';
import StreakWeekRow from '../StreakWeekRow';
import { getStreakHeat } from '@/lib/streakHeat';

let mockDir = 'ltr';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: mockDir,
    t: (key: string) => key,
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));

const heat = getStreakHeat(4);

// 2026-09-03 is a Thursday, matching the reference screenshot's Th Fr Sa Su Mo Tu We.
const baseProps = {
  cycleStart: '2026-09-03',
  completedDates: ['2026-09-03', '2026-09-04'],
  today: '2026-09-04',
  currentStreak: 2,
  heat,
  isClaimable: false,
};

describe('StreakWeekRow', () => {
  beforeEach(() => {
    mockDir = 'ltr';
  });

  it('renders seven slots', () => {
    render(<StreakWeekRow {...baseProps} />);
    expect(screen.getAllByTestId(/^streak-day-\d$/)).toHaveLength(7);
  });

  it('labels each slot with the real weekday of its cycle date, not a Monday-start week', () => {
    render(<StreakWeekRow {...baseProps} />);
    const labels = screen.getAllByTestId(/^streak-day-label-/).map(el => el.textContent);
    // Thursday-anchored cycle ⇒ starts on Thu, never on Mon.
    expect(labels[0]).toMatch(/^Thu/);
    expect(labels[6]).toMatch(/^Wed/);
  });

  it('marks completed days as done and leaves the rest undone', () => {
    render(<StreakWeekRow {...baseProps} />);
    const slots = screen.getAllByTestId(/^streak-day-\d$/);
    expect(slots[0]).toHaveAttribute('data-done', 'true');
    expect(slots[1]).toHaveAttribute('data-done', 'true');
    expect(slots[2]).toHaveAttribute('data-done', 'false');
  });

  it('puts the chest in the last slot', () => {
    render(<StreakWeekRow {...baseProps} />);
    expect(screen.getByTestId('streak-chest-slot')).toBeInTheDocument();
    const slots = screen.getAllByTestId(/^streak-day-\d$/);
    expect(slots[6]).toContainElement(screen.getByTestId('streak-chest-slot'));
  });

  it('shows a locked chest mid-cycle and an open chest once claimable', () => {
    const { rerender } = render(<StreakWeekRow {...baseProps} />);
    expect(screen.getByTestId('mascot-streakChestClosed')).toBeInTheDocument();

    rerender(
      <StreakWeekRow
        {...baseProps}
        completedDates={[
          '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06',
          '2026-09-07', '2026-09-08', '2026-09-09',
        ]}
        today="2026-09-09"
        currentStreak={7}
        isClaimable
      />,
    );
    expect(screen.getByTestId('mascot-streakChestOpen')).toBeInTheDocument();
  });

  it('spans the lit pill over the completed run only', () => {
    render(<StreakWeekRow {...baseProps} />);
    // Two of seven done ⇒ the pill covers 2 slots.
    expect(screen.getByTestId('streak-lit-pill')).toHaveAttribute('data-span', '2');
  });

  it('renders no lit pill when nothing is done yet', () => {
    render(<StreakWeekRow {...baseProps} completedDates={[]} currentStreak={0} />);
    expect(screen.queryByTestId('streak-lit-pill')).not.toBeInTheDocument();
  });

  // RTL: Hebrew is a first-class locale here, and a row of days is directional.
  it('flips the row direction under RTL', () => {
    mockDir = 'rtl';
    render(<StreakWeekRow {...baseProps} />);
    expect(screen.getByTestId('streak-week-row')).toHaveAttribute('data-dir', 'rtl');
  });
});
