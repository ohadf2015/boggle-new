/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostPreGameView from '../../host/components/HostPreGameView';
import { SocketContext } from '../../utils/SocketContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock CrazyGames invite hook
jest.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: jest.fn(),
    hideInviteButton: jest.fn(),
    isInviteButtonVisible: false,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const mockT = (key: string) => key;

const defaultProps = {
  gameCode: 'TEST123',
  roomLanguage: 'en' as const,
  language: 'en' as const,
  username: 'TestHost',
  t: mockT,
  timerValue: 2,
  setTimerValue: jest.fn(),
  timerDirection: 0,
  setTimerDirection: jest.fn(),
  difficulty: 'MEDIUM' as const,
  setDifficulty: jest.fn(),
  minWordLength: 2,
  setMinWordLength: jest.fn(),
  gameType: 'regular' as const,
  setGameType: jest.fn(),
  tournamentRounds: 3,
  setTournamentRounds: jest.fn(),
  tournamentData: null,
  hostPlaying: true,
  setHostPlaying: jest.fn(),
  playersReady: [],
  playerWordCounts: {},
  shufflingGrid: null,
  highlightedCells: [],
  tableData: [['A', 'B'], ['C', 'D']],
  onStartGame: jest.fn(),
  onExitRoom: jest.fn(),
  onCancelTournament: jest.fn(),
  tournamentCreating: false,
};

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true,
  id: 'test-socket-id',
};

const socketContextValue = {
  socket: mockSocket as any,
  isConnected: true,
  connectionError: null,
  isReconnecting: false,
  reconnectAttempt: 0,
  maxReconnectAttempts: 5,
  manualReconnect: jest.fn(),
};

describe('HostPreGameView Height Constraint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use h-full instead of h-[100dvh] to fit within parent container', () => {
    const { container } = render(
      <SocketContext.Provider value={socketContextValue}>
        <HostPreGameView {...defaultProps} />
      </SocketContext.Provider>
    );

    // Get the root div of HostPreGameView
    const rootDiv = container.firstChild as HTMLElement;

    // The root div should have h-full class, NOT h-[100dvh]
    // This ensures the component fills its parent container without exceeding it
    expect(rootDiv.className).toContain('h-full');
    expect(rootDiv.className).not.toContain('h-[100dvh]');
  });

  it('should have proper flex layout structure for content containment', () => {
    const { container } = render(
      <SocketContext.Provider value={socketContextValue}>
        <HostPreGameView {...defaultProps} />
      </SocketContext.Provider>
    );

    const rootDiv = container.firstChild as HTMLElement;

    // Should have flex column layout
    expect(rootDiv.className).toContain('flex');
    expect(rootDiv.className).toContain('flex-col');

    // Note: overflow-hidden was intentionally removed from root container
    // (see bug fix c79cbc70ab2846c98f15bc7c2a00c2e9) - inner containers
    // handle overflow with overflow-y-auto instead
    expect(rootDiv.className).not.toContain('overflow-hidden');
  });
});
