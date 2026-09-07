/**
 * A guest with NO stored profile who opens `/multiplayer?room=X&classroom=true`
 * — the QR target, the share link and the student dashboard's "JOIN NOW" — used
 * to sit on the classroom "setting up your game" spinner forever.
 *
 * `handleInvitationAutoJoin` needs a name before it can join, so it asked for
 * the join modal; the classroom early-return rendered the loader before any
 * modal could mount. A spinner that can never resolve is recurring pitfall
 * class 4: a silent no-op with something to look at.
 *
 * The prompt is deliberately NOT the shared `JoinRoomModal`:
 *  - that modal's open effect calls `getOrCreateStoredUsername`, which PERSISTS a
 *    generated name, so a second visit would silently auto-join a student into
 *    the teacher's roster under a machine name;
 *  - it is dismissible, and its `onClose` resets `flowState` to `room-list` —
 *    which lands the student straight back on the spinner. Same dead end, hat.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let mockHasCompleteStoredProfile = false;
let mockStoredUsername = '';
const setStoredUsernameMock = vi.fn();

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => mockStoredUsername,
  getOrCreateStoredUsername: () => mockStoredUsername || 'Generated_1234',
  getOrCreateStoredCustomAvatar: () => ({ skin: 'a' }),
  getStoredAvatarId: () => null,
  setStoredUsername: (name: string) => setStoredUsernameMock(name),
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

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: false,
    cgUser: null,
    getSystemInfo: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
  trackGuestJoin: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
  useLanguageSafe: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
    setLanguage: () => {},
    currentFlag: '🇺🇸',
  }),
}));

vi.mock('@/components/NativeLanguageBanner', () => ({ NativeLanguageBanner: () => null }));
vi.mock('@/components/FirstGameLanguageNotice', () => ({ FirstGameLanguageNotice: () => null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, profile: null }),
}));
vi.mock('@/hooks/useMatchmaking', () => ({
  useMatchmaking: () => ({
    status: 'idle', roomId: null, eloRange: 0, queueSize: 0,
    waitTime: 0, opponent: null, joinQueue: vi.fn(), leaveQueue: vi.fn(),
  }),
}));
vi.mock('../RoomListView', () => ({
  __esModule: true,
  default: () => <div data-testid="room-list-view">RoomListView</div>,
}));
vi.mock('../JoinRoomModal', () => ({ __esModule: true, default: () => null }));
vi.mock('../CreateRoomModal', () => ({ __esModule: true, default: () => null }));
vi.mock('../MatchmakingOverlay', () => ({ MatchmakingOverlay: () => null }));

import MultiplayerFlow from '../MultiplayerFlow';
import type { Language } from '@/shared/types/game';

const handleJoin = vi.fn();
const setUsername = vi.fn();
const setGameCode = vi.fn();

const baseProps = {
  handleJoin,
  refreshRooms: vi.fn(),
  activeRooms: [],
  roomsLoading: false,
  isJoining: false,
  isAuthenticated: false,
  displayName: '',
  defaultLanguage: 'en' as Language,
  setGameCode,
  setUsername,
  setRoomName: vi.fn(),
  setHostUsername: vi.fn(),
};

describe('MultiplayerFlow — a nameless guest joining a classroom room gets a name prompt', () => {
  beforeEach(() => {
    mockHasCompleteStoredProfile = false;
    mockStoredUsername = '';
    handleJoin.mockClear();
    setUsername.mockClear();
    setGameCode.mockClear();
    setStoredUsernameMock.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => cleanup());

  it('shows the name prompt instead of the never-resolving loader', () => {
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />);

    expect(screen.getByTestId('classroom-name-prompt')).toBeTruthy();
    expect(screen.queryByTestId('classroom-waiting')).toBeNull();
    // The public lobby stays suppressed — a student is not shopping for rooms.
    expect(screen.queryByTestId('room-list-view')).toBeNull();
  });

  it('joins the classroom room with the typed name', () => {
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />);

    fireEvent.change(screen.getByTestId('classroom-name-input'), {
      target: { value: 'Maya' },
    });
    fireEvent.click(screen.getByTestId('classroom-name-submit'));

    expect(handleJoin).toHaveBeenCalledWith(false, null, 'ABC123', undefined, 'Maya');
    expect(setStoredUsernameMock).toHaveBeenCalledWith('Maya');
  });

  it('swaps to the waiting loader once a name has been given', () => {
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />);

    fireEvent.change(screen.getByTestId('classroom-name-input'), {
      target: { value: 'Maya' },
    });
    fireEvent.click(screen.getByTestId('classroom-name-submit'));

    expect(screen.queryByTestId('classroom-name-prompt')).toBeNull();
    expect(screen.getByTestId('classroom-waiting')).toBeTruthy();
  });

  it('refuses an empty name rather than joining as nobody', () => {
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />);

    fireEvent.click(screen.getByTestId('classroom-name-submit'));

    expect(handleJoin).not.toHaveBeenCalled();
    expect(screen.getByTestId('classroom-name-prompt')).toBeTruthy();
  });

  /**
   * `?classroom=true&host=true` is the teacher's own arrival: the code was minted
   * upstream and this client must CREATE that room, not join it. The auto-join
   * path has always branched on `host`; the prompt's submit path must too, or a
   * teacher whose browser has no stored name would try to join a room that does
   * not exist yet and hang there.
   */
  it('creates the room, rather than joining it, when the classroom host is prompted', () => {
    const setRoomName = vi.fn();
    const setHostUsername = vi.fn();
    render(
      <MultiplayerFlow
        {...baseProps}
        setRoomName={setRoomName}
        setHostUsername={setHostUsername}
        isClassroomMode
        host
        prefilledRoom="ABC123"
      />
    );

    fireEvent.change(screen.getByTestId('classroom-name-input'), {
      target: { value: 'Ms Cohen' },
    });
    fireEvent.click(screen.getByTestId('classroom-name-submit'));

    expect(handleJoin).toHaveBeenCalledWith(
      true,
      'en',
      'ABC123',
      'Ms Cohen Room',
      'Ms Cohen',
      { isPrivate: true, isClassroom: true }
    );
    expect(setHostUsername).toHaveBeenCalledWith('Ms Cohen');
  });

  /**
   * `isAuthenticated` and `displayName` arrive as props that start false/empty
   * and resolve a beat later. An enrolled student whose browser has no stored
   * multiplayer profile therefore takes the "needs a name" branch on first
   * render. When auth lands, the auto-join branch runs — and if it does not also
   * clear the prompt, the student is left typing into a form while a join is
   * already in flight under their real display name. A submit in that window
   * fires a SECOND join under a different name.
   */
  it('takes the prompt away when the student\'s own account resolves late', () => {
    const { rerender } = render(
      <MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />
    );
    expect(screen.getByTestId('classroom-name-prompt')).toBeTruthy();

    rerender(
      <MultiplayerFlow
        {...baseProps}
        isAuthenticated
        displayName="Priya Sharma"
        isClassroomMode
        prefilledRoom="ABC123"
      />
    );

    expect(screen.queryByTestId('classroom-name-prompt')).toBeNull();
    expect(handleJoin).toHaveBeenCalledWith(false, null, 'ABC123', undefined, 'Priya Sharma');
  });

  /**
   * The prompt persists a username but no avatar id, so `hasCompleteStoredProfile`
   * stays false. A classroom student only ever needed a name — the lobby
   * generates the avatar — so a mid-lesson refresh must walk straight back into
   * the room rather than asking again.
   */
  it('does not ask twice after a refresh — a stored name is enough for a class', () => {
    mockStoredUsername = 'Maya';
    mockHasCompleteStoredProfile = false;
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />);

    expect(screen.queryByTestId('classroom-name-prompt')).toBeNull();
    expect(handleJoin).toHaveBeenCalledWith(false, null, 'ABC123', undefined, 'Maya');
  });

  it('never prompts a guest who already has a stored profile', () => {
    mockHasCompleteStoredProfile = true;
    mockStoredUsername = 'Noa';
    render(<MultiplayerFlow {...baseProps} isClassroomMode prefilledRoom="ABC123" />);

    expect(screen.queryByTestId('classroom-name-prompt')).toBeNull();
    expect(screen.getByTestId('classroom-waiting')).toBeTruthy();
    expect(handleJoin).toHaveBeenCalledWith(false, null, 'ABC123', undefined, 'Noa');
  });
});
