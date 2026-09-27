/**
 * MultiplayerFlow — CrazyGames lobby arrival telemetry.
 *
 * `cg_welcome_view` only fires from the OnboardingFlow root path, so it has
 * zero coverage of the production CG funnel where users land directly on
 * `/multiplayer`. `cg_lobby_arrival` plugs that gap so we can measure CG
 * MP-funnel volume + auto-join decision split.
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';
import MultiplayerFlow from '../MultiplayerFlow';
import type { ActiveRoom, Language } from '@/shared/types/game';

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => 'CGPlayer',
  getOrCreateStoredUsername: () => 'CGPlayer',
  getStoredAvatarId: () => 'avatar-1',
  hasCompleteStoredProfile: () => true,
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
  getAvatarEmojiAndColor: () => ({ emoji: '🎮', color: '#FF6B6B' }),
}));

let mockIsOnCrazyGamesPlatform = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform }),
}));

const trackGrowthEventMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEventMock(...args),
}));

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
vi.mock('@/components/multiplayer/SeasonBanner', () => ({
  SeasonBanner: () => null,
}));
vi.mock('@/components/multiplayer/MatchmakingOverlay', () => ({
  MatchmakingOverlay: () => null,
}));
vi.mock('@/hooks/useMatchmaking', () => ({
  useMatchmaking: () => ({
    status: 'idle', joinQueue: vi.fn(), leaveQueue: vi.fn(),
    eloRange: 100, queueSize: 0, waitTime: 0, opponent: null, roomId: null,
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, profile: null }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', setLanguage: () => {}, dir: 'ltr', currentFlag: '🇺🇸' }),
}));

vi.mock('@/components/NativeLanguageBanner', () => ({
  NativeLanguageBanner: () => null,
}));
vi.mock('@/components/FirstGameLanguageNotice', () => ({
  FirstGameLanguageNotice: () => null,
}));

const baseRoom: ActiveRoom = {
  gameCode: 'ROOM01',
  roomName: 'Test Room',
  playerCount: 2,
  language: 'en' as Language,
  gameState: 'waiting',
  isRanked: false,
  createdAt: Date.now(),
};

const baseProps = {
  handleJoin: vi.fn(),
  refreshRooms: vi.fn(),
  activeRooms: [baseRoom],
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

describe('MultiplayerFlow — CrazyGames lobby arrival telemetry', () => {
  beforeEach(() => {
    trackGrowthEventMock.mockClear();
    sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    mockIsOnCrazyGamesPlatform = false;
  });

  it('fires cg_lobby_arrival once on CG mount with show_lobby decision (auto-join removed)', () => {
    mockIsOnCrazyGamesPlatform = true;
    render(<MultiplayerFlow {...baseProps} />);
    const arrivalCalls = trackGrowthEventMock.mock.calls.filter(
      ([event]) => event === 'cg_lobby_arrival',
    );
    expect(arrivalCalls).toHaveLength(1);
    expect(arrivalCalls[0][1]).toMatchObject({ decision: 'show_lobby' });
  });

  it('still fires cg_lobby_arrival with show_lobby decision when no joinable rooms', () => {
    mockIsOnCrazyGamesPlatform = true;
    render(<MultiplayerFlow {...baseProps} activeRooms={[]} />);
    const arrivalCalls = trackGrowthEventMock.mock.calls.filter(
      ([event]) => event === 'cg_lobby_arrival',
    );
    expect(arrivalCalls).toHaveLength(1);
    expect(arrivalCalls[0][1]).toMatchObject({ decision: 'show_lobby', joinableRoomCount: 0 });
  });

  it('does not fire cg_lobby_arrival on non-CrazyGames platforms', () => {
    mockIsOnCrazyGamesPlatform = false;
    render(<MultiplayerFlow {...baseProps} />);
    const arrivalCalls = trackGrowthEventMock.mock.calls.filter(
      ([event]) => event === 'cg_lobby_arrival',
    );
    expect(arrivalCalls).toHaveLength(0);
  });
});
