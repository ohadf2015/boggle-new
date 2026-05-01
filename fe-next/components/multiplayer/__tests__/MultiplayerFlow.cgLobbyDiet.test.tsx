import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => 'CGPlayer',
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
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    dir: 'ltr',
    language: 'en',
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

describe('MultiplayerFlow — CG lobby diet', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    trackGrowthEventMock.mockClear();
    mockCgUser = null;
  });
  afterEach(() => {
    cleanup();
  });

  it('does NOT render hero when isOnCrazyGamesPlatform=false', () => {
    mockIsOnCrazyGamesPlatform = false;
    render(<MultiplayerFlow {...baseProps} />);
    expect(screen.queryByTestId('cg-lobby-hero')).toBeNull();
    expect(screen.getByTestId('room-list-view')).toBeTruthy();
  });

  it('renders hero on CG when first-session auto-join already fired', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    expect(screen.getByTestId('cg-lobby-hero')).toBeTruthy();
  });

  it('hides RoomListView when hero is collapsed (SeasonBanner moved to homepage)', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    expect(screen.queryByTestId('room-list-view')).toBeNull();
    expect(screen.queryByTestId('season-banner')).toBeNull();
  });

  it('shows RoomListView after Browse-rooms tap; season presence stays on homepage', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    fireEvent.click(screen.getByTestId('cg-lobby-hero-browse'));
    expect(screen.getByTestId('room-list-view')).toBeTruthy();
    expect(screen.queryByTestId('season-banner')).toBeNull();
  });

  it('PLAY CTA fires Quick Play (calls handleJoin with quickPlay flag)', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    const handleJoin = vi.fn();
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} />);
    fireEvent.click(screen.getByTestId('cg-lobby-hero-play'));
    expect(handleJoin).toHaveBeenCalledWith(
      true,
      'en',
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ quickPlay: true }),
    );
  });

  it('renders returning-named greeting when cgUser has username', () => {
    mockIsOnCrazyGamesPlatform = true;
    mockCgUser = { username: 'OhadF' };
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    expect(screen.getByText(/cg\.hero\.welcomeBack\|.*OhadF/)).toBeTruthy();
  });

  it('does NOT render hero in classroom mode', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} isClassroomMode />);
    expect(screen.queryByTestId('cg-lobby-hero')).toBeNull();
  });

  it('regression: first-session auto-join still fires (cg_lobby_arrival telemetry)', () => {
    mockIsOnCrazyGamesPlatform = true;
    render(<MultiplayerFlow {...baseProps} activeRooms={[]} />);
    const calls = trackGrowthEventMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain('cg_lobby_arrival');
  });
});
