import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const completeProfile = true;
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
  default: ({ roomLanguage, onRoomLanguageChange, onCreateRoom }: {
    roomLanguage: string; onRoomLanguageChange: (l: string) => void; onCreateRoom: () => void;
  }) => (
    <div data-testid="room-list-view" data-language={roomLanguage}>
      <button type="button" onClick={() => onRoomLanguageChange('he')}>to-he</button>
      <button type="button" onClick={onCreateRoom}>create-side</button>
    </div>
  ),
}));
vi.mock('../JoinSheet', () => ({ __esModule: true, default: () => null }));
vi.mock('../CreateSheet', () => ({
  __esModule: true,
  default: ({ isOpen, defaultLanguage }: { isOpen: boolean; defaultLanguage: string }) =>
    isOpen ? <div data-testid="create-sheet-mock">{defaultLanguage}</div> : null,
}));
vi.mock('../../MatchmakingOverlay', () => ({ MatchmakingOverlay: () => null }));

import MultiplayerFlow from '../../MultiplayerFlow';

const props = {
  handleJoin: vi.fn(), refreshRooms: vi.fn(), activeRooms: [], roomsLoading: false, isJoining: false,
  isAuthenticated: false, displayName: '', defaultLanguage: 'en' as const,
  setGameCode: vi.fn(), setUsername: vi.fn(), setRoomName: vi.fn(), setHostUsername: vi.fn(),
};

describe('MultiplayerFlow room language', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given an English viewer, When the entry opens, Then the list filters to English', () => {
    render(<MultiplayerFlow {...props} />);
    expect(screen.getByTestId('room-list-view')).toHaveAttribute('data-language', 'en');
  });

  it('Given the viewer switched the list to Hebrew, When the side CREATE is pressed, Then CREATE opens in Hebrew', () => {
    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('to-he'));
    expect(screen.getByTestId('room-list-view')).toHaveAttribute('data-language', 'he');
    fireEvent.click(screen.getByText('create-side'));
    expect(screen.getByTestId('create-sheet-mock').textContent).toBe('he');
  });

  it('Given the list is on Hebrew, When the footer CREATE is used, Then it also opens in Hebrew', () => {
    render(<MultiplayerFlow {...props} />);
    fireEvent.click(screen.getByText('to-he'));
    fireEvent.click(screen.getByTestId('arena-create-room'));
    expect(screen.getByTestId('create-sheet-mock').textContent).toBe('he');
  });
});
