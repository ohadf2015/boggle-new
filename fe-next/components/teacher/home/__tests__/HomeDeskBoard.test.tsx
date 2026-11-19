import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/AvatarLite', () => ({ default: () => <span data-testid="avatar" /> }));
const wide = { value: false };
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => wide.value }));

import { HomeDeskBoard, type HomeDeskBoardProps } from '../HomeDeskBoard';
import { rosterRows } from '../rosterModel';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const NOW = Date.parse('2026-11-04T12:00:00Z');
const DAY = 86_400_000;
const base = { wordsMastered: 12, wordsAttempted: 20, overallAccuracy: 81, currentStreak: 3 };
const ROWS = rosterRows([
  { ...base, studentId: 'a', displayName: 'Ava', totalXp: 900, lastPracticeDate: new Date(NOW - DAY).toISOString() },
  { ...base, studentId: 'b', displayName: 'Ben', totalXp: 300, lastPracticeDate: new Date(NOW - 10 * DAY).toISOString() },
  { ...base, studentId: 'c', displayName: 'Cy', totalXp: 0, lastPracticeDate: null },
  { ...base, studentId: 'd', displayName: 'Dee', totalXp: 50, lastPracticeDate: new Date(NOW - 2 * DAY).toISOString() },
], NOW);
const ALL_DONE = rosterRows([{ ...base, studentId: 'a', displayName: 'Ava', totalXp: 9, lastPracticeDate: new Date(NOW - DAY).toISOString() }], NOW);

const props = (over: Partial<HomeDeskBoardProps> = {}): HomeDeskBoardProps => ({
  roster: { rows: ROWS, failed: false },
  memberCount: 4,
  onOpenResults: vi.fn(),
  language: 'en',
  nowMs: NOW,
  t,
  ...over,
});

afterEach(() => {
  cleanup();
  wide.value = false;
});

describe('<HomeDeskBoard>', () => {
  it('Then no status tile row shows, on any screen', () => {
    wide.value = true;
    render(<HomeDeskBoard {...props()} />);
    expect(screen.queryByTestId('home-status-tile')).toBeNull();
  });

  it('Given a phone, Then the roster folds behind one line that says who played', () => {
    render(<HomeDeskBoard {...props()} />);
    expect(screen.queryByTestId('home-roster')).toBeNull();
    const toggle = screen.getByTestId('home-roster-see-all');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('eduShell.home.roster.count.done:{"count":2}');
    expect(toggle).toHaveTextContent('eduShell.home.roster.count.late:{"count":1}');
  });

  it('Given a phone line where nobody is behind, Then the zero is left out', () => {
    render(<HomeDeskBoard {...props({ roster: { rows: ALL_DONE, failed: false }, memberCount: 1 })} />);
    const toggle = screen.getByTestId('home-roster-see-all');
    expect(toggle).toHaveTextContent('eduShell.home.roster.count.done:{"count":1}');
    expect(toggle).not.toHaveTextContent('eduShell.home.roster.count.late');
    expect(toggle).not.toHaveTextContent('eduShell.home.roster.count.idle');
  });

  it('When the teacher taps that line, Then every student shows, and a second tap folds them away', () => {
    render(<HomeDeskBoard {...props()} />);
    const toggle = screen.getByTestId('home-roster-see-all');
    fireEvent.click(toggle);
    expect(within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-row')).toHaveLength(4);
    fireEvent.click(toggle);
    expect(screen.queryByTestId('home-roster')).toBeNull();
  });

  it('Given a desktop screen, Then the whole roster is open with no fold control', () => {
    wide.value = true;
    render(<HomeDeskBoard {...props()} />);
    expect(within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-row')).toHaveLength(4);
    expect(screen.queryByTestId('home-roster-see-all')).toBeNull();
  });

  it('Given a desktop screen, When the teacher taps Behind in the roster header, Then the list narrows to who is behind', () => {
    wide.value = true;
    render(<HomeDeskBoard {...props()} />);
    const late = screen.getAllByTestId('home-roster-filter').find((el) => el.getAttribute('data-status') === 'late') as HTMLElement;
    fireEvent.click(late);
    expect(late).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-row')).toHaveLength(1);
  });

  it('Given the student read is in flight on desktop, Then the roster holds its place with placeholder rows', () => {
    wide.value = true;
    render(<HomeDeskBoard {...props({ roster: { rows: null, failed: false } })} />);
    expect(screen.getByTestId('home-roster-loading')).toBeInTheDocument();
  });

  it('When the teacher taps Results, Then the one results entry opens and shows the ready count', () => {
    const onOpenResults = vi.fn();
    render(<HomeDeskBoard {...props({ onOpenResults, readyLabel: '2 of 3 ready' })} />);
    expect(screen.getByTestId('home-ready-chip')).toHaveTextContent('2 of 3 ready');
    fireEvent.click(within(screen.getByTestId('home-weekly-reports')).getByRole('button'));
    expect(onOpenResults).toHaveBeenCalledTimes(1);
  });

  it('Then the results entry is one purple row', () => {
    render(<HomeDeskBoard {...props()} />);
    expect(within(screen.getByTestId('home-weekly-reports')).getAllByRole('button')).toHaveLength(1);
    expect(within(screen.getByTestId('home-weekly-reports')).getByRole('button').className).toMatch(/(^|\s)bg-neo-purple(\s|$)/);
  });

  it('Given a free teacher, Then no roster shows; who missed the last game gets practice in one tap', () => {
    const onHomework = vi.fn();
    render(<HomeDeskBoard {...props({ roster: null, missed: { count: 6, onHomework } })} />);
    expect(screen.queryByTestId('home-roster-see-all')).toBeNull();
    fireEvent.click(screen.getByTestId('home-homework'));
    expect(onHomework).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('home-weekly-reports')).toBeInTheDocument();
  });

  it('Given a class with no students yet, Then no roster line shows', () => {
    render(<HomeDeskBoard {...props({ roster: { rows: [], failed: false }, memberCount: 0 })} />);
    expect(screen.queryByTestId('home-roster-see-all')).toBeNull();
    expect(screen.queryByTestId('home-roster')).toBeNull();
  });

  it('Given the student read failed, Then it says so instead of showing an empty class', () => {
    render(<HomeDeskBoard {...props({ roster: { rows: null, failed: true } })} />);
    expect(screen.getByTestId('home-roster-error')).toBeInTheDocument();
  });
});
