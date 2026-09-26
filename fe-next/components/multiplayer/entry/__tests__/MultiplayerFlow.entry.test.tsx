/**
 * The redesigned entry frame (DESIGN §b.1): MultiplayerFlow renders the ONE
 * MpScreen — header slot, the arenas body, and a footer holding QUICK START —
 * and wires JOIN BY CODE into the same join path an invite link takes.
 * (The MultiplayerFlow.* guard tests keep the create/join/quick-play contract.)
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let completeProfile = true;
vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => 'StoredPlayer',
  getOrCreateStoredUsername: () => 'StoredPlayer',
  getStoredAvatarId: () => 'avatar-1',
  hasCompleteStoredProfile: () => completeProfile,
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
  default: ({ onJoinCode }: { onJoinCode?: (code: string) => void }) => (
    <div data-testid="room-list-view">
      <button type="button" onClick={() => onJoinCode?.('ABC123')}>code</button>
    </div>
  ),
}));
vi.mock('../../JoinRoomModal', () => ({
  __esModule: true,
  default: ({ isOpen, room }: { isOpen: boolean; room: { gameCode: string } | null }) =>
    isOpen ? <div data-testid="join-room-modal">{room?.gameCode}</div> : null,
}));
vi.mock('../../CreateRoomModal', () => ({ __esModule: true, default: () => null }));
vi.mock('../../MatchmakingOverlay', () => ({ MatchmakingOverlay: () => null }));

import MultiplayerFlow from '../../MultiplayerFlow';

const props = {
  handleJoin: vi.fn(), refreshRooms: vi.fn(), activeRooms: [], roomsLoading: false, isJoining: false,
  isAuthenticated: false, displayName: '', defaultLanguage: 'en' as const,
  setGameCode: vi.fn(), setUsername: vi.fn(), setRoomName: vi.fn(), setHostUsername: vi.fn(),
};

describe('MultiplayerFlow entry frame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeProfile = true;
  });

  it('renders one MpScreen with the header slot, the arenas body and the QUICK START footer', () => {
    render(<MultiplayerFlow {...props} header={<div data-testid="slot-header" />} />);
    expect(screen.getByTestId('mp-entry')).toBeInTheDocument();
    expect(screen.getByTestId('mp-entry-header')).toContainElement(screen.getByTestId('slot-header'));
    expect(screen.getByTestId('mp-entry-body')).toContainElement(screen.getByTestId('room-list-view'));
    expect(screen.getByTestId('mp-entry-footer')).toContainElement(screen.getByTestId('arena-quick-start'));
  });

  it('QUICK START in the footer fires quick play', () => {
    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByTestId('arena-quick-start'));
    expect(props.handleJoin).toHaveBeenCalledWith(
      expect.any(Boolean), expect.anything(), expect.any(String), expect.anything(), expect.any(String),
      expect.objectContaining({ quickPlay: true }),
    );
  });

  it('a typed code joins directly when the player has a profile', () => {
    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('code'));
    expect(props.setGameCode).toHaveBeenCalledWith('ABC123');
    expect(props.handleJoin).toHaveBeenCalledWith(false, null, 'ABC123', undefined, 'StoredPlayer');
  });

  it('a typed code without a profile opens the join sheet for that code', () => {
    completeProfile = false;
    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('code'));
    expect(props.handleJoin).not.toHaveBeenCalled();
    expect(screen.getByTestId('join-room-modal').textContent).toBe('ABC123');
  });

  it('a typed code always JOINS — never the classroom host "create this code" path', () => {
    render(<MultiplayerFlow {...props} host />);
    fireEvent.click(screen.getByText('code'));
    expect(props.handleJoin).toHaveBeenCalledWith(false, null, 'ABC123', undefined, 'StoredPlayer');
    expect(props.handleJoin).not.toHaveBeenCalledWith(true, expect.anything(), 'ABC123', expect.anything(), expect.anything(), expect.anything());
  });
});
