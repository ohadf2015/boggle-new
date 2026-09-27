'use client';

import React, { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMpExit } from '@/hooks/useMpExit';
import { MpRoundShell, isRoundFrameMode } from '@/components/multiplayer/round/MpRoundShell';
import { MpBlastCanvas } from '@/components/multiplayer/round/MpBlastCanvas';
import { MP_ROUND_CONTAINER_CLASS } from '@/components/multiplayer/round/roundContainer';
import type { Socket } from 'socket.io-client';
import InGameScreen from '../../components/game/InGameScreen';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';
import { useReconnectFlow } from '@/lib/multiplayer/useReconnectFlow';
import { ReconnectingOverlay } from '@/components/multiplayer/ReconnectingOverlay';
import { MPGameAbortedModal } from '@/components/multiplayer/MPGameAbortedModal';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

const WordHuntGame = dynamic(
  () => import('@/components/wordhunt/WordHuntGame').then(m => ({ default: m.WordHuntGame })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
const VocabQuizHostView = dynamic(
  () => import('@/components/education/vocabQuiz/VocabQuizHostView').then(m => ({ default: m.VocabQuizHostView })),
  { ssr: false },
);
const WheelRushView = dynamic(
  () => import('@/components/multiplayer/WheelRushView').then(m => ({ default: m.WheelRushView })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
// Lightweight gridless versus views (no pixi/gsap) — static-imported so they
// never race jsdom teardown via a deferred dynamic import. WordTower stays
// dynamic below because it pulls the pixi scene.
const WordTowerVersus = dynamic(
  () => import('@/components/wordTower/WordTowerVersus').then(m => ({ default: m.WordTowerVersus })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
import { SealedBidVersus } from '@/components/multiplayer/sealedBid/SealedBidVersus';
import { CrosswordVersus } from '@/components/multiplayer/crossword/CrosswordVersus';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { BoardTheme } from '@/shared/types/socket';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGameMode,
  useGameModeConfirmed,
  useGameStore,
} from '@/hooks/gameState/store';
import { useRoundPendingWords, PendingWordChips } from '@/components/multiplayer/round/useRoundPendingWords';
import { useRoundToastLane } from '@/components/multiplayer/round/useRoundToastLane';
import { StopGameConfirm } from '@/components/multiplayer/round/StopGameConfirm';
import { useDesktopShellEnabled } from '@/hooks/useDesktopShellEnabled';
import { useIsVocabQuizRoom } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import { MpDesktopShellFrame, isShellMode } from '@/components/multiplayer/desktop/MpDesktopShellFrame';
import { getMpInGameContainerClass } from '@/lib/multiplayer/inGameContainerClass';

// ==================== Types ====================

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

interface HostInGameViewProps {
  // Core props
  gameCode: string;
  username: string;
  roomLanguage: Language;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;

  // Game state
  tableData: LetterGrid;
  remainingTime: number | null;
  timerValue: number;
  minWordLength: number;
  comboLevel: number;
  comboLevelRef: React.MutableRefObject<number>;

  // Host playing state
  hostPlaying: boolean;
  showStartAnimation: boolean;
  hostFoundWords: string[];
  onWordSubmit: (word: string) => void;

  // Players
  playersReady: (string | PlayerData)[];
  playerScores: Record<string, number>;
  playerWordCounts: Record<string, number>;

  // Actions
  onStopGame: () => void;
  socket: Socket | null;

  // Earthquake/Fire Round
  earthquakeState?: EarthquakeState;
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;

  // Theme
  boardTheme?: BoardTheme | null;

  // Blast multiplayer: total game duration for CircularTimer progress ring
  totalTime?: number;
}

// ==================== Component ====================

/**
 * HostInGameView - Wrapper that uses the unified InGameScreen component
 * Transforms host-specific props to the shared component interface
 */
const HostInGameView: React.FC<HostInGameViewProps> = ({
  // Core props
  gameCode,
  username,
  roomLanguage,
  t,

  // Game state
  tableData,
  remainingTime,
  timerValue,
  minWordLength,
  comboLevel,
  comboLevelRef,

  // Host playing state
  hostPlaying,
  showStartAnimation,
  hostFoundWords,
  onWordSubmit,

  // Players
  playersReady,
  playerScores,
  playerWordCounts,

  // Actions
  onStopGame,
  socket,

  // Earthquake/Fire Round
  earthquakeState = 'idle',
  fireRoundActive = false,
  fireRoundRemaining = 0,

  // Theme
  boardTheme,

  // Blast multiplayer
  totalTime,
}): React.ReactElement | null => {
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const mpExit = useMpExit();

  // Get player's game history for trail display logic
  const { profile } = useAuth();

  // Sound effects for MP Blast board cleared celebration
  const { playEpicVictorySound } = useSoundEffects();

  // Only gameMode at root — mode-overlay state subscribed by InGameScreen.
  const gameMode = useGameMode();
  const gameModeConfirmed = useGameModeConfirmed();
  // Live Vocab Quiz rooms replace the board entirely.
  const isVocabQuizRoom = useIsVocabQuizRoom(socket);
  const setBlastBoardClearedByLocal = useGameStore((s) => s.setBlastBoardClearedByLocal);

  const { pendingWords, enqueuePending, dismissPending } = useRoundPendingWords(socket, username);
  // Shared toasters (achievement capsule, react-hot-toast) stay off the round HUD.
  useRoundToastLane();

  const { isReconnecting, reconnectAttempt, maxReconnectAttempts, isServerUpdating, showAbortModal, triggerAbort } =
    useReconnectFlow({ gameCode, username, gameActive: true });

  const handleContinueSolo = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mp_solo_handoff', JSON.stringify({ grid: tableData, gameCode }));
    }
    mpExit('continue-solo');
  }, [mpExit, tableData, gameCode]);

  // Blast multiplayer: emit word + comboType to server via socket
  const handleBlastWordWithCombo = useCallback((word: string, comboType: string | null) => {
    if (!socket) return;
    enqueuePending(word);
    socket.emit('submitWord', { word, comboType });
  }, [socket, enqueuePending]);

  // Word hunt guess handler — emits to server
  const handleWordHuntGuess = useCallback((guess: string) => {
    if (!socket) return;
    socket.emit('submitTargetWord', { guess });
  }, [socket]);

  // Blast multiplayer: local player cleared the shared board
  const handleMPBoardCleared = useCallback(() => {
    setBlastBoardClearedByLocal(true);
    playEpicVictorySound();
  }, [setBlastBoardClearedByLocal, playEpicVictorySound]);

  // Stop game with confirmation
  const handleStopGameClick = useCallback(() => {
    setShowStopConfirm(true);
  }, []);

  const handleConfirmStopGame = useCallback(() => {
    setShowStopConfirm(false);
    onStopGame();
  }, [onStopGame]);

  // Build leaderboard from players data
  const leaderboard = useMemo(() => {
    return [...playersReady].map(player => {
      const playerUsername = typeof player === 'string' ? player : player.username;
      const avatar = typeof player === 'object' ? player.avatar : null;
      const isHostPlayer = typeof player === 'object' ? player.isHost : false;
      const presenceStatus = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
      const isWindowFocused = typeof player === 'object' ? player.isWindowFocused : true;
      const isBot = typeof player === 'object' ? player.isBot : false;
      const disconnected = typeof player === 'object' ? player.disconnected : false;

      return {
        username: playerUsername,
        score: playerScores[playerUsername] || 0,
        wordCount: playerWordCounts[playerUsername] || 0,
        avatar: avatar || undefined,
        isHost: isHostPlayer,
        presenceStatus,
        isWindowFocused,
        isBot,
        disconnected,
      };
    }).sort((a, b) => b.score - a.score);
  }, [playersReady, playerScores, playerWordCounts]);

  // Seat list for the round roster (host + bots + joiners, presence).
  const roundUsers = useMemo(
    () => playersReady.filter((p): p is PlayerData => typeof p === 'object' && !!p).map((p) => ({
      username: p.username,
      avatar: p.avatar ?? undefined,
      isHost: p.isHost,
      isBot: p.isBot,
      presenceStatus: p.presenceStatus,
    })),
    [playersReady],
  );

  // Normalize found words to expected format
  const foundWords = useMemo(() => {
    return hostFoundWords.map((word, index) => ({
      word,
      isValid: true,
      timestamp: index,
    }));
  }, [hostFoundWords]);

  // Desktop 3-column chassis — only when the host is actually playing (the rails
  // are player-centric, e.g. "my words"); a non-playing TV/scoreboard host keeps
  // its full-screen layout. Mobile/tablet path is byte-identical to before.
  const shellEnabled = useDesktopShellEnabled();
  // True when the mode canvas is mounted as the shell's center slot. Each canvas
  // gets this so it collapses its own desktop side-rails (the shell supplies them)
  // — otherwise the canvas double-nests its 3-col layout and the board renders tiny.
  const inShell = shellEnabled && isShellMode(gameMode) && hostPlaying;
  const wrapCanvas = (canvas: React.ReactNode) =>
    inShell ? (
      <div className={getMpInGameContainerClass(gameMode as string)}>
        <MpDesktopShellFrame
          gameMode={gameMode as string}
          canvas={canvas}
          leaderboard={leaderboard}
          foundWords={foundWords}
          socket={socket}
          meId={username}
          roomId={gameCode}
          remainingTime={remainingTime}
          totalTime={totalTime}
        />
      </div>
    ) : (
      canvas
    );

  // Shared overlays for every branch (one copy, so the branches cannot drift).
  const stopConfirm = (
    <StopGameConfirm open={showStopConfirm} t={t} onConfirm={handleConfirmStopGame} onCancel={() => setShowStopConfirm(false)} />
  );
  const connectionOverlays = (
    <>
      {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
      {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
    </>
  );

  // Wait for server to confirm mode before rendering — prevents one-frame classic flash
  if (!gameModeConfirmed) return null;

  // Live Vocab Quiz — the teacher's projector. No letter grid: the quiz is not a
  // `GameMode` (see shared/types/vocabQuiz), so it is detected from the server's
  // quiz traffic rather than from the placeholder board mode in the start
  // payload that mounted this view.
  if (isVocabQuizRoom) {
    return (
      <>
        <VocabQuizHostView
          socket={socket}
          joinCode={gameCode}
          playerCount={leaderboard?.length}
          t={t}
        />
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
      </>
    );
  }

  // Wheel-rush: dedicated view (no TV variant yet, host always renders it)
  if (gameMode === 'wheel-rush') {
    return (
      <>
        {wrapCanvas(
        <WheelRushView
          socket={socket}
          username={username}
          leaderboard={leaderboard}
          onQuit={handleStopGameClick}
          t={t}
          remainingTime={remainingTime}
          isDesktopCanvas={inShell}
        />
        )}
        {connectionOverlays}
        {stopConfirm}
      </>
    );
  }

  // Gridless versus modes — per-player towers / secret bids / crossword race.
  if (gameMode === 'word-tower' || gameMode === 'sealed-bid' || gameMode === 'crossword') {
    const Versus = gameMode === 'word-tower' ? WordTowerVersus : gameMode === 'sealed-bid' ? SealedBidVersus : CrosswordVersus;
    return (
      <>
        <Versus socket={socket} username={username} onQuit={handleStopGameClick} />
        {connectionOverlays}
      </>
    );
  }

  const pendingChips = <PendingWordChips pendingWords={pendingWords} dismissPending={dismissPending} />;

  // Classic board props — shared by the round frame and the non-playing fallback.
  const classicProps = {
    username,
    gameCode,
    isHost: true,
    isPlaying: hostPlaying,
    gameplayFocusMode: hostPlaying,
    t,
    socket,
    letterGrid: tableData,
    remainingTime,
    timerValue,
    gameActive: true,
    showStartAnimation,
    gameLanguage: roomLanguage,
    minWordLength,
    comboLevel,
    comboLevelRef,
    foundWords,
    leaderboard,
    onExitRoom: handleStopGameClick,
    onWordSubmit,
    earthquakeState,
    fireRoundActive,
    fireRoundRemaining,
    boardTheme,
    gameMode: gameMode ?? undefined,
    onWordHuntGuess: hostPlaying ? handleWordHuntGuess : undefined,
    // Player experience (for keyboard trail inactivity threshold)
    totalGamesPlayed: profile?.total_games,
  };

  const roundTotal = totalTime ?? timerValue * 60;

  // The playing host: classic, word-hunt and blast run in the SAME round frame
  // as the joiner (one HUD, roster, hidden-until-GO board) — pitfall class 3.
  if (hostPlaying && isRoundFrameMode(gameMode)) {
    const canvas = gameMode === 'blast' ? (
      <MpBlastCanvas
        grid={tableData}
        username={username}
        socket={socket}
        totalTime={roundTotal}
        onQuit={handleStopGameClick}
        onWordWithComboType={handleBlastWordWithCombo}
        onBoardCleared={handleMPBoardCleared}
      />
    ) : gameMode === 'word-hunt' ? (
      <WordHuntGame
        grid={tableData}
        gameLanguage={roomLanguage}
        leaderboard={leaderboard}
        username={username}
        score={leaderboard.find(p => p.username === username)?.score ?? 0}
        onQuit={handleStopGameClick}
        onWordSubmit={onWordSubmit}
        onWordHuntGuess={handleWordHuntGuess}
        gameActive={true}
        minWordLength={minWordLength}
        socket={socket}
        foundWords={foundWords}
        mpChrome
      />
    ) : (
      <InGameScreen {...classicProps} mpChrome />
    );
    return (
      <div className={MP_ROUND_CONTAINER_CLASS}>
        <MpRoundShell
          desktopShell={shellEnabled}
          roomId={gameCode}
          meId={username}
          gameMode={gameMode}
          remainingTime={remainingTime}
          totalTime={roundTotal}
          leaderboard={leaderboard}
          users={roundUsers}
          foundWords={foundWords}
          comboLevel={comboLevel}
          revealed={!showStartAnimation}
          onExit={handleStopGameClick}
          canvas={canvas}
          socket={socket}
        />
        {pendingChips}
        {connectionOverlays}
        {stopConfirm}
      </div>
    );
  }

  // Non-playing host fallback (the projector normally takes this role).
  return (
    <>
      {wrapCanvas(
        <div className="relative flex-1 flex flex-col min-h-0">
          <InGameScreen {...classicProps} inDesktopShell={inShell} />
        </div>,
      )}
      {pendingChips}
      {connectionOverlays}
      {stopConfirm}
    </>
  );
};

export default HostInGameView;
