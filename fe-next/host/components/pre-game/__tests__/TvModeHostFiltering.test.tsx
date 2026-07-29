import { vi, type Mock, } from 'vitest';
/**
 * TV Mode Host Filtering Tests
 *
 * Tests that when TV mode is enabled (hostPlaying=false), the host is:
 * 1. NOT displayed in the ready players section
 * 2. NOT counted in the player count
 *
 * Bug: When host enables TV mode, they should not appear in the player list
 * as they are not playing - they are just spectating/broadcasting.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EnhancedPlayerList } from '../desktop/EnhancedPlayerList';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.ComponentProps<'div'> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Avatar component
vi.mock('../../../../components/Avatar', () => ({
  __esModule: true,
  default: ({ size, className }: { avatarImage?: string; size?: string; className?: string }) => (
    <div data-testid="avatar" className={className}>{size}</div>
  ),
}));

// Mock PresenceIndicator
vi.mock('../../../../components/PresenceIndicator', () => ({
  __esModule: true,
  default: ({ status }: { status: string; size?: string }) => (
    <div data-testid="presence-indicator">{status}</div>
  ),
}));

// Translation mock
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'hostView.playersJoined': 'Players Joined',
    'hostView.host': 'Host',
    'hostView.waitingForPlayers': 'Waiting for players...',
    'playerView.me': 'YOU',
    'common.bot': 'Bot',
  };
  return translations[key] || key;
};

interface PlayerData {
  username: string;
  avatar?: { avatarImage?: string } | null;
  isHost?: boolean;
  presenceStatus?: 'active' | 'idle' | 'afk';
  isBot?: boolean;
}

describe('TV Mode Host Filtering', () => {
  describe('EnhancedPlayerList', () => {
    const hostPlayer: PlayerData = {
      username: 'HostUser',
      isHost: true,
      presenceStatus: 'active',
      avatar: null,
    };

    const regularPlayers: PlayerData[] = [
      { username: 'Player1', isHost: false, presenceStatus: 'active', avatar: null },
      { username: 'Player2', isHost: false, presenceStatus: 'active', avatar: null },
      { username: 'Player3', isHost: false, presenceStatus: 'active', avatar: null },
    ];

    const allPlayers = [hostPlayer, ...regularPlayers];

    describe('when TV mode is disabled (host is playing)', () => {
      it('should display the host in the player list', () => {
        render(
          <EnhancedPlayerList
            players={allPlayers}
            currentUsername="HostUser"
            t={mockT}
            tvMode={false}
          />
        );

        // Host should be visible
        expect(screen.getByText('HostUser')).toBeInTheDocument();
        // All players should be visible
        expect(screen.getByText('Player1')).toBeInTheDocument();
        expect(screen.getByText('Player2')).toBeInTheDocument();
        expect(screen.getByText('Player3')).toBeInTheDocument();
      });

      it('should count the host in the player count', () => {
        render(
          <EnhancedPlayerList
            players={allPlayers}
            currentUsername="HostUser"
            t={mockT}
            tvMode={false}
          />
        );

        // Player count should include host (4 total)
        expect(screen.getByText(/Players Joined.*\(4\)/)).toBeInTheDocument();
      });
    });

    describe('when TV mode is enabled (host is NOT playing)', () => {
      it('should NOT display the host in the player list', () => {
        render(
          <EnhancedPlayerList
            players={allPlayers}
            currentUsername="HostUser"
            t={mockT}
            tvMode={true}
          />
        );

        // Host should NOT be visible
        expect(screen.queryByText('HostUser')).not.toBeInTheDocument();
        // Other players should still be visible
        expect(screen.getByText('Player1')).toBeInTheDocument();
        expect(screen.getByText('Player2')).toBeInTheDocument();
        expect(screen.getByText('Player3')).toBeInTheDocument();
      });

      it('should NOT count the host in the player count', () => {
        render(
          <EnhancedPlayerList
            players={allPlayers}
            currentUsername="HostUser"
            t={mockT}
            tvMode={true}
          />
        );

        // Player count should exclude host (3 total, not 4)
        expect(screen.getByText(/Players Joined.*\(3\)/)).toBeInTheDocument();
      });

      it('should filter host by isHost flag', () => {
        const playersWithHostFlag = [
          { username: 'BroadcastHost', isHost: true, presenceStatus: 'active' as const, avatar: null },
          { username: 'Player1', isHost: false, presenceStatus: 'active' as const, avatar: null },
        ];

        render(
          <EnhancedPlayerList
            players={playersWithHostFlag}
            currentUsername="BroadcastHost"
            t={mockT}
            tvMode={true}
          />
        );

        expect(screen.queryByText('BroadcastHost')).not.toBeInTheDocument();
        expect(screen.getByText('Player1')).toBeInTheDocument();
        expect(screen.getByText(/Players Joined.*\(1\)/)).toBeInTheDocument();
      });

      it('should filter host by matching currentUsername', () => {
        // Test case where isHost might not be set but username matches
        const playersWithoutHostFlag = [
          { username: 'HostUserMatch', presenceStatus: 'active' as const, avatar: null },
          { username: 'Player1', presenceStatus: 'active' as const, avatar: null },
        ];

        render(
          <EnhancedPlayerList
            players={playersWithoutHostFlag}
            currentUsername="HostUserMatch"
            t={mockT}
            tvMode={true}
          />
        );

        expect(screen.queryByText('HostUserMatch')).not.toBeInTheDocument();
        expect(screen.getByText('Player1')).toBeInTheDocument();
        expect(screen.getByText(/Players Joined.*\(1\)/)).toBeInTheDocument();
      });
    });

    describe('edge cases', () => {
      it('should show empty state when only host is in room and TV mode is enabled', () => {
        render(
          <EnhancedPlayerList
            players={[hostPlayer]}
            currentUsername="HostUser"
            t={mockT}
            tvMode={true}
          />
        );

        expect(screen.queryByText('HostUser')).not.toBeInTheDocument();
        expect(screen.getByText(/Players Joined.*\(0\)/)).toBeInTheDocument();
        expect(screen.getByText('Waiting for players...')).toBeInTheDocument();
      });

      it('should not filter bots when TV mode is enabled', () => {
        const playersWithBot: PlayerData[] = [
          hostPlayer,
          { username: 'BotPlayer', isBot: true, presenceStatus: 'active', avatar: null },
          ...regularPlayers,
        ];

        render(
          <EnhancedPlayerList
            players={playersWithBot}
            currentUsername="HostUser"
            t={mockT}
            tvMode={true}
          />
        );

        // Bot should still be visible
        expect(screen.getByText('BotPlayer')).toBeInTheDocument();
        // Host should be filtered
        expect(screen.queryByText('HostUser')).not.toBeInTheDocument();
        // Count should include bot but not host (4 total)
        expect(screen.getByText(/Players Joined.*\(4\)/)).toBeInTheDocument();
      });
    });
  });
});
