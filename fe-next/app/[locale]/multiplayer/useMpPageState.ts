'use client';

/**
 * All state of the multiplayer page, as one hook. PageClient renders the
 * frame; `MpPhaseRouter` renders the phase from `resolveMpPagePhase`. Split out
 * of PageClient (FOUNDATION 2026-09-26); the code moved verbatim.
 */
import { useState, useCallback, useMemo, useEffect, useRef, useContext } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLiveClassroomGameInfo } from '@/hooks/useLiveClassroomGameInfo';
import { useTeacherStripState } from '@/components/education/controls/useTeacherStripState';
import { useIsVocabQuizRoom, quizOwnsRoundEnd } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import { isClassroomStudent, classroomStudentHomePath, CLASSROOM_ROOM_GONE_KEY } from '@/lib/education/classroomRoomGone';
import { SocketContext } from '@/utils/SocketContext';
import { clearSessionPreservingUsername } from '@/utils/session';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { useConnectionToasts } from '@/hooks/useConnectionToasts';
import { throttleLatest } from '@/utils/throttle';
import { useAchievementSocketBridge } from '@/hooks/useAchievementSocketBridge';
import { useMultiplayerAuth } from '@/hooks/useMultiplayerAuth';
import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { useMultiplayerGameFlow } from '@/hooks/useMultiplayerGameFlow';
import { useSeriesTracker } from '@/hooks/useSeriesTracker';
import { usePlayerJoinLeaveNotifications } from '@/hooks/usePlayerJoinLeaveNotifications';
import { useMultiplayerSounds } from '@/hooks/useMultiplayerSounds';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import { useGameActions, useGameStore, useGameActive, useShowStartAnimation } from '@/hooks/gameState';
import { stripMultiplayerExitParams } from '@/lib/multiplayer/stripExitParams';
import { multiplayerExitDestination, mpExit, type MpExitReason } from '@/lib/multiplayer/exitDestination';
import { readPreviousInAppPath } from '@/hooks/useMpExit';
import { resolveMpPagePhase } from '@/lib/multiplayer/mpPhase';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { MP_TOAST_IDS } from '@/utils/multiplayer/mpToastIds';
import { ENTRY_HIDES_GLOBAL_CHROME } from '@/components/multiplayer/entry/entryChrome';
import type { Language, ActiveRoom, GameMode } from '@/shared/types/game';
import type { Socket } from 'socket.io-client';
import { useMultiplayerJoin } from './useMultiplayerJoin';
import { useClassroomRoomWait } from './useClassroomRoomWait';
import { useMpRoomSocket, type MpRoomPlayer, type MpHostLeftState } from './useMpRoomSocket';
import { useMpPageEffects } from './useMpPageEffects';
import { applyMpPreselectMode } from './preselectMode';
import type { MpPhaseRouterProps } from './MpPhaseRouter';

