import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/AvatarLite', () => ({ default: () => <span data-testid="avatar" /> }));
const wide = { value: true };
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => wide.value }));

import { HomeClassRoster } from '../HomeClassRoster';
import { rosterRows } from '../rosterModel';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const NOW = Date.parse('2026-11-04T12:00:00Z');
const DAY = 86_400_000;
const base = { wordsMastered: 12, wordsAttempted: 20, overallAccuracy: 81, currentStreak: 3 };
const ROWS = rosterRows([
  { ...base, studentId: 'a', displayName: 'Ava', totalXp: 900, lastPracticeDate: new Date(NOW - DAY).toISOString() },
  { ...base, studentId: 'b', displayName: 'Ben', totalXp: 300, lastPracticeDate: new Date(NOW - 10 * DAY).toISOString() },
  { ...base, studentId: 'c', displayName: 'Cy', totalXp: 0, lastPracticeDate: null },
], NOW);

const renderRoster = (rows = ROWS as typeof ROWS | null, failed = false) =>
  render(<HomeClassRoster rows={rows} failed={failed} language="en" nowMs={NOW} t={t} />);

beforeEach(() => {
  wide.value = true;
});
afterEach(cleanup);

describe('<HomeClassRoster>', () => {
  it('Given students, Then each row shows name, XP and a named status, never colour alone', () => {
    renderRoster();
    const rows = screen.getAllByTestId('home-roster-row');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Ava');
    expect(rows[0]).toHaveTextContent('900');
    expect(within(rows[0]).getByTestId('home-roster-pill')).toHaveAttribute('data-status', 'done');
    expect(within(rows[0]).getByText('eduShell.home.roster.statusShort.done')).not.toHaveClass('sr-only');
    expect(rows[1]).toHaveTextContent('eduShell.home.roster.statusShort.late');
    expect(within(rows[1]).getByTestId('home-roster-pill')).toHaveAttribute('data-status', 'late');
    expect(within(rows[2]).getByTestId('home-roster-pill')).toHaveAttribute('data-status', 'idle');
  });

  it('Given the status column, Then each status is a filled pill and only Behind is solid', () => {
    renderRoster();
    const pills = screen.getAllByTestId('home-roster-pill');
    expect(pills[0]).toHaveClass('bg-neo-lime/20');
    expect(pills[1]).toHaveClass('bg-neo-yellow', 'text-neo-black');
    expect(pills[2]).toHaveClass('bg-neo-cream/15');
  });

  it('Given a row, Then the name and XP are bold enough to scan', () => {
    renderRoster();
    const row = screen.getAllByTestId('home-roster-row')[0];
    expect(within(row).getByText('Ava')).toHaveClass('font-black');
    const xp = row.querySelector('[data-col="xp"] [data-testid="home-roster-xp"]')!;
    expect(xp).toHaveClass('font-black', 'rounded-full');
    expect(xp).toHaveTextContent('900');
    expect(xp.querySelector('svg')).not.toBeNull();
  });

  it('Given a row, Then it reads like a game roster: the avatar wears a ring in its status color and the meter is chunky and striped', () => {
    renderRoster();
    const rings = screen.getAllByTestId('home-roster-avatar-ring');
    expect(rings.map((r) => r.dataset.status)).toEqual(['done', 'late', 'idle']);
    expect(rings[0].className).toMatch(/ring-neo-lime/);
    expect(rings[1].className).toMatch(/ring-neo-yellow/);
    const [fill] = screen.getAllByTestId('home-roster-meter-fill');
    expect(fill.className).toContain('edu-stripes');
    expect(fill.parentElement!.className).toMatch(/border-2/);
    for (const pill of screen.getAllByTestId('home-roster-pill')) expect(pill.className).toMatch(/border-2/);
  });

  it('Given an assign handler, Then only Behind rows get a one-tap Assign beside the row', () => {
    const onAssign = vi.fn();
    render(<HomeClassRoster rows={ROWS} failed={false} language="en" nowMs={NOW} t={t} onAssign={onAssign} />);
    const actions = screen.getAllByTestId('home-roster-assign');
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAccessibleName('eduShell.home.roster.assignFor:{"name":"Ben"}');
    expect(screen.getAllByTestId('home-roster-row')[1]).not.toContainElement(actions[0]);
  });

  it('Given a Behind row, Then its Assign is a quiet ghost action that shows only on row hover, focus or selection', () => {
    render(<HomeClassRoster rows={ROWS} failed={false} language="en" nowMs={NOW} t={t} onAssign={vi.fn()} />);
    const action = screen.getByTestId('home-roster-assign');
    expect(action).not.toHaveClass('bg-neo-yellow');
    expect(action).toHaveClass('bg-transparent');
    expect(action.parentElement).toHaveClass('invisible', 'group-hover/row:visible', 'group-focus-within/row:visible');
    fireEvent.click(screen.getAllByTestId('home-roster-row')[1]);
    expect(screen.getByTestId('home-roster-assign').parentElement).not.toHaveClass('invisible');
  });

  it('Given students who still need to play, Then one bulk Assign practice sits in the header beside the Behind count', () => {
    const onAssignAll = vi.fn();
    render(<HomeClassRoster rows={ROWS} failed={false} language="en" nowMs={NOW} t={t} onAssign={vi.fn()} onAssignAll={onAssignAll} />);
    const summary = screen.getByTestId('home-roster-summary');
    const bulk = within(summary).getByTestId('home-roster-assign-all');
    expect(bulk).toHaveAccessibleName('eduShell.home.focus.assign');
    expect(bulk).not.toHaveClass('bg-neo-yellow');
    expect(bulk.previousElementSibling).toHaveTextContent('eduShell.home.roster.count.late');
    fireEvent.click(bulk);
    expect(onAssignAll).toHaveBeenCalledTimes(1);
  });

  it('Given everyone played this week, Then the header has no bulk Assign', () => {
    const done = rosterRows([{ ...base, studentId: 'a', displayName: 'Ava', totalXp: 9, lastPracticeDate: new Date(NOW - DAY).toISOString() }], NOW);
    render(<HomeClassRoster rows={done} failed={false} language="en" nowMs={NOW} t={t} onAssignAll={vi.fn()} />);
    expect(screen.queryByTestId('home-roster-assign-all')).not.toBeInTheDocument();
  });

  it('Given an open student drawer, Then its Assign is an outline secondary, not a second filled button', () => {
    render(<HomeClassRoster rows={ROWS} failed={false} language="en" nowMs={NOW} t={t} onAssign={vi.fn()} />);
    fireEvent.click(screen.getAllByTestId('home-roster-row')[1]);
    const btn = within(screen.getByTestId('home-roster-drawer')).getByRole('button', { name: 'eduShell.home.focus.assign' });
    expect(btn).not.toHaveClass('bg-neo-yellow');
  });

  it('When Assign is pressed, Then it calls back with that student and leaves the drawer closed', () => {
    const onAssign = vi.fn();
    render(<HomeClassRoster rows={ROWS} failed={false} language="en" nowMs={NOW} t={t} onAssign={onAssign} />);
    fireEvent.click(screen.getByTestId('home-roster-assign'));
    expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    expect(screen.queryByTestId('home-roster-drawer')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('home-roster-row')[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('Given no assign handler, Then no row shows an Assign action', () => {
    renderRoster();
    expect(screen.queryByTestId('home-roster-assign')).not.toBeInTheDocument();
  });

  it('Given the drawer of a student who has not played this week, Then it offers Assign practice too', () => {
    const onAssign = vi.fn();
    render(<HomeClassRoster rows={ROWS} failed={false} language="en" nowMs={NOW} t={t} onAssign={onAssign} />);
    fireEvent.click(screen.getAllByTestId('home-roster-row')[2]);
    fireEvent.click(within(screen.getByTestId('home-roster-drawer')).getByRole('button', { name: 'eduShell.home.focus.assign' }));
    expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });

  it('Given the column header, Then every label stays on one line', () => {
    renderRoster();
    const head = screen.getByTestId('home-roster-head');
    for (const cell of Array.from(head.children)) expect(cell).toHaveClass('whitespace-nowrap');
  });

  it('Given the table, Then header and every row read name | status | accuracy | XP | words in the same column order', () => {
    renderRoster();
    const head = screen.getByTestId('home-roster-head');
    expect(Array.from(head.children).map((c) => c.textContent)).toEqual([
      'eduShell.home.roster.colName',
      'eduShell.home.roster.colWeek',
      'eduShell.home.roster.colAccuracy',
      'eduShell.home.roster.colXp',
      'eduShell.home.roster.colWords',
    ]);
    for (const row of screen.getAllByTestId('home-roster-row')) {
      expect(Array.from(row.children).map((c) => c.getAttribute('data-col'))).toEqual(['name', 'status', 'accuracy', 'xp', 'words']);
    }
  });

  it('Given a student who answered words, Then the accuracy cell shows a meter filled to that share beside the percent', () => {
    renderRoster();
    const cell = screen.getAllByTestId('home-roster-row')[0].querySelector('[data-col="accuracy"]') as HTMLElement;
    expect(cell).toHaveTextContent('81%');
    const fill = within(cell).getByTestId('home-roster-meter-fill');
    expect(fill.style.width).toBe('81%');
  });

  it('Given a student who has not answered anything, Then the accuracy cell has no meter and names why', () => {
    const rows = rosterRows([{ ...base, wordsAttempted: 0, studentId: 'z', displayName: 'Zed', totalXp: 0, lastPracticeDate: null }], NOW);
    renderRoster(rows);
    const cell = screen.getByTestId('home-roster-row').querySelector('[data-col="accuracy"]') as HTMLElement;
    expect(within(cell).queryByTestId('home-roster-meter-fill')).not.toBeInTheDocument();
    expect(cell).toHaveTextContent('eduShell.home.roster.noWordsYet');
  });

  it('Given low accuracy, Then the meter turns pink so the struggling student stands out', () => {
    const rows = rosterRows([{ ...base, overallAccuracy: 45, studentId: 'y', displayName: 'Yo', totalXp: 9, lastPracticeDate: null }], NOW);
    renderRoster(rows);
    expect(screen.getByTestId('home-roster-meter-fill')).toHaveClass('bg-neo-pink');
  });

  it('Given the header, Then it sums up who played, who is behind and who has not started', () => {
    renderRoster();
    const summary = screen.getByTestId('home-roster-summary');
    expect(summary).toHaveTextContent('eduShell.home.roster.count.done:{"count":1}');
    expect(summary).toHaveTextContent('eduShell.home.roster.count.late:{"count":1}');
    expect(summary).toHaveTextContent('eduShell.home.roster.count.idle:{"count":1}');
  });

  it('Given a wide screen, When a row is clicked, Then a side drawer shows two stat chips and recent activity', () => {
    renderRoster();
    fireEvent.click(screen.getAllByTestId('home-roster-row')[0]);
    const drawer = screen.getByTestId('home-roster-drawer');
    expect(drawer).toHaveTextContent('Ava');
    expect(within(drawer).getAllByTestId('home-roster-stat')).toHaveLength(2);
    expect(within(drawer).getByTestId('home-roster-activity')).toHaveTextContent('eduShell.home.roster.streak:{"count":3}');
    expect(screen.getAllByTestId('home-roster-row')[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('Given the drawer is open, When close is pressed, Then it goes away and no row stays selected', () => {
    renderRoster();
    fireEvent.click(screen.getAllByTestId('home-roster-row')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(screen.queryByTestId('home-roster-drawer')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('home-roster-row')[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('Given a phone, When a row is tapped, Then the detail opens as a dialog sheet', () => {
    wide.value = false;
    renderRoster();
    fireEvent.click(screen.getAllByTestId('home-roster-row')[2]);
    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveTextContent('Cy');
    expect(within(sheet).getByTestId('home-roster-activity')).toHaveTextContent('eduShell.home.roster.notYet');
  });

  it('Given a student with no streak, Then the drawer says so instead of "0-day streak"', () => {
    const rows = rosterRows([{ ...base, currentStreak: 0, studentId: 'z', displayName: 'Zed', totalXp: 5, lastPracticeDate: null }], NOW);
    renderRoster(rows);
    fireEvent.click(screen.getByTestId('home-roster-row'));
    expect(screen.getByTestId('home-roster-activity')).toHaveTextContent('eduShell.home.roster.noStreak');
  });

  it('Given no students yet, Then it says how to get them in instead of an empty table', () => {
    renderRoster([]);
    expect(screen.getByTestId('home-roster-empty')).toHaveTextContent('eduShell.home.roster.empty');
  });

  it('Given the read is still in flight, Then it shows placeholder rows', () => {
    renderRoster(null);
    expect(screen.getByTestId('home-roster-loading')).toBeInTheDocument();
  });

  it('Given the read failed, Then it says so instead of claiming the class is empty', () => {
    renderRoster(null, true);
    expect(screen.getByTestId('home-roster-error')).toHaveTextContent('eduShell.home.roster.error');
    expect(screen.queryByTestId('home-roster-empty')).not.toBeInTheDocument();
  });
});
