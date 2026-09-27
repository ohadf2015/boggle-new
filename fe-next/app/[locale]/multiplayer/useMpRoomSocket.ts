'use client';

/**
 * The multiplayer page's room socket: `useMultiplayerSocket` plus every
 * page-level handler (joined, errors, game start/reset, host migration…).
 * Split out of PageClient (FOUNDATION 2026-09-26); the handler bodies moved
 * verbatim — only their inputs now arrive through `MpRoomSocketContext`.
 */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { useMultiplayerSocket } from '@/hooks/useMultiplayerSocket';
import { saveSession, clearSession, clearSessionPreservingUsername } from '@/utils/session';
import { setStoredUsername } from '@/utils/profileStorage';
import { useGameStore } from '@/hooks/gameState';
import { stripMultiplayerExitParams } from '@/lib/multiplayer/stripExitParams';
import { roomGoneFeedback } from '@/lib/multiplayer/roomGoneFeedback';
import { rejoinFeedback } from '@/lib/multiplayer/rejoinFeedback';
import { rosterSeedFromJoined } from '@/lib/multiplayer/roster';
import { resetMpFeedback } from '@/lib/multiplayer/mpFeedback';
import { trackInviteRoomDead, trackInviteConsumed } from '@/utils/growthTracking';
import { classifyRoomError } from '@/utils/multiplayer/roomErrorClassifier';
import { MP_TOAST_IDS } from '@/utils/multiplayer/mpToastIds';
import type { Language, ActiveRoom, Avatar } from '@/shared/types/game';

/** One `updateUsers` / `joined.users` row, as PageClient stores it. */
// A type alias (not an interface) so it stays assignable to index-signature shapes like host/PlayerView's `Player`.
export type MpRoomPlayer = {
  username: string;
  score?: number;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
  presenceStatus?: string;
  isWindowFocused?: boolean;
};

export interface MpHostLeftState {
  reason?: 'explicit_no_successor' | 'grace_expired' | 'host_switched_room';
  message: string;
}

type Setter<T> = Dispatch<SetStateAction<T>>;
type GameFlowSetter<T> = (value: T) => void;

export interface MpRoomSocketContext {
  language: Language;
  gameCode: string;
  username: string;
  roomName: string;
  isActive: boolean;
  isHost: boolean;
  roomLanguage: Language | null;
  prefilledRoomCode: string;
  t: Parameters<typeof useMultiplayerSocket>[0]['t'];
  setIsHost: Setter<boolean>;
  setIsActive: Setter<boolean>;
  setIsPrivate: Setter<boolean>;
  setError: Setter<string>;
  setIsJoining: Setter<boolean>;
  setShouldAutoJoin: (v: boolean) => void;
  setPrefilledRoomCode: (v: string) => void;
  setRoomLanguage: Setter<Language | null>;
  setUsername: (v: string) => void;
  setGameCode: Setter<string>;
  setRoomName: Setter<string>;
  setActiveRooms: Setter<ActiveRoom[]>;
  setIsSpectator: GameFlowSetter<boolean>;
  setSpectators: GameFlowSetter<Array<{ username: string; socketId: string; avatar: unknown }>>;
  setPlayersInRoom: Setter<MpRoomPlayer[]>;
  setPlayersInRoomThrottled: ((users: MpRoomPlayer[]) => void) & { cancel: () => void };
  setPendingGameStart: (v: any) => void;
  setGameStartTime: (v: number) => void;
  setShowResults: (v: boolean) => void;
  setResultsData: (v: any) => void;
  setHostLeftState: Setter<MpHostLeftState | null>;
  onMatchStart: () => void;
  /** Early classroom joiner: hold on the teacher's code instead of bouncing. */
  roomWaitHold: (code: string) => void;
  classroomStudentRef: MutableRefObject<boolean>;
  exitClassroomStudentToHub: () => void;
}

/**
 * Report a returning user's invite as consumed, timed from the landing stamp.
 * Module scope on purpose: it runs from the socket's `joined` callback, never
 * during render, but a `Date.now()` sitting lexically inside the component
 * reads as an impure render call to react-hooks/purity. The new-user path
 * reports this from useInviteOnboardingMode instead.
 */
function reportInviteConsumed(roomCode: string): void {
  if (typeof sessionStorage === 'undefined') return;
  const landedTs = sessionStorage.getItem('invite_landed_ts');
  if (!landedTs) return;
  const totalSeconds = Math.round((Date.now() - Number(landedTs)) / 1000);
  trackInviteConsumed({ roomCode, path: 'direct', totalSeconds });
  sessionStorage.removeItem('invite_landed_ts');
}

