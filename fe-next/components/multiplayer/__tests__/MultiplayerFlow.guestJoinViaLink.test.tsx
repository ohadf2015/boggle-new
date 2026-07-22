/**
 * MultiplayerFlow — guest join via invitation link telemetry.
 *
 * `room_joined_via_link` (isGuest:true) was a dead event: trackGuestJoin had
 * zero callers. The genuine "via link" path is the prefilledRoom (?room=)
 * auto-join. This wires the event at that path for unauthenticated players so
 * the guest referral-join cohort becomes measurable — without mislabeling
 * lobby-browse joins (which route through the shared modal handler).
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import MultiplayerFlow from '../MultiplayerFlow';
import type { ActiveRoom, Language } from '@/shared/types/game';

let mockHasCompleteStoredProfile = true;
vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => 'GuestPlayer',
  getStoredAvatarId: () => 'avatar-1',
  hasCompleteStoredProfile: () => mockHasCompleteStoredProfile,
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

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

const trackGrowthEventMock = vi.fn();
const trackGuestJoinMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEventMock(...args),
  trackGuestJoin: (...args: unknown[]) => trackGuestJoinMock(...args),
}));

vi.mock('../RoomListView', () => ({ __esModule: true, default: () => <div data-testid="room-list-view" /> }));
vi.mock('../JoinRoomModal', () => ({ __esModule: true, default: () => null }));
vi.mock('../CreateRoomModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/multiplayer/SeasonBanner', () => ({ SeasonBanner: () => null }));
vi.mock('@/components/multiplayer/MatchmakingOverlay', () => ({ MatchmakingOverlay: () => null }));
vi.mock('@/hooks/useMatchmaking', () => ({
  useMatchmaking: () => ({
    status: 'idle', joinQueue: vi.fn(), leaveQueue: vi.fn(),
    eloRange: 100, queueSize: 0, waitTime: 0, opponent: null, roomId: null,
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, profile: null }) }));
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
  displayName: 'AuthedPlayer',
  defaultLanguage: 'en' as Language,
  setGameCode: vi.fn(),
  setUsername: vi.fn(),
  setRoomName: vi.fn(),
  setHostUsername: vi.fn(),
};

describe('MultiplayerFlow — guest join via invitation link', () => {
  beforeEach(() => {
    trackGrowthEventMock.mockClear();
    trackGuestJoinMock.mockClear();
    mockHasCompleteStoredProfile = true;
    sessionStorage.clear();
  });
  afterEach(() => cleanup());

  it('fires trackGuestJoin when an unauthenticated player auto-joins via a ?room= invite link', () => {
    // GIVEN a returning guest (stored profile) arriving on a shared room link
    render(
      <MultiplayerFlow
        {...baseProps}
        isAuthenticated={false}
        displayName=""
        prefilledRoom="ROOM01"
      />,
    );

    // THEN the dead room_joined_via_link cohort event is lit with the room + lang
    expect(trackGuestJoinMock).toHaveBeenCalledTimes(1);
    expect(trackGuestJoinMock).toHaveBeenCalledWith('GuestPlayer', 'ROOM01', 'en');
  });

  it('does NOT fire trackGuestJoin for an authenticated player joining via link', () => {
    // GIVEN an authenticated user arriving via the same link
    render(<MultiplayerFlow {...baseProps} prefilledRoom="ROOM01" />);

    // THEN no guest-join event (they are not a guest)
    expect(trackGuestJoinMock).not.toHaveBeenCalled();
  });

  it('does NOT fire trackGuestJoin on a plain lobby mount (no invite link)', () => {
    render(<MultiplayerFlow {...baseProps} isAuthenticated={false} displayName="" />);
    expect(trackGuestJoinMock).not.toHaveBeenCalled();
  });
});
