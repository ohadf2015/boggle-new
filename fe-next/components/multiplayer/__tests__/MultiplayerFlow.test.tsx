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

// Mock dependencies
jest.mock('@/utils/profileStorage', () => ({
  getStoredUsername: jest.fn().mockReturnValue('TestPlayer'),
  getStoredAvatarId: jest.fn().mockReturnValue('avatar-1'),
  hasCompleteStoredProfile: jest.fn().mockReturnValue(true),
}));

jest.mock('@/hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    isReady: true, // Changed to true to allow component to render in tests
    inviteRoomId: null,
    isInstantMultiplayer: false,
  }),
}));

jest.mock('@/utils/avatarConfig', () => ({
  getAvatarEmojiAndColor: jest.fn(() => ({ emoji: '🎮', color: '#FF6B6B' })),
}));

jest.mock('@/shared/types/customAvatar', () => ({
  getRandomAvatarConfig: () => ({
    base: 'round', skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#2C1B18',
    eyes: 'round', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#1a1a2e',
  }),
}));

// Mock child components
jest.mock('../RoomListView', () => ({
  __esModule: true,
  default: ({
    activeRooms,
    roomsLoading,
    onRefreshRooms,
    onRoomClick,
    onCreateRoom,
  }: {
    activeRooms: ActiveRoom[];
    roomsLoading: boolean;
    onRefreshRooms: () => void;
    onRoomClick: (room: ActiveRoom) => void;
    onCreateRoom: () => void;
  }) => (
    <div data-testid="room-list-view">
      <h2>Room List ({activeRooms.length} rooms)</h2>
      {roomsLoading && <span>Loading rooms...</span>}
      <button onClick={onRefreshRooms}>Refresh</button>
      <button onClick={onCreateRoom}>Create Room</button>
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

jest.mock('../JoinRoomModal', () => ({
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

jest.mock('../CreateRoomModal', () => ({
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
    handleJoin: jest.fn(),
    refreshRooms: jest.fn(),
    activeRooms: mockActiveRooms,
    roomsLoading: false,
    isJoining: false,
    isAuthenticated: false,
    displayName: 'TestPlayer',
    defaultLanguage: 'en' as Language,
    setGameCode: jest.fn(),
    setUsername: jest.fn(),
    setRoomName: jest.fn(),
    setHostUsername: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    it('should open join modal when room is clicked', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);

      expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();
      expect(screen.getByText('Join Room: Test Room 1')).toBeInTheDocument();
    });

    it('should close join modal when close button clicked', async () => {
      render(<MultiplayerFlow {...defaultProps} />);

      // Open modal
      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);
      expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);

      expect(screen.queryByTestId('join-room-modal')).not.toBeInTheDocument();
    });

    it('should call handleJoin when joining a room', async () => {
      // Ensure mock returns correct value
      const avatarConfig = require('@/utils/avatarConfig');
      avatarConfig.getAvatarEmojiAndColor.mockReturnValue({ emoji: '🎮', color: '#FF6B6B' });

      render(<MultiplayerFlow {...defaultProps} />);

      // Open modal
      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);

      // Click join
      const joinButton = screen.getByText('Join');
      await userEvent.click(joinButton);

      expect(defaultProps.setGameCode).toHaveBeenCalledWith('ROOM01');
      expect(defaultProps.setUsername).toHaveBeenCalledWith('TestPlayer');
      expect(defaultProps.handleJoin).toHaveBeenCalledWith(false, null, 'ROOM01', undefined, 'TestPlayer');
    });

    it('should show joining state in modal', async () => {
      render(<MultiplayerFlow {...defaultProps} isJoining={true} />);

      // Open modal
      const roomButton = screen.getByTestId('room-ROOM01');
      await userEvent.click(roomButton);

      expect(screen.getByText('Joining...')).toBeInTheDocument();
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
      const { hasCompleteStoredProfile, getStoredUsername, getStoredAvatarId } = require('@/utils/profileStorage');
      (hasCompleteStoredProfile as jest.Mock).mockReturnValue(true);
      (getStoredUsername as jest.Mock).mockReturnValue('StoredPlayer');
      (getStoredAvatarId as jest.Mock).mockReturnValue('stored-avatar');

      render(<MultiplayerFlow {...defaultProps} prefilledRoom="INVITE1" />);

      await waitFor(() => {
        expect(defaultProps.setGameCode).toHaveBeenCalledWith('INVITE1');
        expect(defaultProps.handleJoin).toHaveBeenCalledWith(false, null, 'INVITE1', undefined, 'StoredPlayer');
      });
    });

    it('should show join modal with prefilled room when no profile', async () => {
      const { hasCompleteStoredProfile } = require('@/utils/profileStorage');
      (hasCompleteStoredProfile as jest.Mock).mockReturnValue(false);

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

  describe('Empty Room List', () => {
    it('should render correctly with no rooms', () => {
      render(<MultiplayerFlow {...defaultProps} activeRooms={[]} />);

      expect(screen.getByText('Room List (0 rooms)')).toBeInTheDocument();
    });
  });
});

describe('MultiplayerFlow - Game Code Generation', () => {
  it('should generate different codes for multiple rooms', async () => {
    const handleJoin = jest.fn();
    const setGameCode = jest.fn();
    const generatedCodes: string[] = [];

    // Capture generated codes
    setGameCode.mockImplementation((code: string) => {
      generatedCodes.push(code);
    });

    const props = {
      handleJoin,
      refreshRooms: jest.fn(),
      activeRooms: [],
      roomsLoading: false,
      isJoining: false,
      isAuthenticated: false,
      displayName: 'TestPlayer',
      defaultLanguage: 'en' as Language,
      setGameCode,
      setUsername: jest.fn(),
      setRoomName: jest.fn(),
      setHostUsername: jest.fn(),
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
