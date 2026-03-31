/**
 * Wiring tests: SeasonBanner and MatchmakingOverlay in MultiplayerFlow
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    isReady: true,
    inviteRoomId: null,
    isInstantMultiplayer: false,
    showInviteButton: vi.fn(),
  }),
}));

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => 'alice',
  hasCompleteStoredProfile: () => true,
}));

vi.mock('@/utils/share', () => ({
  getJoinUrl: () => 'http://test.com/join/TEST',
}));

vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => null,
}));

// Mock RoomListView
vi.mock('../RoomListView', () => ({
  __esModule: true,
  default: () => <div data-testid="room-list-view" />,
}));

vi.mock('../JoinRoomModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../CreateRoomModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock season hook
vi.mock('@/hooks/useSeason', () => ({
  useSeason: () => ({
    currentSeason: { id: 1, theme: 'Spring' },
    timeRemaining: { days: 20 },
    peakTier: 'Silver',
  }),
}));

vi.mock('@/shared/utils/eloRating', () => ({
  getRankTier: () => ({ name: 'Silver', color: '#C0C0C0', minRating: 1000 }),
}));

// Do NOT mock SeasonBanner — we test its presence

import MultiplayerFlow from '../MultiplayerFlow';

describe('MultiplayerFlow wiring', () => {
  const defaultProps = {
    handleJoin: vi.fn(),
    refreshRooms: vi.fn(),
    activeRooms: [],
    roomsLoading: false,
    isJoining: false,
    isAuthenticated: true,
    displayName: 'alice',
    defaultLanguage: 'en' as const,
    profileAvatar: null,
    setGameCode: vi.fn(),
    setUsername: vi.fn(),
    setRoomName: vi.fn(),
    setHostUsername: vi.fn(),
  };

  it('renders SeasonBanner in the lobby', () => {
    render(<MultiplayerFlow {...defaultProps} />);
    expect(screen.getByTestId('season-banner')).toBeInTheDocument();
  });
});
