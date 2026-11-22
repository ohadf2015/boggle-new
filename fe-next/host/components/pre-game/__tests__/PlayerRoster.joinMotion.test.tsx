import { vi } from 'vitest';
/* eslint-disable react/display-name */
/**
 * PlayerRoster — lobby ready badges + count
 *
 * The host roster surfaces which non-host players have flagged themselves ready
 * (server `playersReadyUpdate.readyUsernames`) via a per-avatar check badge and
 * a "N/M Ready" header chip. Bots auto-count as ready; the host is excluded.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerRoster } from '../PlayerRoster';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLElement>) => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'layout'].includes(k)) clean[k] = v;
      }
      return React.createElement('div', { ref, ...clean }, children as React.ReactNode);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));
vi.mock('../../../../components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('../../../../utils/SocketContext', () => ({ useSocket: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }) }));
vi.mock('../../../../components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));

const t = (k: string) => k;

const host = { username: 'Host', isHost: true };
const roster = (players: { username: string; isHost?: boolean }[], variant: 'host' | 'guest' = 'host') => (
  <PlayerRoster players={players} username="Host" gameCode="ABCD" maxPlayers={8} t={t} variant={variant} />
);

function reduceMotion(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes('reduce'), media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('PlayerRoster — join motion', () => {
  const original = window.matchMedia;
  afterEach(() => { window.matchMedia = original; });

  it('Given seats already in the room at mount, Then nobody bursts', () => {
    reduceMotion(false);
    render(roster([host, { username: 'Alex' }]));
    expect(screen.queryAllByTestId('join-burst')).toHaveLength(0);
  });

  it('Given the lobby is open, When a player joins, Then only their seat bursts, with its own tilt', () => {
    reduceMotion(false);
    const { rerender } = render(roster([host]));
    rerender(roster([host, { username: 'Alex' }]));
    const bursts = screen.getAllByTestId('join-burst');
    expect(bursts).toHaveLength(1);
    const alex = screen.getAllByTestId('lobby-seat').find((s) => s.dataset.player === 'Alex')!;
    expect(alex).toContainElement(bursts[0]);
    expect(alex.style.getPropertyValue('--seat-tilt')).toMatch(/deg$/);
  });

  it('Given reduced motion, When a player joins, Then there is no burst and no idle bob', () => {
    reduceMotion(true);
    const { rerender } = render(roster([host]));
    rerender(roster([host, { username: 'Alex' }]));
    expect(screen.queryAllByTestId('join-burst')).toHaveLength(0);
    expect(document.querySelector('[data-bob="true"]')).toBeNull();
  });

  it('Given motion is allowed, Then seated avatars idle-bob', () => {
    reduceMotion(false);
    render(roster([host, { username: 'Alex' }]));
    expect(document.querySelectorAll('[data-bob="true"]')).toHaveLength(2);
  });

  it('offers the waiting game to the host; the guest gets it in the waiting card instead', () => {
    reduceMotion(false);
    const { unmount } = render(roster([host]));
    expect(screen.getByTestId('waiting-game-chip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('waiting-game-chip'));
    // HostPreGameView keys "keep the roster card whole" off this flag.
    expect(screen.getByTestId('bubble-pop').closest('section')).toHaveAttribute('data-game-open', 'true');
    unmount();
    render(roster([host], 'guest'));
    expect(screen.queryByTestId('waiting-game-chip')).toBeNull();
  });

  it('Given a classroom room, Then the teacher roster offers no waiting game', () => {
    reduceMotion(false);
    render(<PlayerRoster players={[host]} username="Host" gameCode="ABCD" maxPlayers={8} t={t} waitingGame={false} />);
    expect(screen.queryByTestId('waiting-game-chip')).toBeNull();
  });
});
