import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HomeWeekChips } from '../HomeWeekChips';
import { TeacherHomeView, type TeacherHomeViewProps } from '../TeacherHomeView';

const t = (key: string) => key;
const summary = { gamesPlayed: 6, gamesLast30d: 9, totalStudents: 78, activeClasses: 2, lastPlayedAt: {} };

afterEach(cleanup);

describe('HomeWeekChips', () => {
  it('Given 6 games and 2 of 3 classes played, Then a labelled games chip and a classes meter show it', async () => {
    render(<HomeWeekChips summary={summary} classCount={3} t={t} />);
    const strip = screen.getByTestId('home-week-chips');
    expect(strip).toHaveAccessibleName('eduShell.week.title');
    await waitFor(() => expect(screen.getByTestId('home-week-chip-games')).toHaveTextContent('6'));
    expect(screen.getByTestId('home-week-chip-games')).toHaveTextContent('eduShell.week.games');
    const meter = screen.getByRole('progressbar', { name: 'eduShell.week.active' });
    expect(meter).toHaveAttribute('aria-valuenow', '2');
    expect(meter).toHaveAttribute('aria-valuemax', '3');
    expect(screen.getByTestId('home-week-chip-classes')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('home-week-chip-classes')).toHaveTextContent('2/3');
  });

  it('Given no class count, Then it renders nothing rather than a 0/0 meter', () => {
    const { container } = render(<HomeWeekChips summary={summary} classCount={0} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});

function view(overrides: Partial<TeacherHomeViewProps> = {}) {
  const props: TeacherHomeViewProps = {
    t, isRTL: false, greeting: 'Hi', cue: null, hasPro: false, ready: true, error: false, onRetry: () => undefined,
    hasClasses: true, onboarding: null, desk: <div />, sessions: null, accountBanner: null, hasRail: true,
    week: { summary, status: 'ready', classCount: 3 }, onOpenReports: null, proCard: null, ...overrides,
  };
  return render(<TeacherHomeView {...props} />);
}

describe('TeacherHomeView on a phone', () => {
  it('Then the week chips sit in the greeting row and hide where the rail card shows', () => {
    view();
    const chips = screen.getByTestId('home-week-chips');
    expect(chips.closest('header')).not.toBeNull();
    expect(chips.closest('.lg\\:hidden')).not.toBeNull();
  });

  it('Given the week read is still loading or failed, Then no chips claim a number', () => {
    view({ week: { summary: null, status: 'loading', classCount: 3 } });
    expect(screen.queryByTestId('home-week-chips')).toBeNull();
    cleanup();
    view({ week: { summary: null, status: 'error', classCount: 3 } });
    expect(screen.queryByTestId('home-week-chips')).toBeNull();
  });
});
