/**
 * GR #14164 — rage clicks on "Join battle" (/en/multiplayer).
 *
 * A guest who opens an invite link (?room=CODE) to a room that no longer
 * exists gets the join sheet for that code. The server answers the join with
 * GAME_NOT_FOUND, the page strips the param and toasts — but the sheet used
 * to stay OPEN with a re-enabled CTA into the confirmed-dead room. Every
 * re-tap re-fired the join while the roomGone toast id collapsed the repeats
 * into silence, so the button felt dead and players rage-clicked it (GR
 * sessions 2026-10-31, room D87X2C, two guests minutes apart).
 *
 * The fix: when the server reports a room gone (handleRoomGone), the entry
 * flow closes a join sheet still open for that exact code — the room-ended
 * toast / Quick Play offer then owns the recovery.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiplayerFlow from '../MultiplayerFlow';
import type { ActiveRoom, Language } from '@/shared/types/game';
import { hasCompleteStoredProfile } from '@/utils/profileStorage';

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getOrCreateStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getStoredAvatarId: vi.fn().mockReturnValue('avatar-1'),
  hasCompleteStoredProfile: vi.fn().mockReturnValue(false),
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

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/shared/types/customAvatar', () => ({
  getRandomAvatarConfig: () => ({
    gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#2C1B18',
    eyes: 'round', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#1a1a2e',
  }),
}));

vi.mock('../RoomListView', () => ({
  __esModule: true,
  default: ({
    activeRooms,
    onRoomClick,
  }: {
    activeRooms: ActiveRoom[];
    onRoomClick: (room: ActiveRoom) => void;
  }) => (
    <div data-testid="room-list-view">
      {activeRooms.map((room) => (
        <button key={room.gameCode} onClick={() => onRoomClick(room)} data-testid={`room-${room.gameCode}`}>
          {room.roomName}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../entry/JoinSheet', () => ({
  __esModule: true,
  default: ({ isOpen, room }: { isOpen: boolean; room: ActiveRoom | null }) =>
    isOpen ? <div data-testid="join-room-modal">Join Room: {room?.gameCode}</div> : null,
}));

const ROOM: ActiveRoom = {
  gameCode: 'ROOM01',
  roomName: 'Test Room 1',
  playerCount: 2,
  language: 'en' as Language,
  gameState: 'waiting',
  isRanked: false,
  createdAt: Date.now(),
};

const baseProps = {
  handleJoin: vi.fn(),
  refreshRooms: vi.fn(),
  activeRooms: [ROOM],
  roomsLoading: false,
  isJoining: false,
  isAuthenticated: false,
  displayName: '',
  defaultLanguage: 'en' as Language,
  setGameCode: vi.fn(),
  setUsername: vi.fn(),
  setRoomName: vi.fn(),
  setHostUsername: vi.fn(),
};

describe('join sheet closes when the server reports its room gone (GR #14164)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasCompleteStoredProfile as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('closes a join sheet whose room was reported gone', async () => {
    const { rerender } = render(<MultiplayerFlow {...baseProps} />);

    await userEvent.click(screen.getByTestId('room-ROOM01'));
    expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();

    rerender(<MultiplayerFlow {...baseProps} joinRoomGone={{ code: 'ROOM01', seq: 1 }} />);

    await waitFor(() => {
      expect(screen.queryByTestId('join-room-modal')).not.toBeInTheDocument();
    });
  });

  it('closes the invite-link sheet for a dead prefilled code', async () => {
    const { rerender } = render(<MultiplayerFlow {...baseProps} prefilledRoom="D87X2C" />);

    await waitFor(() => {
      expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();
    });

    rerender(<MultiplayerFlow {...baseProps} prefilledRoom="D87X2C" joinRoomGone={{ code: 'D87X2C', seq: 1 }} />);

    await waitFor(() => {
      expect(screen.queryByTestId('join-room-modal')).not.toBeInTheDocument();
    });
  });

  it('keeps the sheet open when a DIFFERENT room was reported gone', async () => {
    const { rerender } = render(<MultiplayerFlow {...baseProps} />);

    await userEvent.click(screen.getByTestId('room-ROOM01'));
    expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();

    rerender(<MultiplayerFlow {...baseProps} joinRoomGone={{ code: 'OTHER1', seq: 1 }} />);

    // Let effects settle; the sheet must survive a report about another room.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();
  });

  it('does not close a freshly opened sheet from a stale (already handled) report', async () => {
    // The report for ROOM01 was consumed while no sheet was open.
    const { rerender } = render(
      <MultiplayerFlow {...baseProps} joinRoomGone={{ code: 'ROOM01', seq: 1 }} />,
    );
    await new Promise((r) => setTimeout(r, 50));

    // Player then opens the sheet for that code (e.g. typed it by hand): the
    // stale report must not slam it shut before the server answers THIS try.
    rerender(<MultiplayerFlow {...baseProps} joinRoomGone={{ code: 'ROOM01', seq: 1 }} />);
    await userEvent.click(screen.getByTestId('room-ROOM01'));

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('join-room-modal')).toBeInTheDocument();
  });
});
