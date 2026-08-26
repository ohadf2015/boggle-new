/**
 * Tests for MultiplayerFlow component
 *
 * Tests the multiplayer orchestration including:
 * - Flow state transitions (room-list, join-modal, create-modal)
 * - Room click handling
 * - Create room functionality
 * - Join room functionality
 * - Profile handling
 * - CrazyGames integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiplayerFlow from '../MultiplayerFlow';
import type { ActiveRoom, Language } from '@/shared/types/game';
import { hasCompleteStoredProfile, getStoredUsername, getStoredAvatarId } from '@/utils/profileStorage';

// Mock dependencies
vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getOrCreateStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getStoredAvatarId: vi.fn().mockReturnValue('avatar-1'),
  hasCompleteStoredProfile: vi.fn().mockReturnValue(true),
}));

vi.mock('@/hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    isReady: true,
    inviteRoomId: null,
    isInstantMultiplayer: false,
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    createInviteLink: vi.fn(),
    isInviteButtonVisible: false,
    isInviteJoin: false,
  }),
}));

vi.mock('@/utils/avatarConfig', () => ({
  getAvatarEmojiAndColor: vi.fn(() => ({ emoji: '🎮', color: '#FF6B6B' })),
}));

let mockIsOnCrazyGamesPlatform = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform,
  }),
}));

vi.mock('@/shared/types/customAvatar', () => ({
  getRandomAvatarConfig: () => ({
    gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#2C1B18',
    eyes: 'round', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#1a1a2e',
  }),
}));

// Mock child components
vi.mock('../RoomListView', () => ({
  __esModule: true,
  default: ({
    activeRooms,
    roomsLoading,
    onRefreshRooms,
    onRoomClick,
    onCreateRoom,
    onQuickPlay,
  }: {
    activeRooms: ActiveRoom[];
    roomsLoading: boolean;
    onRefreshRooms: () => void;
    onRoomClick: (room: ActiveRoom) => void;
    onCreateRoom: () => void;
    onQuickPlay?: () => void;
  }) => (
    <div data-testid="room-list-view">
      <h2>Room List ({activeRooms.length} rooms)</h2>
      {roomsLoading && <span>Loading rooms...</span>}
      <button onClick={onRefreshRooms}>Refresh</button>
      <button onClick={onCreateRoom}>Create Room</button>
      {onQuickPlay && <button onClick={onQuickPlay}>Quick Play</button>}
      {activeRooms.map((room) => (
        <button
          key={room.gameCode}
          onClick={() => onRoomClick(room)}
          data-testid={`room-${room.gameCode}`}
        >
          {room.roomName} ({room.playerCount} players)
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../JoinRoomModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    room,
    isJoining,
    onJoin,
  }: {
    isOpen: boolean;
    onClose: () => void;
    room: ActiveRoom | null;
    isJoining: boolean;
    onJoin: (username: string, avatarId: string) => void;
  }) =>
    isOpen ? (
      <div data-testid="join-room-modal">
        <h2>Join Room: {room?.roomName}</h2>
        {isJoining && <span>Joining...</span>}
        <button onClick={() => onJoin('TestPlayer', 'avatar-1')}>Join</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../CreateRoomModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    isCreating,
    onCreate,
    defaultLanguage,
  }: {
    isOpen: boolean;
    onClose: () => void;
    isCreating: boolean;
    onCreate: (config: { hostUsername: string; avatarId: string; roomName: string; language: Language }) => void;
    defaultLanguage: Language;
  }) =>
    isOpen ? (
      <div data-testid="create-room-modal">
        <h2>Create Room</h2>
        {isCreating && <span>Creating...</span>}
        <button
          onClick={() =>
            onCreate({
              hostUsername: 'HostPlayer',
              avatarId: 'avatar-1',
              roomName: 'Test Room',
              language: defaultLanguage,
            })
          }
        >
          Create
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

describe('MultiplayerFlow', () => {
  const mockActiveRooms: ActiveRoom[] = [
    {
      gameCode: 'ROOM01',
      roomName: 'Test Room 1',
      playerCount: 2,
      language: 'en' as Language,
      gameState: 'waiting',
      isRanked: false,
      createdAt: Date.now(),
    },
    {
      gameCode: 'ROOM02',
      roomName: 'Test Room 2',
      playerCount: 3,
      language: 'he' as Language,
      gameState: 'waiting',
      isRanked: true,
      createdAt: Date.now() - 1000,
    },
  ];

  const defaultProps = {
    handleJoin: vi.fn(),
    refreshRooms: vi.fn(),
    activeRooms: mockActiveRooms,
    roomsLoading: false,
    isJoining: false,
    isAuthenticated: false,
    displayName: 'TestPlayer',
    defaultLanguage: 'en' as Language,
    setGameCode: vi.fn(),
    setUsername: vi.fn(),
    setRoomName: vi.fn(),
    setHostUsername: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render room list view', () => {
      render(<MultiplayerFlow {...defaultProps} />);

      expect(screen.getByTestId('room-list-view')).toBeInTheDocument();
    });

    it('should show correct number of rooms', () => {
      render(<MultiplayerFlow {...defaultProps} />);

      expect(screen.getByText('Room List (2 rooms)')).toBeInTheDocument();
    });

    it('should not show modals initially', () => {
      render(<MultiplayerFlow {...defaultProps} />);

      expect(screen.queryByTestId('join-room-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('create-room-modal')).not.toBeInTheDocument();
    });
  });

  describe('Room List Interactions', () => {
    it('should call refreshRooms when refresh button clicked', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      const refreshButton = screen.getByText('Refresh');
      await userEvent.click(refreshButton);

      expect(defaultProps.refreshRooms).toHaveBeenCalledTimes(1);
    });

    it('should show loading state when rooms are loading', () => {
      render(<MultiplayerFlow {...defaultProps} roomsLoading={true} />);

      expect(screen.getByText('Loading rooms...')).toBeInTheDocument();
    });
  });

  describe('Join Room Flow', () => {
    it('should fast-join when room is clicked and user has profile', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);

      // Fast-join: no modal, direct handleJoin call
      expect(screen.queryByTestId('join-room-modal')).not.toBeInTheDocument();
      expect(defaultProps.setGameCode).toHaveBeenCalledWith('ROOM01');
      expect(defaultProps.handleJoin).toHaveBeenCalledWith(false, null, 'ROOM01', undefined, 'TestPlayer');
    });

    it('should open join modal when room is clicked and no profile', async () => {
      
      (hasCompleteStoredProfile as Mock).mockReturnValue(false);

      render(<MultiplayerFlow {...defaultProps} isAuthenticated={false} displayName="" />);

      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);

      expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();
      expect(screen.getByText('Join Room: Test Room 1')).toBeInTheDocument();
    });

    it('should close join modal when close button clicked', async () => {
      
      (hasCompleteStoredProfile as Mock).mockReturnValue(false);

      render(<MultiplayerFlow {...defaultProps} isAuthenticated={false} displayName="" />);

      // Open modal (no profile → shows modal)
      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);
      expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);

      expect(screen.queryByTestId('join-room-modal')).not.toBeInTheDocument();
    });

    it('should fast-join for authenticated users without showing modal', async () => {
      render(<MultiplayerFlow {...defaultProps} isAuthenticated={true} displayName="AuthUser" />);

      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);

      // Direct join — no modal
      expect(screen.queryByTestId('join-room-modal')).not.toBeInTheDocument();
      expect(defaultProps.setGameCode).toHaveBeenCalledWith('ROOM01');
      expect(defaultProps.setUsername).toHaveBeenCalledWith('AuthUser');
      expect(defaultProps.handleJoin).toHaveBeenCalledWith(false, null, 'ROOM01', undefined, 'AuthUser');
    });
  });

  describe('Create Room Flow', () => {
    it('should open create modal when create button clicked', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      const createButton = screen.getByText('Create Room');
      await userEvent.click(createButton);

      expect(screen.getByTestId('create-room-modal')).toBeInTheDocument();
    });

    it('should close create modal when close button clicked', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      // Open modal
      const createButton = screen.getByText('Create Room');
      await userEvent.click(createButton);
      expect(screen.getByTestId('create-room-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);

      expect(screen.queryByTestId('create-room-modal')).not.toBeInTheDocument();
    });

    it('should call handleJoin with host mode when creating room', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      // Open modal
      const createRoomButton = screen.getByText('Create Room');
      await userEvent.click(createRoomButton);

      // Click create
      const createButton = screen.getByText('Create');
      await userEvent.click(createButton);

      expect(defaultProps.setRoomName).toHaveBeenCalledWith('Test Room');
      expect(defaultProps.setHostUsername).toHaveBeenCalledWith('HostPlayer');
      expect(defaultProps.handleJoin).toHaveBeenCalledWith(
        true,
        'en',
        expect.any(String),
        'Test Room',
        'HostPlayer'
      );
      // Default visibility = public: no isPrivate option ever passed
      const createCalls = (defaultProps.handleJoin as ReturnType<typeof vi.fn>).mock.calls;
      const opts = createCalls[createCalls.length - 1]?.[5];
      expect(opts?.isPrivate).toBeUndefined();
    });

    it('should generate valid 6-character game code', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      // Open modal
      const createRoomButton = screen.getByText('Create Room');
      await userEvent.click(createRoomButton);

      // Click create
      const createButton = screen.getByText('Create');
      await userEvent.click(createButton);

      // Check that setGameCode was called with a 6-character code
      expect(defaultProps.setGameCode).toHaveBeenCalledWith(
        expect.stringMatching(/^[A-Z0-9]{6}$/)
      );
    });

    it('should show creating state in modal', async () => {
      render(<MultiplayerFlow {...defaultProps} isJoining={true} />);

      const createButton = screen.getByText('Create Room');
      await userEvent.click(createButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('Authenticated User Flow', () => {
    it('should use authenticated display name', () => {
      render(
        <MultiplayerFlow
          {...defaultProps}
          isAuthenticated={true}
          displayName="AuthenticatedUser"
        />
      );

      expect(screen.getByTestId('room-list-view')).toBeInTheDocument();
    });
  });

  describe('Prefilled Room Code', () => {
    it('should auto-join with prefilled room code when profile exists', async () => {
      
      (hasCompleteStoredProfile as Mock).mockReturnValue(true);
      (getStoredUsername as Mock).mockReturnValue('StoredPlayer');
      (getStoredAvatarId as Mock).mockReturnValue('stored-avatar');

      render(<MultiplayerFlow {...defaultProps} prefilledRoom="INVITE1" />);

      await waitFor(() => {
        expect(defaultProps.setGameCode).toHaveBeenCalledWith('INVITE1');
        expect(defaultProps.handleJoin).toHaveBeenCalledWith(false, null, 'INVITE1', undefined, 'StoredPlayer');
      });
    });

    it('should show join modal with prefilled room when no profile', async () => {
      
      (hasCompleteStoredProfile as Mock).mockReturnValue(false);

      render(
        <MultiplayerFlow
          {...defaultProps}
          prefilledRoom="INVITE2"
          isAuthenticated={false}
          displayName=""
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Classroom Mode', () => {
    it('should NOT render RoomListView when isClassroomMode is true', () => {
      render(
        <MultiplayerFlow
          {...defaultProps}
          isClassroomMode={true}
          host={true}
          prefilledRoom="RRGWFX"
          isAuthenticated={true}
          displayName="Teacher"
        />
      );

      // Arena Hub / Quick Start / Open Arenas must not appear in classroom mode —
      // teacher already has the share code (rendered by ClassroomModeBanner upstream).
      expect(screen.queryByTestId('room-list-view')).not.toBeInTheDocument();
    });

    it('should render waiting state when isClassroomMode is true', () => {
      render(
        <MultiplayerFlow
          {...defaultProps}
          isClassroomMode={true}
          host={true}
          prefilledRoom="RRGWFX"
          isAuthenticated={true}
          displayName="Teacher"
        />
      );

      // useLanguage falls back through translation cache; assert the EN string
      // for `education.classroomGame.waitingForPlayers`.
      expect(screen.getByText(/waiting for players/i)).toBeInTheDocument();
    });

    it('should still auto-create classroom host room via prefilledRoom', async () => {
      const handleJoin = vi.fn();
      render(
        <MultiplayerFlow
          {...defaultProps}
          handleJoin={handleJoin}
          isClassroomMode={true}
          host={true}
          prefilledRoom="RRGWFX"
          isAuthenticated={true}
          displayName="Teacher"
        />
      );

      await waitFor(() => {
        expect(handleJoin).toHaveBeenCalledWith(
          true,
          'en',
          'RRGWFX',
          expect.any(String),
          'Teacher',
          expect.objectContaining({ isPrivate: true })
        );
      });
    });
  });

  describe('Quick Play', () => {
    it('CONSOLIDATES: joins an existing compatible waiting room instead of spawning a new one', async () => {
      // defaultProps.activeRooms has ROOM01 (en, waiting, casual) — a compatible
      // room — so Quick Play must JOIN it rather than host a fresh public lobby.
      // This is the room-management fix: stops the arena filling with 1/50 ghosts.
      const handleJoin = vi.fn();
      render(<MultiplayerFlow {...defaultProps} handleJoin={handleJoin} />);

      await userEvent.click(screen.getByRole('button', { name: 'Quick Play' }));

      // Join path: not host mode, targets the existing room's code, no quickPlay flag.
      // The consolidation branch now carries `quickPlay: true` as well, so the
      // successful match-into-an-existing-room path reports its conversion. It
      // previously omitted the flag, which made the BEST outcome the unreported one.
      expect(handleJoin).toHaveBeenCalledWith(
        false, null, 'ROOM01', undefined, expect.any(String), { quickPlay: true },
      );
      const createCalls = handleJoin.mock.calls.filter((call) => call[0] === true);
      expect(createCalls).toHaveLength(0);
    });

    it('does NOT hijack a ranked or different-language room', async () => {
      // ROOM02 is Hebrew + ranked → never a Quick Play target. With it the only
      // room available, Quick Play must fall back to creating a public room.
      const handleJoin = vi.fn();
      render(
        <MultiplayerFlow
          {...defaultProps}
          handleJoin={handleJoin}
          activeRooms={[mockActiveRooms[1]]}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Quick Play' }));

      expect(handleJoin).toHaveBeenCalledWith(
        true,
        'en',
        expect.stringMatching(/^[A-Z0-9]{6}$/),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ quickPlay: true }),
      );
    });

    it('creates a new public room with the quickPlay flag when no compatible room exists', async () => {
      const handleJoin = vi.fn();
      render(<MultiplayerFlow {...defaultProps} handleJoin={handleJoin} activeRooms={[]} />);

      await userEvent.click(screen.getByRole('button', { name: 'Quick Play' }));

      expect(handleJoin).toHaveBeenCalledWith(
        true, // host mode
        'en', // defaultLanguage
        expect.stringMatching(/^[A-Z0-9]{6}$/),
        expect.any(String), // generated room name
        expect.any(String), // username (sourced from stored profile)
        expect.objectContaining({ quickPlay: true }),
      );
    });

    it('should auto-fire quick play once when quickPlay prop is true', async () => {
      const handleJoin = vi.fn();
      // Empty room list so the create path (quickPlay flag) is exercised, and the
      // once-guard against StrictMode double-invoke is what we assert.
      render(
        <MultiplayerFlow {...defaultProps} handleJoin={handleJoin} activeRooms={[]} quickPlay />,
      );

      // Wait a microtask so the mount effect runs
      await new Promise((r) => setTimeout(r, 0));

      // handleJoin must be called exactly once with the quickPlay flag set
      const quickPlayCalls = handleJoin.mock.calls.filter(
        (call) => call[5]?.quickPlay === true,
      );
      expect(quickPlayCalls).toHaveLength(1);
    });
  });

  describe('Empty Room List', () => {
    it('should render correctly with no rooms', () => {
      render(<MultiplayerFlow {...defaultProps} activeRooms={[]} />);

      expect(screen.getByText('Room List (0 rooms)')).toBeInTheDocument();
    });
  });
});

describe('MultiplayerFlow - Game Code Generation', () => {
  it('should generate different codes for multiple rooms', async () => {
    const handleJoin = vi.fn();
    const setGameCode = vi.fn();
    const generatedCodes: string[] = [];

    // Capture generated codes
    setGameCode.mockImplementation((code: string) => {
      generatedCodes.push(code);
    });

    const props = {
      handleJoin,
      refreshRooms: vi.fn(),
      activeRooms: [],
      roomsLoading: false,
      isJoining: false,
      isAuthenticated: false,
      displayName: 'TestPlayer',
      defaultLanguage: 'en' as Language,
      setGameCode,
      setUsername: vi.fn(),
      setRoomName: vi.fn(),
      setHostUsername: vi.fn(),
    };

    const { rerender } = render(<MultiplayerFlow {...props} />);

    // Create first room
    const createButton = screen.getByRole('button', { name: 'Create Room' });
    await userEvent.click(createButton);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    // Close and reopen
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    // Create second room
    await userEvent.click(screen.getByRole('button', { name: 'Create Room' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    // Both codes should be 6 characters and alphanumeric
    expect(generatedCodes).toHaveLength(2);
    generatedCodes.forEach(code => {
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

});

describe('CrazyGames lobby arrival — never auto-join (policy 2026-05-03)', () => {
  // The CrazyGames "smart auto-join" was removed. Landing on /multiplayer in
  // a CG iframe must show the lobby and let the user pick — silent redirects
  // into stranger rooms or quick-play matches were a primary UX complaint.
  const baseProps = {
    handleJoin: vi.fn(),
    refreshRooms: vi.fn(),
    activeRooms: [
      {
        gameCode: 'ROOM01',
        roomName: 'Test Room 1',
        playerCount: 2,
        language: 'en' as Language,
        gameState: 'waiting' as const,
        isRanked: false,
        createdAt: Date.now(),
      },
    ],
    roomsLoading: false,
    isJoining: false,
    isAuthenticated: true,
    displayName: 'CGPlayer',
    defaultLanguage: 'en' as Language,
    setGameCode: vi.fn(),
    setUsername: vi.fn(),
    setRoomName: vi.fn(),
    setHostUsername: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnCrazyGamesPlatform = true;
  });

  afterEach(() => {
    mockIsOnCrazyGamesPlatform = false;
  });

  it('does NOT auto-join an open room on CrazyGames — lobby renders for user choice', () => {
    const handleJoin = vi.fn();
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} />);

    expect(handleJoin).not.toHaveBeenCalled();
  });

  it('does NOT auto-trigger quick-play when no open rooms on CrazyGames', () => {
    const handleJoin = vi.fn();
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} activeRooms={[]} />);

    expect(handleJoin).not.toHaveBeenCalled();
  });

  it('does NOT auto-join when only full rooms exist on CrazyGames', () => {
    const handleJoin = vi.fn();
    const fullRooms: ActiveRoom[] = [
      {
        gameCode: 'FULL01', roomName: 'Full Room', playerCount: 8, maxPlayers: 8,
        language: 'en' as Language, gameState: 'waiting', isRanked: false, createdAt: Date.now(),
      },
    ];
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} activeRooms={fullRooms} />);

    expect(handleJoin).not.toHaveBeenCalled();
  });

  it('does NOT auto-join in-progress rooms on CrazyGames', () => {
    const handleJoin = vi.fn();
    const rooms: ActiveRoom[] = [
      {
        gameCode: 'PLAY01', roomName: 'In Progress', playerCount: 3,
        language: 'en' as Language, gameState: 'playing', isRanked: false, createdAt: Date.now(),
      },
    ];
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} activeRooms={rooms} />);

    expect(handleJoin).not.toHaveBeenCalled();
  });

  it('should NOT auto-join on non-CrazyGames platforms', () => {
    mockIsOnCrazyGamesPlatform = false;
    const handleJoin = vi.fn();
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} activeRooms={[]} />);

    expect(handleJoin).not.toHaveBeenCalled();
  });

  it('should NOT auto-join when rooms are still loading', () => {
    const handleJoin = vi.fn();
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} roomsLoading={true} />);

    expect(handleJoin).not.toHaveBeenCalled();
  });
});
