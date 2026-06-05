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
import { render, screen } from '@testing-library/react';
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
  useReducedMotion: () => true,
}));
vi.mock('../../../../components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('../../../../utils/SocketContext', () => ({ useSocket: () => ({ socket: { emit: vi.fn() } }) }));
vi.mock('../../../../components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));

const t = (k: string) => k;

const players = [
  { username: 'Host', isHost: true },
  { username: 'Alex' },
  { username: 'Bea' },
  { username: 'Botty', isBot: true, botDifficulty: 'medium' },
];

describe('PlayerRoster — ready indicators', () => {
  it('shows a 0/N chip when readyUsernames is empty but eligible humans exist', () => {
    render(<PlayerRoster players={players} username="Host" gameCode="ABCD" maxPlayers={8} t={t} readyUsernames={[]} />);
    // eligible humans = Alex+Bea (host + bot excluded)
    expect(screen.getByTestId('roster-ready-count')).toHaveTextContent('0/2');
  });

  it('counts only ready humans, excluding host and bots (server semantics)', () => {
    render(<PlayerRoster players={players} username="Host" gameCode="ABCD" maxPlayers={8} t={t} readyUsernames={['Alex']} />);
    // Alex ready of Alex+Bea — bot Botty ignored entirely
    expect(screen.getByTestId('roster-ready-count')).toHaveTextContent('1/2');
  });

  it('renders a ready badge only for ready non-host non-bot players', () => {
    render(<PlayerRoster players={players} username="Host" gameCode="ABCD" maxPlayers={8} t={t} readyUsernames={['Alex', 'Bea']} />);
    expect(screen.getAllByTestId('roster-ready-badge')).toHaveLength(2);
  });

  it('renders no badge for an empty ready list', () => {
    render(<PlayerRoster players={players} username="Host" gameCode="ABCD" maxPlayers={8} t={t} readyUsernames={[]} />);
    expect(screen.queryByTestId('roster-ready-badge')).not.toBeInTheDocument();
  });
});
