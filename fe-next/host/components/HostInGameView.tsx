'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import InGameScreen from '../../components/game/InGameScreen';
import { useBlastMultiplayerBridge } from '@/components/blast/legacy/hooks/useBlastMultiplayerBridge';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';
import { useReconnectFlow } from '@/lib/multiplayer/useReconnectFlow';
import { ReconnectingOverlay } from '@/components/multiplayer/ReconnectingOverlay';
import { MPGameAbortedModal } from '@/components/multiplayer/MPGameAbortedModal';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

const BlastGame = dynamic(
  () => import('@/components/blast/legacy/BlastGame').then(m => ({ default: m.BlastGame })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
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
import { ShiritoriVersus } from '@/components/multiplayer/shiritori/ShiritoriVersus';
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
import { usePendingWords } from '@/lib/multiplayer/usePendingWords';
import { PendingWordChip } from '@/components/multiplayer/PendingWordChip';
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
  t: (path: string, params?: Record<string, string | number>) => string;

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

  const router = useRouter();
  const params = useParams();

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

  const { pendingWords, enqueuePending, confirmPending, rejectPending, dismissPending, clearAll } = usePendingWords();

  const { isReconnecting, reconnectAttempt, maxReconnectAttempts, isServerUpdating, showAbortModal, triggerAbort } =
    useReconnectFlow({ gameCode, username, gameActive: true });

  const handleContinueSolo = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mp_solo_handoff', JSON.stringify({ grid: tableData, gameCode }));
    }
    const locale = (params?.locale as string) || 'en';
    router.push(`/${locale}/singleplayer?mpHandoff=1`);
  }, [router, params, tableData, gameCode]);

  // Listen for per-word server feedback to drive pending-word chip transitions
  useEffect(() => {
    if (!socket) return;
    // playerFoundWord is now coalesced server-side into playerFoundWordBatch.
    const handlePlayerFoundBatch = (data: { words?: Array<{ username: string; word: string }> }) => {
      data.words?.forEach((w) => { if (w.username === username) confirmPending(w.word); });
    };
    const handleWordRejected = (data: { word: string }) => rejectPending(data.word);
    socket.on('playerFoundWordBatch', handlePlayerFoundBatch);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordAlreadyFound', handleWordRejected);
    socket.on('wordNotOnBoard', handleWordRejected);
    socket.on('endGame', clearAll);
    return () => {
      socket.off('playerFoundWordBatch', handlePlayerFoundBatch);
      socket.off('wordRejected', handleWordRejected);
      socket.off('wordAlreadyFound', handleWordRejected);
      socket.off('wordNotOnBoard', handleWordRejected);
      socket.off('endGame', clearAll);
    };
  }, [socket, username, confirmPending, rejectPending, clearAll]);

  // Blast multiplayer bridge — converts Zustand state to BlastGame props
  const blastBridge = useBlastMultiplayerBridge({
    letterGrid: tableData,
    gridSize: tableData?.[0]?.length ?? 4,
  });

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
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
        {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
        {showStopConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-neo-navy border-4 border-neo-black shadow-hard-lg p-6 max-w-xs w-full text-center rounded-neo">
              <p className="font-bold text-neo-cream text-lg mb-4 font-neo-display">{t('mp.stopGameConfirm')}</p>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={handleConfirmStopGame} className="bg-neo-pink border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
                  {t('mp.stopGameYes')}
                </button>
                <button type="button" onClick={() => setShowStopConfirm(false)} className="bg-neo-cream border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Word Tower versus — per-player towers, no shared grid
  if (gameMode === 'word-tower') {
    return (
      <>
        <WordTowerVersus socket={socket} username={username} onQuit={handleStopGameClick} />
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
        {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
      </>
    );
  }

  // Shiritori — turn-based word chain, no shared grid
  if (gameMode === 'shiritori') {
    return (
      <>
        <ShiritoriVersus socket={socket} username={username} onQuit={handleStopGameClick} />
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
        {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
      </>
    );
  }

  // Sealed Bid — secret auction bids, no shared grid
  if (gameMode === 'sealed-bid') {
    return (
      <>
        <SealedBidVersus socket={socket} username={username} onQuit={handleStopGameClick} />
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
        {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
      </>
    );
  }

  // Crossword race — all players solve the same puzzle, no shared grid
  if (gameMode === 'crossword') {
    return (
      <>
        <CrosswordVersus socket={socket} username={username} onQuit={handleStopGameClick} />
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
        {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
      </>
    );
  }

  // Blast with host playing: use dedicated BlastGame (same as PlayerInGameView)
  if (gameMode === 'blast' && hostPlaying) {
    return (
      <>
        {wrapCanvas(
        <BlastGame
          config={blastBridge.config}
          mode="multiplayer"
          remainingTime={remainingTime}
          totalTime={totalTime}
          leaderboard={leaderboard}
          username={username}
          onGameEnd={() => {/* Server controls game end in multiplayer */}}
          onMPDeadEnd={() => socket?.emit('blastDeadEnd')}
          onMPBoardCleared={handleMPBoardCleared}
          onQuit={handleStopGameClick}
          onWordWithComboType={handleBlastWordWithCombo}
          initialTileStates={blastBridge.initialTileStates}
          blastSeed={blastBridge.blastSeed}
          serverGrid={blastBridge.serverGrid}
          isDesktopCanvas={inShell}
        />
        )}
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
        {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
        {showStopConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-neo-navy border-4 border-neo-black shadow-hard-lg p-6 max-w-xs w-full text-center rounded-neo">
              <p className="font-bold text-neo-cream text-lg mb-4 font-neo-display">{t('mp.stopGameConfirm')}</p>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={handleConfirmStopGame} className="bg-neo-pink border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
                  {t('mp.stopGameYes')}
                </button>
                <button type="button" onClick={() => setShowStopConfirm(false)} className="bg-neo-cream border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Word-hunt with host playing: use dedicated WordHuntGame
  if (gameMode === 'word-hunt' && hostPlaying) {
    return (
      <>
        {wrapCanvas(
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
          isDesktopCanvas={inShell}
        />
        )}
        {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
        {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
        {showStopConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-neo-navy border-4 border-neo-black shadow-hard-lg p-6 max-w-xs w-full text-center rounded-neo">
              <p className="font-bold text-neo-cream text-lg mb-4 font-neo-display">{t('mp.stopGameConfirm')}</p>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={handleConfirmStopGame} className="bg-neo-pink border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
                  {t('mp.stopGameYes')}
                </button>
                <button type="button" onClick={() => setShowStopConfirm(false)} className="bg-neo-cream border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
    {wrapCanvas(
    <div className="relative flex-1 flex flex-col min-h-0">
    <InGameScreen
      // Core identity
      username={username}
      gameCode={gameCode}
      isHost={true}
      isPlaying={hostPlaying}
      inDesktopShell={inShell}
      gameplayFocusMode={hostPlaying}
      t={t}
      socket={socket}

      // Game state
      letterGrid={tableData}
      remainingTime={remainingTime}
      timerValue={timerValue}
      gameActive={true}
      showStartAnimation={showStartAnimation}
      gameLanguage={roomLanguage}
      minWordLength={minWordLength}
      comboLevel={comboLevel}
      comboLevelRef={comboLevelRef}

      // Player data
      foundWords={foundWords}
      leaderboard={leaderboard}

      // Callbacks
      onExitRoom={handleStopGameClick}
      onWordSubmit={onWordSubmit}

      // Earthquake/Fire Round
      earthquakeState={earthquakeState}
      fireRoundActive={fireRoundActive}
      fireRoundRemaining={fireRoundRemaining}

      // Theme
      boardTheme={boardTheme}

      // Game mode overlays
      gameMode={gameMode ?? undefined}
      onWordHuntGuess={hostPlaying ? handleWordHuntGuess : undefined}

      // Player experience (for keyboard trail inactivity threshold)
      totalGamesPlayed={profile?.total_games}
    />
    </div>
    )}
    {/* Pending word chips — optimistic submit feedback */}
    {pendingWords.size > 0 && (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-wrap gap-1 justify-center pointer-events-none">
        {Array.from(pendingWords.entries()).map(([word, status]) => (
          <PendingWordChip key={word} word={word} status={status} onDismiss={dismissPending} />
        ))}
      </div>
    )}
    {isReconnecting && <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />}
    {showAbortModal && <MPGameAbortedModal wordCount={hostFoundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onStopGame} />}
    {showStopConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-neo-navy border-4 border-neo-black shadow-hard-lg p-6 max-w-xs w-full text-center rounded-neo">
          <p className="font-bold text-neo-cream text-lg mb-4 font-neo-display">{t('mp.stopGameConfirm')}</p>
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={handleConfirmStopGame} className="bg-neo-pink border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
              {t('mp.stopGameYes')}
            </button>
            <button type="button" onClick={() => setShowStopConfirm(false)} className="bg-neo-cream border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default HostInGameView;
