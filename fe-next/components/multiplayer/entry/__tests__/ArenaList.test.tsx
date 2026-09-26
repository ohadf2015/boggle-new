/**
 * OPEN ARENAS (DESIGN §b.1): the list never extends the page. Phone shows at
 * most 4 rows, desktop/TV 8 — capped with CSS breakpoints (no JS density hook,
 * pitfall class 1) — and a "+N more" chip opens the full list in an MpSheet.
 * Carries the old RoomListView guarantees: ARIA list, keyboard navigation, one
 * join in flight at a time, refresh.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActiveRoom } from '@/shared/types/game';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/utils/posthogEngagement', () => ({
  trackMpRoomJoinClicked: vi.fn(),
  trackMpRoomJoinBlocked: vi.fn(),
}));

import { ArenaList, PHONE_ROW_CAP, DESKTOP_ROW_CAP } from '../ArenaList';

const room = (i: number, over: Partial<ActiveRoom & { hostUsername: string }> = {}): ActiveRoom =>
  ({
    gameCode: `ROOM0${i}`,
    roomName: `Room ${i}`,
    playerCount: 2,
    maxPlayers: 8,
    language: 'en',
    gameState: 'waiting',
    isRanked: false,
    createdAt: 1000 + i,
    ...over,
  }) as ActiveRoom;

const rooms = (n: number) => Array.from({ length: n }, (_, i) => room(i + 1));

const base = { loading: false, onRoomClick: vi.fn(), onRefresh: vi.fn(), joiningRoomCode: null as string | null };

describe('ArenaList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is a labelled ARIA list with one item per room', () => {
    render(<ArenaList {...base} rooms={rooms(2)} />);
    const list = screen.getByRole('list', { name: 'multiplayerFlow.roomList.roomsListLabel' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('caps rows with CSS: phone 4, desktop 8', () => {
    expect(PHONE_ROW_CAP).toBe(4);
    expect(DESKTOP_ROW_CAP).toBe(8);
    render(<ArenaList {...base} rooms={rooms(11)} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(8);
    items.slice(0, 4).forEach((li) => expect(li.className).not.toMatch(/(^|\s)hidden(\s|$)/));
    items.slice(4).forEach((li) => {
      expect(li.className).toMatch(/(^|\s)hidden(\s|$)/);
      expect(li.className).toMatch(/lg:flex|lg:block/);
    });
  });

  it('"+N more" chips count what each breakpoint hides', () => {
    render(<ArenaList {...base} rooms={rooms(11)} />);
    expect(screen.getByTestId('arena-more-phone').textContent).toContain('"count":7');
    expect(screen.getByTestId('arena-more-phone').className).toMatch(/lg:hidden/);
    expect(screen.getByTestId('arena-more-desktop').textContent).toContain('"count":3');
    expect(screen.getByTestId('arena-more-desktop').className).toMatch(/hidden lg:/);
  });

  it('no "more" chips when everything fits', () => {
    render(<ArenaList {...base} rooms={rooms(4)} />);
    expect(screen.queryByTestId('arena-more-phone')).toBeNull();
    expect(screen.queryByTestId('arena-more-desktop')).toBeNull();
  });

  it('the more chip opens every room in a sheet, and a pick there joins it', () => {
    const onRoomClick = vi.fn();
    render(<ArenaList {...base} onRoomClick={onRoomClick} rooms={rooms(6)} />);
    fireEvent.click(screen.getByTestId('arena-more-phone'));
    const sheet = screen.getByTestId('arena-all-sheet');
    const buttons = within(sheet).getAllByRole('button', { name: /multiplayerFlow\.roomList\.joinRoomAction/ });
    expect(buttons).toHaveLength(6);
    fireEvent.click(buttons[5]);
    expect(onRoomClick).toHaveBeenCalledWith(expect.objectContaining({ gameCode: 'ROOM06' }));
  });

  it('joinable rooms come first (waiting and not full before live or full)', () => {
    const list = [
      room(1, { gameState: 'in-progress' as never }),
      room(2, { playerCount: 8 }),
      room(3),
    ];
    render(<ArenaList {...base} rooms={list} />);
    const names = within(screen.getByRole('list')).getAllByRole('button').map((b) => b.getAttribute('data-code'));
    expect(names[0]).toBe('ROOM03');
  });

  it('a row tap joins that room', () => {
    const onRoomClick = vi.fn();
    render(<ArenaList {...base} onRoomClick={onRoomClick} rooms={rooms(2)} />);
    fireEvent.click(within(screen.getByRole('list')).getAllByRole('button')[1]);
    expect(onRoomClick).toHaveBeenCalledWith(expect.objectContaining({ gameCode: 'ROOM02' }));
  });

  it('one join at a time: every row disables, the joining one is busy with a spinner', () => {
    const onRoomClick = vi.fn();
    render(<ArenaList {...base} onRoomClick={onRoomClick} rooms={rooms(2)} joiningRoomCode="ROOM01" />);
    const [first, second] = within(screen.getByRole('list')).getAllByRole('button');
    expect(first).toBeDisabled();
    expect(first).toHaveAttribute('aria-busy', 'true');
    expect(second).toBeDisabled();
    expect(second).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByTestId('room-join-spinner')).toBeInTheDocument();
    fireEvent.click(second);
    expect(onRoomClick).not.toHaveBeenCalled();
  });

  it('arrow keys move between rows', () => {
    render(<ArenaList {...base} rooms={rooms(3)} />);
    const buttons = within(screen.getByRole('list')).getAllByRole('button');
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(buttons[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('room titles keep their own direction and case; the host gets its own line', () => {
    render(<ArenaList {...base} rooms={[room(1, { roomName: 'hosthost2 TS Room', hostUsername: 'אוהד' } as never)]} />);
    const title = screen.getByText('hosthost2 TS Room');
    expect(title.getAttribute('dir')).toBe('auto');
    expect(title.className).toMatch(/truncate/);
    expect(title.className).not.toMatch(/uppercase/);
    expect(screen.getByText(/mpUi\.entry\.hostedBy/).textContent).toContain('אוהד');
  });

  it('refresh is a labelled button', () => {
    const onRefresh = vi.fn();
    render(<ArenaList {...base} onRefresh={onRefresh} rooms={rooms(1)} />);
    fireEvent.click(screen.getByLabelText('common.refresh'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows the live player count', () => {
    render(<ArenaList {...base} rooms={rooms(3)} />);
    expect(screen.getByTestId('arena-online').textContent).toContain('"count":6');
  });

  it('a row\'s seats bump when someone joins that room live — not on first paint', () => {
    const { rerender } = render(<ArenaList {...base} rooms={[room(1, { playerCount: 2 })]} />);
    const first = screen.getByTestId('arena-row-seats');
    expect(first.className).not.toContain('animate-mp-bump');
    rerender(<ArenaList {...base} rooms={[room(1, { playerCount: 3 })]} />);
    const bumped = screen.getByTestId('arena-row-seats');
    expect(bumped.textContent).toContain('3/8');
    expect(bumped.className).toContain('animate-mp-bump');
    expect(bumped).not.toBe(first);
  });

  it('a short list ends in a live tail — a mascot line that fills the column, no buttons', () => {
    render(<ArenaList {...base} rooms={rooms(1)} />);
    const tail = screen.getByTestId('arena-list-tail');
    expect(tail.textContent).toContain('mpUi.entry.moreSoon');
    expect(within(tail).queryByRole('button')).toBeNull();
    expect(tail.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("a row's seat icon and chevron scale with its TV type, not stay phone-sized", () => {
    render(<ArenaList {...base} rooms={rooms(1)} />);
    const seatsIcon = screen.getByTestId('arena-row-seats').querySelector('svg')!;
    expect(seatsIcon.getAttribute('class')).toMatch(/(^|\s)tv:h-5(\s|$)/);
    const chevron = screen.getByTestId('arena-row-seats').nextElementSibling!;
    expect(chevron.getAttribute('class')).toMatch(/(^|\s)tv:h-6(\s|$)/);
  });

  it("the tail's mascot loads eagerly — with a short list it is the phone's LCP element", () => {
    render(<ArenaList {...base} rooms={rooms(1)} />);
    const img = screen.getByTestId('arena-list-tail').querySelector('img');
    expect(img?.getAttribute('loading')).toBe('eager');
  });

  it('the tail steps aside on phone once the phone rows are full, and entirely once desktop is', () => {
    const { unmount } = render(<ArenaList {...base} rooms={rooms(PHONE_ROW_CAP)} />);
    expect(screen.getByTestId('arena-list-tail').className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(screen.getByTestId('arena-list-tail').className).toContain('lg:flex');
    unmount();
    render(<ArenaList {...base} rooms={rooms(DESKTOP_ROW_CAP)} />);
    expect(screen.queryByTestId('arena-list-tail')).toBeNull();
  });

  it('empty: one mascot line, no buttons competing with the footer', () => {
    render(<ArenaList {...base} rooms={[]} />);
    const empty = screen.getByTestId('arena-empty-state');
    expect(empty.textContent).toContain('mpUi.entry.emptyTitle');
    expect(within(empty).queryAllByRole('button')).toHaveLength(0);
  });

  it('loading with nothing yet: skeleton rows', () => {
    render(<ArenaList {...base} loading rooms={[]} />);
    expect(screen.getByTestId('room-list-skeleton')).toBeInTheDocument();
  });

  it('a timed-out fetch offers a retry', () => {
    const onRefresh = vi.fn();
    render(<ArenaList {...base} onRefresh={onRefresh} rooms={[]} fetchTimedOut />);
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomList.retry' }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
