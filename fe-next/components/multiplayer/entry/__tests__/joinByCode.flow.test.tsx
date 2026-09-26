/**
 * Every path that opens the join sheet hands it the SAME room (pitfall class
 * 3): a typed code, a room card and an invite link for a listed room all show
 * the live listing — never a stand-in with "0" players and the code as a name.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ArenaRoom } from '../ArenaRow';

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => '',
  getOrCreateStoredUsername: () => 'Sly Fox',
  getStoredAvatarId: () => null,
  hasCompleteStoredProfile: () => false,
}));
vi.mock('@/hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({ isReady: true, showInviteButton: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, cgUser: null }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn(), trackGuestJoin: vi.fn() }));
vi.mock('@/hooks/useMatchmaking', () => ({
  useMatchmaking: () => ({ status: 'idle', roomId: null, eloRange: 0, queueSize: 0, waitTime: 0, opponent: null, joinQueue: vi.fn(), leaveQueue: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, profile: null }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/hooks/useNetworkState', () => ({ useNetworkState: () => ({ online: true, rttMs: 20 }) }));
vi.mock('../../RoomListView', () => ({
  __esModule: true,
  default: ({ onJoinCode, onRoomClick, activeRooms }: {
    onJoinCode?: (code: string) => void;
    onRoomClick: (room: ArenaRoom) => void;
    activeRooms: ArenaRoom[];
  }) => (
    <div>
      <button type="button" onClick={() => onJoinCode?.('cn2t8u')}>typed-listed</button>
      <button type="button" onClick={() => onJoinCode?.('ZZ9QX2')}>typed-unlisted</button>
      <button type="button" onClick={() => onRoomClick(activeRooms[0])}>card</button>
    </div>
  ),
}));
vi.mock('../../JoinRoomModal', () => ({
  __esModule: true,
  default: ({ isOpen, room, onJoin }: {
    isOpen: boolean;
    room: (ArenaRoom & { unlisted?: boolean }) | null;
    onJoin: (name: string) => void;
  }) =>
    isOpen && room ? (
      <div data-testid="join-room-modal">
        <button type="button" onClick={() => onJoin('Sly Fox')}>sheet-join</button>
        <span data-testid="t-code">{room.gameCode}</span>
        <span data-testid="t-name">{room.roomName}</span>
        <span data-testid="t-seats">{`${room.playerCount}/${room.maxPlayers ?? '-'}`}</span>
        <span data-testid="t-lang">{room.language}</span>
        <span data-testid="t-unlisted">{String(!!room.unlisted)}</span>
      </div>
    ) : null,
}));
vi.mock('../../CreateRoomModal', () => ({ __esModule: true, default: () => null }));
vi.mock('../../MatchmakingOverlay', () => ({ MatchmakingOverlay: () => null }));

import MultiplayerFlow from '../../MultiplayerFlow';

const listed: ArenaRoom = {
  gameCode: 'CN2T8U', roomName: 'Turbo Salmonʼs Room', playerCount: 1, maxPlayers: 50, language: 'en',
  gameState: 'waiting', isRanked: false, createdAt: 1, gameMode: 'classic', hostUsername: 'Turbo Salmon',
};

const props = {
  handleJoin: vi.fn(), refreshRooms: vi.fn(), activeRooms: [listed], roomsLoading: false, isJoining: false,
  isAuthenticated: false, displayName: '', defaultLanguage: 'he' as const,
  setGameCode: vi.fn(), setUsername: vi.fn(), setRoomName: vi.fn(), setHostUsername: vi.fn(),
};

const ticket = () => ({
  code: screen.getByTestId('t-code').textContent,
  name: screen.getByTestId('t-name').textContent,
  seats: screen.getByTestId('t-seats').textContent,
  lang: screen.getByTestId('t-lang').textContent,
  unlisted: screen.getByTestId('t-unlisted').textContent,
});

describe('join sheet room — one source for every path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a typed code for a listed room shows the same ticket as tapping its card', () => {
    const { unmount } = render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('card'));
    const fromCard = ticket();
    unmount();

    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('typed-listed'));
    expect(ticket()).toEqual(fromCard);
    expect(fromCard).toEqual({ code: 'CN2T8U', name: 'Turbo Salmonʼs Room', seats: '1/50', lang: 'en', unlisted: 'false' });
  });

  it('an invite link for a listed room shows the live listing too', () => {
    render(<MultiplayerFlow {...props} prefilledRoom="CN2T8U" />);
    expect(ticket()).toMatchObject({ name: 'Turbo Salmonʼs Room', seats: '1/50', lang: 'en', unlisted: 'false' });
  });

  it('the open sheet follows the listing (seats taken while it is open)', () => {
    const { rerender } = render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('typed-listed'));
    rerender(<MultiplayerFlow {...props} activeRooms={[{ ...listed, playerCount: 7 }]} />);
    expect(ticket().seats).toBe('7/50');
  });

  it('a code nobody lists opens an honest code ticket', () => {
    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('typed-unlisted'));
    expect(ticket()).toMatchObject({ code: 'ZZ9QX2', name: '', unlisted: 'true' });
  });

  it('JOIN from a typed-code sheet joins that code (upper-cased, as typed)', () => {
    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('typed-listed'));
    expect(props.handleJoin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('sheet-join'));
    expect(props.handleJoin).toHaveBeenCalledWith(false, null, 'CN2T8U', undefined, 'Sly Fox');
  });
});
