import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayersReadyIndicator from '../PlayersReadyIndicator';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

// Mock MascotWithEntrance
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant, size }: { variant?: string; size?: string }) => (
    <div data-testid="mascot-celebration" data-variant={variant} data-size={size}>Mascot</div>
  ),
}));

describe('PlayersReadyIndicator host exclusion', () => {
  // GIVEN a game with a host and two regular players
  // WHEN the host is included in the players array
  // THEN the host should NOT be counted in totalPlayers
  it('should exclude host from ready count total', () => {
    const players = [
      { username: 'HostUser', isHost: true },
      { username: 'Player1' },
      { username: 'Player2' },
    ];

    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1', 'Player2']}
        currentUsername="Player1"
        isHost={false}
      />
    );

    // Should show 2/2 (host excluded), not 2/3
    // Both readyCount and totalPlayers should be 2
    const twos = screen.getAllByText('2');
    expect(twos).toHaveLength(2); // readyCount=2, totalPlayers=2
    // Host total "3" should NOT appear
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    // Verify host avatar is not rendered
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(2); // Only Player1 and Player2
  });

  // GIVEN a game with a host and players where only 1 player is ready
  // WHEN viewing the ready indicator
  // THEN the count should be 1/2 (not 1/3)
  it('should show correct ratio when host is in players list', () => {
    const players = [
      { username: 'HostUser', isHost: true },
      { username: 'Player1' },
      { username: 'Player2' },
    ];

    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1']}
        currentUsername="Player1"
        isHost={false}
      />
    );

    // Should show 1/2, not 1/3
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  // GIVEN all non-host players are ready and host is in list
  // WHEN the indicator renders
  // THEN it should show celebration (all ready)
  it('should show all-ready state when all non-host players are ready', () => {
    const players = [
      { username: 'HostUser', isHost: true },
      { username: 'Player1' },
      { username: 'Player2' },
    ];

    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1', 'Player2']}
        currentUsername="Player1"
        isHost={false}
      />
    );

    // Should show celebration mascot (all non-host players ready)
    expect(screen.getByTestId('mascot-celebration')).toBeInTheDocument();
    expect(screen.getByText('results.everyoneReady')).toBeInTheDocument();
  });

  // GIVEN a TV mode host in the players list
  // WHEN the indicator renders
  // THEN the host should not appear as a player avatar
  it('should not render host avatar in the player strip', () => {
    const players = [
      { username: 'TVHost', isHost: true },
      { username: 'Player1' },
    ];

    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1']}
        currentUsername=""
        isHost={true}
      />
    );

    // Only 1 avatar (Player1), host not rendered
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(1);
  });

  // GIVEN no host in player list (regular flow)
  // WHEN the indicator renders
  // THEN all players should be counted normally
  it('should work normally when no host player is in the list', () => {
    const players = [
      { username: 'Player1' },
      { username: 'Player2' },
      { username: 'Player3' },
    ];

    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1', 'Player2']}
        currentUsername="Player1"
        isHost={false}
      />
    );

    // Should show 2/3
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
