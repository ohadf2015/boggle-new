/**
 * Wiring pin for the dead-room recovery: the page hands MultiplayerFlow a
 * room-ended offer; the entry shows the toast and its "Play now" runs the SAME
 * Quick Play handler as the Quick Start button (one path, Class 3).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const { toastMock } = vi.hoisted(() => ({ toastMock: Object.assign(vi.fn(), { dismiss: vi.fn(), error: vi.fn(), success: vi.fn() }) }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

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

let mockIsOnCrazyGamesPlatform = false;
let mockCgUser: { username: string | null } | null = null;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform,
    cgUser: mockCgUser,
    getSystemInfo: vi.fn().mockResolvedValue(null),
  }),
}));

const trackGrowthEventMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEventMock(...args),
  trackGuestJoin: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    dir: 'ltr',
    language: 'en',
  }),
  useLanguageSafe: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    dir: 'ltr',
    language: 'en',
    setLanguage: () => {},
    currentFlag: '🇺🇸',
  }),
}));


vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, profile: null }),
}));

vi.mock('@/hooks/useMatchmaking', () => ({
  useMatchmaking: () => ({
    status: 'idle',
    roomId: null,
    eloRange: 0,
    queueSize: 0,
    waitTime: 0,
    opponent: null,
    joinQueue: vi.fn(),
    leaveQueue: vi.fn(),
  }),
}));

vi.mock('../RoomListView', () => ({
  __esModule: true,
  default: () => <div data-testid="room-list-view">RoomListView</div>,
}));
vi.mock('../JoinRoomModal', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../CreateRoomModal', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../SeasonBanner', () => ({
  SeasonBanner: () => <div data-testid="season-banner">SeasonBanner</div>,
}));
vi.mock('../MatchmakingOverlay', () => ({
  MatchmakingOverlay: () => null,
}));

import MultiplayerFlow from '../MultiplayerFlow';
import type { Language } from '@/shared/types/game';

const baseProps = {
  handleJoin: vi.fn(),
  refreshRooms: vi.fn(),
  activeRooms: [],
  roomsLoading: false,
  isJoining: false,
  isAuthenticated: false,
  displayName: '',
  prefilledRoom: undefined,
  defaultLanguage: 'en' as Language,
  setGameCode: vi.fn(),
  setUsername: vi.fn(),
  setRoomName: vi.fn(),
  setHostUsername: vi.fn(),
};

describe('MultiplayerFlow — room-ended offer starts Quick Play', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    trackGrowthEventMock.mockClear();
    toastMock.mockClear();
    baseProps.handleJoin.mockClear();
    mockIsOnCrazyGamesPlatform = false;
    mockCgUser = null;
  });
  afterEach(() => { cleanup(); });

  it('GIVEN no offer THEN shows no room-ended toast', () => {
    render(<MultiplayerFlow {...baseProps} />);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('GIVEN an offer WHEN Play now is tapped THEN joins through Quick Play', () => {
    const onShown = vi.fn();
    render(<MultiplayerFlow {...baseProps} roomEndedOffer={{ seq: 1 }} onRoomEndedOfferShown={onShown} />);
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledTimes(1);

    const renderToast = toastMock.mock.calls[0][0] as (tt: { id: string }) => React.ReactElement;
    render(renderToast({ id: 'room-ended' }));
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomEnded.playNow' }));

    expect(baseProps.handleJoin).toHaveBeenCalledTimes(1);
    const args = baseProps.handleJoin.mock.calls[0];
    expect(args[5]).toEqual({ quickPlay: true });
    expect(trackGrowthEventMock).toHaveBeenCalledWith('mp_quickplay_initiated', expect.anything());
  });
});
