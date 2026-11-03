import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MpStandingsSection } from '../MpFullStandings';
import { pickVisibleRows } from '../mpResultsView';
import type { MpStandingRow } from '../mpStandings';

vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/hooks/useMediaQuery', () => ({ useIsDesktop: () => false }));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const room = (size: number, myRank: number): MpStandingRow[] =>
  Array.from({ length: size }, (_, i) => ({
    username: `player${i + 1}`,
    isMe: i + 1 === myRank,
    rank: i + 1,
    score: (size - i) * 10,
    seriesTotal: null,
    seriesDelta: 0,
  }));

const scrollIntoView = vi.fn();
beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});
beforeEach(() => scrollIntoView.mockClear());

function renderRoom(size: number, myRank: number, onOpenChange = vi.fn()) {
  const all = room(size, myRank);
  const visible = pickVisibleRows(all, 8);
  render(
    <MpStandingsSection
      allRows={all}
      rows={visible.rows}
      hiddenCount={visible.hiddenCount}
      gapBeforeLast={visible.gapBeforeLast}
      isRevealed={() => true}
      onOpenChange={onOpenChange}
      t={t}
    />,
  );
  return { onOpenChange };
}

const board = () => screen.getByTestId('mp-standings');
const openList = () => fireEvent.click(screen.getByTestId('mp-standings-show-all'));
const fullRows = () => within(screen.getByTestId('mp-full-standings-list')).getAllByTestId('mp-standing-row');

describe('MpStandingsSection: full standings in big rooms', () => {
  it('Given 8 players, Then the board shows all 8 with no more-chip and no way to open a list', () => {
    renderRoom(8, 3);
    expect(within(board()).getAllByTestId('mp-standing-row')).toHaveLength(8);
    expect(screen.queryByTestId('mp-standings-show-all')).toBeNull();
    expect(screen.queryByTestId('mp-full-standings')).toBeNull();
  });

  it('Given 9 players, When I tap the +1 chip, Then a dialog lists all 9 in rank order', () => {
    const { onOpenChange } = renderRoom(9, 2);
    const chip = screen.getByTestId('mp-standings-show-all');
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.getAttribute('aria-haspopup')).toBe('dialog');
    expect(chip.textContent).toContain('"count":1');
    openList();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(fullRows().map((r) => r.getAttribute('data-rank'))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('Given 27 players and I am 20th, Then the board keeps me as the last row and the chip opens all 27 with my row marked and scrolled to', () => {
    renderRoom(27, 20);
    const boardRows = within(board()).getAllByTestId('mp-standing-row');
    expect(boardRows).toHaveLength(8);
    expect(boardRows[7].getAttribute('data-me')).toBe('true');
    expect(boardRows[7].getAttribute('data-rank')).toBe('20');
    expect(screen.getByTestId('mp-standings-show-all').textContent).toContain('"count":19');

    openList();
    const rows = fullRows();
    expect(rows).toHaveLength(27);
    const mine = rows.filter((r) => r.getAttribute('data-me') === 'true');
    expect(mine).toHaveLength(1);
    expect(rows.indexOf(mine[0])).toBe(19);
    expect(mine[0].getAttribute('aria-current')).toBe('true');
    expect(mine[0].className).toMatch(/sticky/);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts[0]).toBe(rows[18]);
  });

  it('Given the full list is open, Then it is a keyboard-reachable labelled list and Esc closes it', () => {
    const { onOpenChange } = renderRoom(27, 20);
    openList();
    const list = screen.getByTestId('mp-full-standings-list');
    expect(list.tagName).toBe('OL');
    expect(list.getAttribute('tabindex')).toBe('0');
    expect(list.getAttribute('aria-label')).toBeTruthy();
    expect(screen.getByRole('dialog').textContent).toContain('"count":27');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('mp-full-standings')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('Given the full list, Then its rows are static (no reveal animation replays) and use a fixed height', () => {
    renderRoom(27, 20);
    openList();
    for (const r of fullRows()) {
      expect(r.getAttribute('data-revealed')).toBe('true');
      expect(r.className.split(/\s+/)).not.toContain('grow');
      expect(r.className.split(/\s+/)).not.toContain('shrink');
      expect(r.className).not.toMatch(/basis-/);
      expect(r.className).toMatch(/shrink-0/);
    }
  });

  it('Given a tap on the chip during the reveal, Then the pointer-down does not bubble (it would skip the show)', () => {
    const outer = vi.fn();
    const all = room(9, 2);
    const visible = pickVisibleRows(all, 8);
    render(
      <div onPointerDown={outer}>
        <MpStandingsSection allRows={all} rows={visible.rows} hiddenCount={visible.hiddenCount} isRevealed={() => true} t={t} />
      </div>,
    );
    fireEvent.pointerDown(screen.getByTestId('mp-standings-show-all'));
    expect(outer).not.toHaveBeenCalled();
  });

  it('Given the list opened mid-reveal, Then touches inside it never reach the stage, and it renders outside the stage DOM', () => {
    const outer = vi.fn();
    const all = room(27, 20);
    const visible = pickVisibleRows(all, 8);
    const { container } = render(
      <div onPointerDown={outer}>
        <MpStandingsSection allRows={all} rows={visible.rows} hiddenCount={visible.hiddenCount} isRevealed={() => true} t={t} />
      </div>,
    );
    openList();
    fireEvent.pointerDown(fullRows()[3]);
    fireEvent.pointerDown(screen.getByTestId('mp-sheet-scrim'));
    expect(outer).not.toHaveBeenCalled();
    const root = screen.getByTestId('mp-full-standings-root');
    expect(root.parentElement).toBe(document.body);
    expect(container.contains(root)).toBe(false);
  });
});

describe('MpStandingsSection: the board marks the skipped places above my row', () => {
  it('Given I finished 27th of 27, Then a gap marker sits between 7th and my row', () => {
    renderRoom(27, 27);
    const items = [...board().children];
    const gap = screen.getByTestId('mp-standings-gap');
    const myRow = within(board()).getAllByTestId('mp-standing-row')[7];
    expect(items.indexOf(gap)).toBe(items.indexOf(myRow) - 1);
  });

  it('Given I am in the top 8, Then there is no gap marker', () => {
    renderRoom(27, 3);
    expect(screen.queryByTestId('mp-standings-gap')).toBeNull();
  });
});
