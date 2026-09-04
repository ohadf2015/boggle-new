import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

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

vi.mock('@/components/NativeLanguageBanner', () => ({
  NativeLanguageBanner: () => null,
}));
vi.mock('@/components/FirstGameLanguageNotice', () => ({
  FirstGameLanguageNotice: () => null,
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

describe('MultiplayerFlow — classroom mode must never dead-end on a spinner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    trackGrowthEventMock.mockClear();
    mockIsOnCrazyGamesPlatform = false;
    mockCgUser = null;
  });
  afterEach(() => { cleanup(); });

  /**
   * `?classroom=true` replaced the whole lobby with a "waiting for players" spinner
   * unconditionally. That is correct only while a real room is being joined or created.
   *
   * A student who pressed "Play with class" while no game was running was sent to
   * `?classroom=true&autoCreate=true` with NO `room=`, so nothing to join and nothing to
   * create — and the spinner branch returned before the create modal could ever render.
   * The student sat on a spinner that could not resolve. Observed as "they could not play".
   */
  it('shows the waiting loader while a classroom room is actually being joined', () => {
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />);
    expect(screen.getByTestId('classroom-waiting')).toBeTruthy();
    expect(screen.queryByTestId('room-list-view')).toBeNull();
  });

  it('does NOT strand a student on the spinner when there is no room to join', () => {
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom={undefined} />);
    expect(screen.queryByTestId('classroom-waiting')).toBeNull();
    expect(screen.getByTestId('room-list-view')).toBeTruthy();
  });

  it('does NOT strand a student on the spinner for autoCreate with no room', () => {
    render(<MultiplayerFlow {...baseProps} isClassroomMode autoCreate prefilledRoom={undefined} />);
    expect(screen.queryByTestId('classroom-waiting')).toBeNull();
  });
});
