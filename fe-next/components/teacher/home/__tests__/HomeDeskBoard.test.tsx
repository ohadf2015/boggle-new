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
  it('Given a Pro class, Then three status tiles and one Results tile show, with the roster folded behind See all', () => {
    render(<HomeDeskBoard {...props()} />);
    const tiles = screen.getAllByTestId('home-status-tile');
    expect(tiles.map((el) => el.getAttribute('data-status'))).toEqual(['done', 'late', 'idle']);
    expect(tiles[0]).toHaveTextContent('2');
    expect(tiles[1]).toHaveTextContent('1');
    expect(tiles[2]).toHaveTextContent('1');
    expect(screen.queryByTestId('home-roster')).toBeNull();
    expect(screen.getByTestId('home-roster-see-all')).toHaveTextContent('eduShell.home.roster.seeAll:{"count":4}');
    expect(within(screen.getByTestId('home-weekly-reports')).getByRole('button')).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('When the teacher taps Behind, Then the roster opens on just the students who are behind', () => {
    render(<HomeDeskBoard {...props()} />);
    const late = screen.getAllByTestId('home-status-tile')[1];
    fireEvent.click(late);
    expect(late).toHaveAttribute('aria-expanded', 'true');
    const rows = within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Ben');
  });

  it('When the teacher taps the same tile again, Then the roster folds away', () => {
    render(<HomeDeskBoard {...props()} />);
    const late = screen.getAllByTestId('home-status-tile')[1];
    fireEvent.click(late);
    fireEvent.click(late);
    expect(screen.queryByTestId('home-roster')).toBeNull();
    expect(late).toHaveAttribute('aria-expanded', 'false');
  });

  it('When the teacher taps See all, Then every student shows', () => {
    render(<HomeDeskBoard {...props()} />);
    fireEvent.click(screen.getByTestId('home-roster-see-all'));
    expect(within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-row')).toHaveLength(4);
  });

  it('Given the student read is in flight, Then the tiles hold their shape without numbers', () => {
    render(<HomeDeskBoard {...props({ roster: { rows: null, failed: false } })} />);
    expect(screen.getAllByTestId('home-status-tile-loading')).toHaveLength(3);
    expect(screen.queryByTestId('home-status-tile')).toBeNull();
  });

  it('When the teacher taps Results, Then the one results entry opens and shows the ready count', () => {
    const onOpenResults = vi.fn();
    render(<HomeDeskBoard {...props({ onOpenResults, readyLabel: '2 of 3 ready' })} />);
    expect(screen.getByTestId('home-ready-chip')).toHaveTextContent('2 of 3 ready');
    fireEvent.click(within(screen.getByTestId('home-weekly-reports')).getByRole('button'));
    expect(onOpenResults).toHaveBeenCalledTimes(1);
  });

  it('Given a free teacher, Then no per-student tiles show; who missed the last game gets practice in one tap', () => {
    const onHomework = vi.fn();
    render(<HomeDeskBoard {...props({ roster: null, missed: { count: 6, onHomework } })} />);
    expect(screen.queryByTestId('home-status-tile')).toBeNull();
    expect(screen.queryByTestId('home-roster-see-all')).toBeNull();
    fireEvent.click(screen.getByTestId('home-homework'));
    expect(onHomework).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('home-weekly-reports')).toBeInTheDocument();
  });

  it('Given a class with no students yet, Then no status tiles show', () => {
    render(<HomeDeskBoard {...props({ roster: { rows: [], failed: false }, memberCount: 0 })} />);
    expect(screen.queryByTestId('home-status-tile')).toBeNull();
    expect(screen.queryByTestId('home-roster-see-all')).toBeNull();
  });

  it('Given no status tiles and nobody missed a game, Then the Results tile takes the whole row instead of half', () => {
    render(<HomeDeskBoard {...props({ roster: null, missed: null })} />);
    expect(screen.getByTestId('home-weekly-reports')).toHaveClass('sm:col-span-2');
  });

  it('Given nobody is behind, Then that tile shows 0 and does not open an empty list', () => {
    const allDone = rosterRows([{ ...base, studentId: 'a', displayName: 'Ava', totalXp: 9, lastPracticeDate: new Date(NOW - DAY).toISOString() }], NOW);
    render(<HomeDeskBoard {...props({ roster: { rows: allDone, failed: false }, memberCount: 1 })} />);
    const late = screen.getAllByTestId('home-status-tile')[1];
    expect(late).toBeDisabled();
    fireEvent.click(late);
    expect(screen.queryByTestId('home-roster')).toBeNull();
  });

  it('Given a desktop screen, Then the whole roster is open under the tiles and the toggle folds it', () => {
    wide.value = true;
    render(<HomeDeskBoard {...props()} />);
    expect(within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-row')).toHaveLength(4);
    const toggle = screen.getByTestId('home-roster-see-all');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('eduShell.home.roster.hide');
    fireEvent.click(toggle);
    expect(screen.queryByTestId('home-roster')).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('Given a desktop screen, When the teacher taps Behind, Then the open roster narrows to who is behind', () => {
    wide.value = true;
    render(<HomeDeskBoard {...props()} />);
    fireEvent.click(screen.getAllByTestId('home-status-tile')[1]);
    expect(within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-row')).toHaveLength(1);
  });
});