export function useMpPageState() {
  const searchParams = useSearchParams();
  const isClassroomMode = searchParams?.get('classroom') === 'true';
  const isClassroomHost = searchParams?.get('host') === 'true';
  const preselectedMode = searchParams?.get('mode') as GameMode | null;
  const autoCreate = searchParams?.get('autoCreate') === 'true';
  const quickPlay = searchParams?.get('quickPlay') === 'true';
  const { setGameMode: setStoreGameMode, setHostSelectedGameMode } = useGameActions();

  const [gameCode, setGameCode] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [hostUsername, setHostUsername] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  // Classroom flows create rooms with `isPrivate=true`; the server echoes the
  // flag in `joined` so the lobby can hide invite/share UI for them.
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [roomLanguage, setRoomLanguage] = useState<Language | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<MpRoomPlayer[]>([]);
  // Coalesce roster updates: in busy rooms `updateUsers` can fire many times/sec
  // (presence/focus/score pings). Throttling to one apply per 150ms collapses the
  // re-render storm to ~6.7/s while always landing the latest roster.
  const setPlayersInRoomThrottled = useMemo(
    () => throttleLatest((users: MpRoomPlayer[]) => setPlayersInRoom(users), 150),
    []
  );
  useEffect(() => () => setPlayersInRoomThrottled.cancel(), [setPlayersInRoomThrottled]);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  // Soft-cushion modal state for `hostLeftRoomClosing` (replaces the prior 2s
  // reload, audit 2026-05-10 #1): a 10-second readable explanation + exit button.
  const [hostLeftState, setHostLeftState] = useState<MpHostLeftState | null>(null);

  const setIsInGame = useHideNavigation();

  // Pre-select game mode from URL param (e.g., ?mode=word-hunt).
  // Default MP mode is 'random' when no URL override.
  useEffect(() => {
    applyMpPreselectMode(preselectedMode, {
      setGameMode: setStoreGameMode,
      setHostSelectedGameMode,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useConnectionToasts();

  const { t, language } = useLanguage();

  // classroom_host_lobby_viewed — fills instrumentation gap behind the 2026-09-10
  // rage-click signal on ?classroom=true&host=true. Mount-only.
  useEffect(() => {
    if (isClassroomMode && isClassroomHost) {
      trackGrowthEvent('classroom_host_lobby_viewed', { language });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { user, isAuthenticated, isSupabaseEnabled, profile, loading, refreshProfile } = useAuth();
  // CrazyGames requires displaying their usernames in multiplayer (Full Launch requirement)
  const { user: cgUser, isCrazyGames, login: loginCrazyGames } = useCrazyGamesAuth();
  const { stopMusic } = useMusic();
  // Lobby / countdown / in-game beds start on phase changes but nothing in the
  // live MP tree ever stopped them — browser-back or nav to another route left
  // the bed looping. This hook's page stays mounted across lobby → game →
  // results, so unmount == leaving the multiplayer route.
  useEffect(() => () => stopMusic(500), [stopMusic]);
  // Countdown overlay flag — flips beforeGame → inGame music once play begins.
  const showStartAnimation = useShowStartAnimation();

  const {
    username, setUsername, guestAvatar, setGuestAvatar,
    authLoadingStartTime, usernameManuallySetRef, hasSetRandomNameRef,
  } = useMultiplayerAuth(language as Language);

  const [lessonDataState, setLessonDataState] = useState<{
    lessonId: string; lessonName: string; vocabularyWords: string[];
    language: Language; gameMode?: GameMode;
    templateSettings?: { timerSeconds: number; difficulty: string; minWordLength: number; allowLateJoin: boolean } | null;
  } | null>(null);

  // Ref bridge: allows hooks called before the room socket to access it
  const socketRef = useRef<Socket | null>(null);

  const handleSetLessonData = useCallback((data: typeof lessonDataState) => { setLessonDataState(data); }, []);
  const handleSetAttemptingReconnect = useCallback(() => {}, []);

  const {
    setShouldAutoJoin, prefilledRoomCode, setPrefilledRoomCode, lessonData,
  } = useMultiplayerSession({
    language: language as Language, socket: null, isConnected: false,
    isActive, attemptingReconnect: false, username, profile,
    usernameManuallySetRef, hasSetRandomNameRef,
    onSetGameCode: setGameCode, onSetUsername: setUsername, onSetRoomName: setRoomName,
    onSetGuestAvatar: setGuestAvatar, onSetAttemptingReconnect: handleSetAttemptingReconnect,
    onSetRoomLanguage: setRoomLanguage, onSetLessonData: handleSetLessonData, t,
  });

  // The room's own record of what it is playing and whose class it belongs to
  // (a student's classroom lobby used to announce Classic mid-Vocab-Quiz).
  const liveClassroomGame = useLiveClassroomGameInfo(gameCode || prefilledRoomCode, isClassroomMode);

  const {
    showResults, setShowResults, resultsData, setResultsData,
    isSpectator, setIsSpectator, spectators, setSpectators,
    pendingGameStart, setPendingGameStart, setGameStartTime,
    gameDuration, handleShowResults, handleReturnToRoom, handleUpgradeToPlayer,
  } = useMultiplayerGameFlow({ socketRef, gameCode, isAuthenticated, refreshProfile });

  // Stable reference: this is in the dep array of PlayerView's pendingGameStart
  // effect — an inline arrow would re-fire game-start side effects every render.
  const handleGameStartConsumed = useCallback(() => setPendingGameStart(null), [setPendingGameStart]);

  const router = useRouter();

  // A classroom room that stops existing must not hand its students to the
  // arcade. `isClassroomStudent` is the one place that decision is made; the
  // three call sites (host migration, room-gone error, host-left modal) are the
  // three ways a live room reached them with three different outcomes.
  const classroomStudentRef = useRef<boolean>(false);
  classroomStudentRef.current = isClassroomStudent({ isClassroomMode, isHost: isHost || isClassroomHost });

  const exitClassroomStudentToHub = useCallback(() => {
    clearSessionPreservingUsername(username);
    setIsActive(false); setIsHost(false); setIsPrivate(false); setGameCode('');
    setShowResults(false); setResultsData(null);
    toast(t(CLASSROOM_ROOM_GONE_KEY), { duration: 6000, icon: '🔔', id: MP_TOAST_IDS.roomGone });
    router.push(classroomStudentHomePath(language));
  }, [username, t, router, language, setIsActive, setIsHost, setIsPrivate, setGameCode, setShowResults, setResultsData]);
  // Early classroom joiner: the teacher's code is up but her room is not open yet — wait, never bounce.
  const roomWait = useClassroomRoomWait({ socketRef, isActive, onGiveUp: exitClassroomStudentToHub,
    rejoin: (code) => handleJoin(false, null, code, undefined, username) });

  // Native-safe exit to the multiplayer lobby: reset MP state IN PLACE (no page
  // reload). Shared by the results "Exit" button and the host-left grace modal.
  // A hard `window.location.href` nav blanks the Capacitor static-export WebView;
  // flipping showResults/isActive off renders the lobby instantly instead.
  const handleExitToLobby = useCallback(() => {
    // Tell the server we left BEFORE resetting local state, so the room drops us
    // from its roster (and migrates host if we were it) instead of keeping a
    // ghost player around for the next round. Mirrors the ConnectionBanner
    // onLeaveGame path.
    if (gameCode) {
      try { socketRef.current?.emit('leaveRoom', { gameCode, username }); } catch { /* socket gone */ }
    }
    clearSessionPreservingUsername(username);
    setIsActive(false); setIsHost(false); setIsPrivate(false); setGameCode('');
    setShowResults(false); setResultsData(null);
    try { sessionStorage.setItem('boggle_intentional_exit', '1'); } catch { /* storage blocked */ }
    if (typeof window !== 'undefined') {
      const stripped = stripMultiplayerExitParams(window.location.href);
      if (stripped !== window.location.href) {
        window.history.replaceState({}, '', stripped);
      }
    }
    // Stripping the params says what this room is NOT; it does not say where the
    // user now is. Without them `/multiplayer` is the CONSUMER arcade lobby, so a
    // teacher leaving a classroom game was left in the consumer app (measured
    // 2026-09-15). The strip stays (it closes the 2026-05-04 reload-re-entry
    // trap) and the destination is chosen here with a real router navigation —
    // `replaceState` alone never re-runs route guards or the layout.
    const destination = multiplayerExitDestination({
      isClassroomMode,
      isHost: isHost || isClassroomHost,
      locale: language,
    });
    // `null` = an ordinary arcade game, where the lobby genuinely is home and
    // the in-place reset above is the whole exit (a hard nav blanks the
    // Capacitor WebView). A router push is SPA navigation, so it is safe too.
    if (destination) router.push(destination);
  }, [gameCode, username, setIsActive, setIsHost, setIsPrivate, setGameCode, setShowResults, setResultsData,
      isClassroomMode, isHost, isClassroomHost, language, router]);

  // The page's `useMpExit()` target: every MP screen exits through here.
  // In-room reasons take the one in-place reset above (leaveRoom emit, session
  // clear, exit-param strip, classroom hub); only back-from-entry and
  // continue-solo leave the multiplayer route.
  const exitMp = useCallback((reason: MpExitReason) => {
    const action = mpExit(reason, {
      isClassroomMode, isHost: isHost || isClassroomHost, locale: language, previousPath: readPreviousInAppPath(),
    });
    if (reason !== 'back-from-entry') handleExitToLobby();
    if (action.kind === 'navigate' && (reason === 'back-from-entry' || reason === 'continue-solo')) router.push(action.href);
  }, [isClassroomMode, isHost, isClassroomHost, language, handleExitToLobby, router]);

  // PageClient is the ONE writer of the global nav-hiding state (pitfall
  // class 1): hidden in a room and on results; on entry per the ENTRY piece's
  // flag. MpScreen deliberately does not write it.
  useEffect(() => {
    setIsInGame(isActive || showResults || ENTRY_HIDES_GLOBAL_CHROME);
  }, [setIsInGame, isActive, showResults]);
  useEffect(() => {
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const seriesTracker = useSeriesTracker();

  const gameActive = useGameActive();
  // Resolved mode of the running round — decides whether "Skip word" is offered.
  const liveGameMode = useGameStore((s) => s.gameMode);
  usePlayerJoinLeaveNotifications({
    players: playersInRoom,
    currentUsername: username,
    t,
    enabled: isActive,
    deferToQueue: gameActive,
  });
  const mpSounds = useMultiplayerSounds();

  const {
    socket, isConnected, roomsLoading, attemptingReconnect,
    refreshRooms, signalIntentionalLeave,
    isPaused, pauseGame, resumeGame, extendTime, endRoundNow, skipTargetWord,
    classroomAccessibility, classroomLive, classroomLevel, classroomWordBank,
  } = useMpRoomSocket({
    language: language as Language, gameCode, username, roomName, isActive, isHost, roomLanguage,
    prefilledRoomCode, t,
    setIsHost, setIsActive, setIsPrivate, setError, setIsJoining, setShouldAutoJoin, setPrefilledRoomCode,
    setRoomLanguage, setUsername, setGameCode, setRoomName, setActiveRooms, setIsSpectator, setSpectators,
    setPlayersInRoom, setPlayersInRoomThrottled, setPendingGameStart, setGameStartTime, setShowResults,
    setResultsData, setHostLeftState, onMatchStart: mpSounds.onMatchStart, roomWaitHold: roomWait.hold,
    classroomStudentRef, exitClassroomStudentToHub,
  });

  // Sync ref bridge so hooks called before the room socket get the latest socket
  socketRef.current = socket;

  useAchievementSocketBridge(socket);

  const handleJoin = useMultiplayerJoin({
    socket, gameCode, username, roomName, hostUsername,
    language: language as Language, t, isSupabaseEnabled,
    user, profile, loading, authLoadingStartTime,
    guestAvatar, setGuestAvatar,
    setUsername, setError, setIsJoining,
  });

  useMpPageEffects({
    socket, t, username, isActive, gameCode, showResults, resultsData, showStartAnimation,
    playersInRoom, mpSounds, seriesTracker, audioCuesActive: !!classroomAccessibility?.audioCues,
    setRoomLanguage,
  });

  const handleManualReconnect = useCallback(() => {
    if (socket && !socket.connected) socket.connect();
  }, [socket]);

  // PageClient renders UNDER the app-wide SocketProvider, so this reads the
  // global socket context. Its `serverShutdown` handler sets isServerUpdating
  // during a deploy — forward it so the ConnectionBanner shows "updating" copy.
  const globalSocket = useContext(SocketContext);
  const isServerUpdating = globalSocket?.isServerUpdating ?? false;

  const socketContextValue = useMemo(() => ({
    socket, isConnected, connectionError: error, isReconnecting: attemptingReconnect,
    isServerUpdating,
    getReconnectAttempt: () => 0, maxReconnectAttempts: 20, manualReconnect: handleManualReconnect,
  }), [socket, isConnected, error, attemptingReconnect, isServerUpdating, handleManualReconnect]);

  // Round state from the server's own traffic: the host never writes the store's `gameActive` (see controls/teacherStripVisibility).
  const teacherStrip = useTeacherStripState({ socket, isActive, isHost, isClassroomMode, showResults, storeGameActive: gameActive });
  const quizOwnsScreen = useIsVocabQuizRoom(socket);
  // A Vocab Quiz ends on its own podium; the board results would show zeros (see quizOwnsRoundEnd).
  const quizEndsThisRound = quizOwnsRoundEnd({ isQuizRoom: quizOwnsScreen, showResults, isActive });
  const phase = resolveMpPagePhase({ showResults, quizEndsThisRound, isActive, isHost });

  const routerProps: MpPhaseRouterProps = {
    phase, gameCode, username, isHost, socket, roomLanguage, isClassroomMode,
    classroomGameMode: liveClassroomGame?.gameMode,
    onExitToLobby: handleExitToLobby, onUsernameChange: setUsername,
    resultsData, handleReturnToRoom, gameDuration, seriesTracker,
    entry: {
      handleJoin, refreshRooms, activeRooms, roomsLoading,
      isJoining, isAuthenticated, autoCreate, quickPlay,
      displayName: (isCrazyGames && cgUser?.username) || profile?.display_name || '', profileAvatar: profile?.avatar_config,
      onCrazyGamesLogin: isCrazyGames && !cgUser ? loginCrazyGames : undefined,
      prefilledRoom: prefilledRoomCode, defaultLanguage: language as Language,
      host: isClassroomHost,
      isClassroomMode, waitingForTeacher: !!roomWait.waitingCode,
      setGameCode, setUsername, setRoomName, setHostUsername,
    },
    playersInRoom, handleShowResults, pendingGameStart, handleGameStartConsumed, lessonData,
    isPrivate, quickPlay, classroomLive,
  };

  return {
    t, language, router, isClassroomMode, isClassroomHost, username, hostUsername, gameCode, prefilledRoomCode,
    isActive, isHost, showResults, gameActive, liveGameMode, playersInRoom, lessonDataState, liveClassroomGame,
    socket, isConnected, isSpectator, spectators, handleUpgradeToPlayer, signalIntentionalLeave,
    isPaused, pauseGame, resumeGame, extendTime, endRoundNow, skipTargetWord,
    classroomAccessibility, classroomLevel, classroomWordBank, teacherStrip, quizOwnsScreen,
    socketContextValue, hostLeftState, setHostLeftState, classroomStudentRef, exitClassroomStudentToHub,
    handleExitToLobby, exitMp, setIsActive, setIsHost, setIsPrivate, setGameCode, setShowResults, setResultsData,
    routerProps,
  };
}
