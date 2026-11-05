import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HomeWeekCard } from '../HomeWeekCard';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const summary = { gamesPlayed: 5, gamesLast30d: 9, totalStudents: 34, activeClasses: 1, lastPlayedAt: {} };

afterEach(cleanup);

describe('HomeWeekCard', () => {
  it('Given 1 of 3 classes played, Then a labelled meter shows the share and its fill is decoration only', () => {
    render(<HomeWeekCard summary={summary} status="ready" classCount={3} t={t} />);
    const meter = screen.getByRole('progressbar', { name: 'eduShell.week.active' });
    expect(meter).toHaveAttribute('aria-valuenow', '1');
    expect(meter).toHaveAttribute('aria-valuemax', '3');
    expect(within(screen.getByTestId('home-week')).getByTestId('home-week-active-total')).toHaveTextContent('3');
    const fill = screen.getByTestId('home-week-active-fill');
    expect(fill.closest('[data-accent-decor]')).not.toBeNull();
    expect(fill.closest('[data-accent-decor]')!.querySelector('a,button')).toBeNull();
  });

  it('Given the read failed, Then every number is a dash and no meter claims a share', () => {
    render(<HomeWeekCard summary={null} status="error" classCount={3} t={t} />);
    for (const id of ['games', 'students', 'active']) expect(screen.getByTestId(`home-week-${id}`)).toHaveTextContent('—');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('Then the two counts sit in tiles, each with its own icon, and land on the real numbers', async () => {
    render(<HomeWeekCard summary={summary} status="ready" classCount={3} t={t} />);
    const tiles = screen.getAllByTestId('home-week-tile');
    expect(tiles).toHaveLength(2);
    for (const tile of tiles) expect(tile.querySelector('svg')).not.toBeNull();
    await waitFor(() => expect(screen.getByTestId('home-week-games')).toHaveTextContent('5'));
    await waitFor(() => expect(screen.getByTestId('home-week-students')).toHaveTextContent('34'));
  });
});

describe('HomeWeekCard in Hebrew', () => {
  it('Then "played / total" stays left-to-right so RTL never flips it to "3 / 1"', () => {
    render(<HomeWeekCard summary={summary} status="ready" classCount={3} t={t} />);
    expect(screen.getByTestId('home-week-active')).toHaveAttribute('dir', 'ltr');
  });
});

describe('HomeWeekCard markup', () => {
  it('Then every dt/dd pair sits in a group that is a direct child of the dl', () => {
    render(<HomeWeekCard summary={summary} status="ready" classCount={3} t={t} />);
    const dl = screen.getByTestId('home-week').querySelector('dl')!;
    const groups = Array.from(dl.children);
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.tagName).toBe('DIV');
      expect(Array.from(group.children).map((c) => c.tagName).every((tag) => tag === 'DT' || tag === 'DD')).toBe(true);
    }
  });
});