export function useMpRoomSocket(ctx: MpRoomSocketContext) {
  const {
    language, gameCode, username, roomName, isActive, isHost, roomLanguage, prefilledRoomCode, t,
    setIsHost, setIsActive, setIsPrivate, setError, setIsJoining, setShouldAutoJoin, setPrefilledRoomCode,
    setRoomLanguage, setUsername, setGameCode, setRoomName, setActiveRooms, setIsSpectator, setSpectators,
    setPlayersInRoom, setPlayersInRoomThrottled, setPendingGameStart, setGameStartTime, setShowResults,
    setResultsData, setHostLeftState, classroomStudentRef, exitClassroomStudentToHub,
  } = ctx;
  const roomWait = { hold: ctx.roomWaitHold };
  const mpSounds = { onMatchStart: ctx.onMatchStart };

  const {
    socket, isConnected, roomsLoading, attemptingReconnect,
    setAttemptingReconnect, refreshRooms, signalIntentionalLeave,
    isPaused, pauseGame, resumeGame, extendTime, endRoundNow, skipTargetWord,
    classroomAccessibility, classroomLive,
    classroomLevel, classroomWordBank,
  } = useMultiplayerSocket({
    language, gameCode, username, roomName,
    isActive, isHost, roomLanguage,
    onJoined: (data) => {
      // Capture BEFORE the reset below — this join completing while a
      // reconnect was in flight is what makes it a "rejoin".
      const rejoin = rejoinFeedback({ wasReconnecting: attemptingReconnect, roomCode: data.gameCode || gameCode });
      // Seed the roster from the payload: the lobby used to mount empty until
      // the next `updateUsers` broadcast. Cancel a pending throttled update so
      // a stale roster cannot land on top of the fresh one.
      const seed = rosterSeedFromJoined(data);
      if (seed) {
        setPlayersInRoomThrottled.cancel();
        setPlayersInRoom(seed);
      }
      setIsHost(data.isHost);
      setIsActive(true);
      setIsPrivate(!!data.isPrivate);
      setError('');
      setAttemptingReconnect(false);
      if (rejoin) toast(t(rejoin.key, rejoin.params), { duration: 3000, icon: rejoin.icon, id: MP_TOAST_IDS.rejoined });
      setShouldAutoJoin(false);
      setIsJoining(false);
      setPrefilledRoomCode('');
      // `mp_quickplay_joined` lives in useMultiplayerJoin, which knows the join
      // was a Quick Play from `options.quickPlay` rather than a URL param.
      // Track invite consumed for returning users who arrived via ?room= invite redirect.
      // New-user path fires this in useInviteOnboardingMode instead.
      if (prefilledRoomCode) reportInviteConsumed(prefilledRoomCode);
      if (data.language) setRoomLanguage(data.language);
      const joinedUsername = data.username || username;
      if (data.isHost) { setUsername(joinedUsername); setStoredUsername(joinedUsername); }
      else if (username) { setStoredUsername(username); }
      saveSession({
        gameCode: data.gameCode || gameCode, username: joinedUsername,
        isHost: data.isHost, roomName: data.roomName || roomName || '',
        hostUsername: data.isHost ? joinedUsername : undefined,
        language: data.language || roomLanguage || 'en',
      });
    },
    onUpdateUsers: (users) => setPlayersInRoomThrottled(users),
    onActiveRooms: (rooms) => setActiveRooms(rooms),
    onJoinedAsSpectator: (data) => {
      setIsSpectator(true);
      setGameCode(data.gameCode);
      setRoomName(data.roomName);
      setRoomLanguage(data.language);
      setIsJoining(false);
      saveSession({ gameCode: data.gameCode, username: data.username || username, isHost: false, roomName: data.roomName, language: data.language });
      toast(t('spectator.youAreSpectating'), { duration: 4000, icon: '👀' });
    },
    onSpectatorList: (spectatorList) => setSpectators(spectatorList),
    onSpectatorUpgraded: (data) => {
      if (data.success) {
        setIsSpectator(false);
        setIsActive(true);
        setPlayersInRoom(data.users || []);
        toast.success(t('spectator.upgraded'), { duration: 3000, icon: '🎮' });
      }
    },
    onError: (data) => {
      setIsJoining(false);
      // Classify by structured error CODE first (message substrings as legacy
      // fallback). The old message-only matcher leaked raw English for the
      // GAME_CLOSED paths whose custom message lacked "closed"/"not found".
      const kind = classifyRoomError(data);
      // Same code derivation as the 'gone' branch below: both state values can be empty on a cold invite load.
      if (kind === 'notOpen') { setError(''); roomWait.hold(gameCode || prefilledRoomCode || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('room') ?? '' : '')); return; }
      if (kind === 'gone') {
        // Snapshot identity BEFORE the resets below clear it: the dead-invite
        // toast needs the room code, and `cameFromInvite` is derived from the
        // `room=` param that this branch strips from the URL at the end.
        const cameFromInvite = typeof window !== 'undefined' && window.location.search.includes('room=');
        const urlRoom = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('room') ?? ''
          : '';
        const goneCode = gameCode || prefilledRoomCode || urlRoom;
        // Stale lobby tap or room torn down mid-join. Drop the dead room from
        // the local list synchronously so a re-tap can't re-fire the same dead
        // join before the server round-trip refreshes the list.
        if (gameCode) setActiveRooms((rooms) => rooms.filter((r) => r.gameCode !== gameCode));
        // Feedback policy lives in `roomGoneFeedback` (never silent: a cold
        // invite to a dead room gets "that room is no longer available" instead
        // of an empty lobby — the 2026-05-25 "empty page" report). The shared
        // `roomGone` toast id collapses a run of dead-room taps into one.
        // A classroom student gets the classroom sentence and their own hub —
        // the arcade "no battles in progress" lobby means nothing to them.
        if (classroomStudentRef.current) {
          setError('');
          setPrefilledRoomCode(''); setAttemptingReconnect(false); setShouldAutoJoin(false);
          exitClassroomStudentToHub();
          return;
        }
        const feedback = roomGoneFeedback({ wasActive: isActive, cameFromInvite, roomCode: goneCode });
        toast(t(feedback.key, feedback.params), { duration: 5000, icon: feedback.icon, id: MP_TOAST_IDS.roomGone });
        if (!isActive && cameFromInvite) {
          trackInviteRoomDead({ roomCode: goneCode || 'unknown' });
        }
        setError('');
        setGameCode(''); setPrefilledRoomCode(''); setIsActive(false); setIsHost(false); setIsPrivate(false);
        setAttemptingReconnect(false); setShouldAutoJoin(false); clearSession();
        socket?.emit('getActiveRooms');
        // Strip classroom/host too, not just room: leaving them re-enters the
        // classroom HOST boot path and silently creates another room.
        if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
          window.history.replaceState({}, '', stripMultiplayerExitParams(window.location.href));
        }
      } else if (kind === 'codeExists') {
        setError(t('errors.gameCodeExists'));
        toast.error(t('errors.gameCodeExists'), { duration: 4000, icon: '❌', id: MP_TOAST_IDS.codeExists });
        setIsActive(false); setIsHost(false); setAttemptingReconnect(false);
      } else if (kind === 'usernameTaken') {
        setError(t('errors.usernameTaken'));
        toast.error(t('errors.usernameTaken'), { duration: 4000, icon: '❌', id: MP_TOAST_IDS.usernameTaken });
        setIsActive(false); setAttemptingReconnect(false); setShouldAutoJoin(false); clearSession();
      } else if (kind === 'rateLimited') {
        // Rage-clicking Join is how a player trips the 50 msg/10s limiter, so
        // say what happened and what to do instead of a generic error.
        setError(t('errors.tooManyAttempts'));
        toast.error(t('errors.tooManyAttempts'), { duration: 4000, icon: '⏳', id: MP_TOAST_IDS.rateLimited });
        setAttemptingReconnect(false);
      } else {
        // Prefer a translated string; `data.message` is a hardcoded English
        // sentence from the backend, so it is the last resort, not the default.
        const errorMsg = t('errors.generic') || data.message || 'Error';
        setError(errorMsg);
        toast.error(errorMsg, { duration: 4000, icon: '❌', id: MP_TOAST_IDS.joinError });
      }
    },
    onGameStart: (data) => {
      setPendingGameStart(data);
      setGameStartTime(Date.now());
      setShowResults(false);
      setResultsData(null);
      // A new round starts with a clean HUD feedback channel.
      resetMpFeedback();
      mpSounds.onMatchStart();
    },
    onGameReset: () => {
      // Reset Zustand store so stale blast/word-hunt state doesn't leak into the next round.
      // Also clear results — PlayerView is unmounted during results screen, so its own
      // resetGame handler can't fire. PageClient must handle this since it's always mounted.
      useGameStore.getState().resetForNewRound();
      resetMpFeedback();
      setShowResults(false);
      setResultsData(null);
      setPendingGameStart(null);
    },
    onHostLeftRoomClosing: (data) => {
      // Show grace modal — actual session/state cleanup happens in onExit.
      // The modal countdown gives the player time to read what happened
      // before being yanked back to the lobby.
      setHostLeftState({
        reason: data.reason,
        message: data.resolvedMessage || t('multiplayerFlow.roomClosed'),
      });
    },
    onSessionMigrated: () => {
      clearSessionPreservingUsername(username);
      setIsActive(false); setIsHost(false); setGameCode('');
      toast(t('multiplayerFlow.roomClosed'), { duration: 3000, icon: 'ℹ️' });
    },
    onWarning: () => {},
    onRateLimited: () => {
      setIsJoining(false);
      toast.error(t('multiplayerFlow.rateLimited'), { duration: 3000, icon: '⏳', id: MP_TOAST_IDS.rateLimited });
    },
    onHostTransferred: (data) => {
      if (data.newHost !== username) return;
      // A classroom student is never a host candidate. The server's ordinary
      // migration picked one when the teacher dropped, and they were rendered
      // the teacher's own share-code/QR screen. Send them home instead.
      if (classroomStudentRef.current) { exitClassroomStudentToHub(); return; }
      setIsHost(true);
    },
    t,
  });

  return {
    socket, isConnected, roomsLoading, attemptingReconnect,
    setAttemptingReconnect, refreshRooms, signalIntentionalLeave,
    isPaused, pauseGame, resumeGame, extendTime, endRoundNow, skipTargetWord,
    classroomAccessibility, classroomLive, classroomLevel, classroomWordBank,
  };
}
