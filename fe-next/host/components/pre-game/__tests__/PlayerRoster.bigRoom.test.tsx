import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerRoster } from '../PlayerRoster';

vi.mock('../../../../components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('../../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
  useSocketOptional: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
}));
vi.mock('../../../../components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));

const t = (k: string, p?: Record<string, string | number>) => (p && 'count' in p ? `${k}#${p.count}` : k);

function room(n: number) {
  return [{ username: 'Host', isHost: true }, ...Array.from({ length: n - 1 }, (_, i) => ({ username: `P${i + 1}` }))];
}

type Entry = { target: Element; rootBounds: { left: number; right: number }; boundingClientRect: { left: number; right: number } };
const observers: Array<{ cb: (entries: Entry[]) => void; els: Element[] }> = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', class {
    els: Element[] = [];
    constructor(public cb: (entries: Entry[]) => void) { observers.push(this); }
    observe(el: Element) { this.els.push(el); }
    disconnect() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

/** Lay the strip's items out 70px apart in a 300px-wide scroller; `rtl` mirrors them leftwards. */
function layOut(rtl = false) {
  const io = observers[observers.length - 1];
  act(() => io.cb(io.els.map((target, i) => ({
    target,
    rootBounds: { left: 0, right: 300 },
    boundingClientRect: rtl ? { left: 236 - i * 70, right: 300 - i * 70 } : { left: i * 70, right: i * 70 + 64 },
  }))));
}

describe('PlayerRoster — empty chairs never outnumber the gap to 8', () => {
  it('a full 15-player room draws no empty chairs', () => {
    render(<PlayerRoster players={room(15)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    expect(screen.getAllByTestId('lobby-seat')).toHaveLength(15);
    expect(screen.queryAllByTestId('lobby-seat-empty')).toHaveLength(0);
  });

  it('a 7-player room draws exactly one empty chair', () => {
    render(<PlayerRoster players={room(7)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    expect(screen.getAllByTestId('lobby-seat-empty')).toHaveLength(1);
  });
});

describe('PlayerRoster — the header tells the true room size', () => {
  it('27 players read 27/50, never 27/8', () => {
    render(<PlayerRoster players={room(27)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" />);
    expect(screen.getByTestId('roster-count')).toHaveTextContent('27/50');
  });

  it('a small room keeps the familiar x/8', () => {
    render(<PlayerRoster players={room(3)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    expect(screen.getByTestId('roster-count')).toHaveTextContent('3/8');
  });
});

describe('PlayerRoster — TV wall for a big room', () => {
  it('8 players keep the 4-column wall with two-line names', () => {
    render(<PlayerRoster players={room(8)} username="TV" gameCode="ABCD" maxPlayers={8} t={t} variant="tv" />);
    expect(screen.getByTestId('roster-grid').className).toMatch(/grid-cols-4/);
    expect(screen.queryByTestId('roster-players-chip')).toBeNull();
  });

  it('15 players go to a 6-column wall', () => {
    render(<PlayerRoster players={room(15)} username="TV" gameCode="ABCD" maxPlayers={8} t={t} variant="tv" />);
    expect(screen.getByTestId('roster-grid').className).toMatch(/grid-cols-6/);
  });

  it('27 players fit a 10-column wall with one-line names, a capped height and a "27 players" chip', () => {
    render(<PlayerRoster players={room(27)} username="TV" gameCode="ABCD" maxPlayers={8} t={t} variant="tv" />);
    const grid = screen.getByTestId('roster-grid');
    expect(grid.className).toMatch(/grid-cols-10/);
    expect(grid.className).toMatch(/max-h-/);
    expect(grid.className).toMatch(/overflow-hidden/);
    expect(screen.getAllByTestId('lobby-seat')).toHaveLength(27);
    expect(screen.getByText('P5').className).toMatch(/line-clamp-1/);
    expect(screen.getByTestId('roster-players-chip')).toHaveTextContent('mpUi.lobby.playersInRoom#27');
  });

  it('past 30 the wall shows the newest 29 joiners and a "+N" tile for the rest', () => {
    render(<PlayerRoster players={room(40)} username="TV" gameCode="ABCD" maxPlayers={8} t={t} variant="tv" />);
    expect(screen.getAllByTestId('lobby-seat')).toHaveLength(29);
    expect(screen.getByText('P39')).toBeInTheDocument();
    expect(screen.queryByText('Host')).toBeNull();
    expect(screen.getByTestId('roster-overflow-tile')).toHaveTextContent('+11');
    expect(screen.getByTestId('roster-players-chip')).toHaveTextContent('mpUi.lobby.playersInRoom#40');
  });
});

describe('PlayerRoster — phone strip says more players are off-screen', () => {
  it('shows "+N" for seats past the end edge and fades the strip there', () => {
    render(<PlayerRoster players={room(12)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" />);
    layOut();
    // 11 others at 70px steps in 300px: centres of items 0-3 are inside, 4+ are past the edge
    const cue = screen.getByTestId('roster-more-cue');
    expect(cue).toHaveTextContent('+7');
    expect(cue).toHaveAttribute('aria-label', 'mpUi.lobby.morePlayers#7');
    expect(cue.className).toMatch(/min-\[720px\]:hidden/);
    const scroller = screen.getByTestId('roster-strip').parentElement!;
    expect(scroller.className).toMatch(/mask-image/);
  });

  it('counts the left edge as the end in Hebrew (RTL)', () => {
    render(<div dir="rtl"><PlayerRoster players={room(12)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" /></div>);
    layOut(true);
    expect(screen.getByTestId('roster-more-cue')).toHaveTextContent('+7');
  });

  it('no cue when every seat fits', () => {
    render(<PlayerRoster players={room(3)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" />);
    layOut();
    expect(screen.queryByTestId('roster-more-cue')).toBeNull();
    expect(screen.getByTestId('roster-strip').parentElement!.className).not.toMatch(/mask-image/);
  });

  it('tapping the cue scrolls the strip toward the hidden seats', () => {
    render(<PlayerRoster players={room(12)} username="Host" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" />);
    layOut();
    const scroller = screen.getByTestId('roster-strip').parentElement!;
    const scrollBy = vi.fn();
    Object.assign(scroller, { scrollBy });
    fireEvent.click(screen.getByTestId('roster-more-cue'));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });
});
