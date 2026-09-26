'use client';

import React, { memo, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';
import InGameScreen from '../../components/game/InGameScreen';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

const WordHuntGame = dynamic(
  () => import('@/components/wordhunt/WordHuntGame').then(m => ({ default: m.WordHuntGame })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
const WheelRushView = dynamic(
  () => import('@/components/multiplayer/WheelRushView').then(m => ({ default: m.WheelRushView })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
const VocabQuizView = dynamic(
  () => import('@/components/education/vocabQuiz/VocabQuizView').then(m => ({ default: m.VocabQuizView })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
const WordTowerVersus = dynamic(
  () => import('@/components/wordTower/WordTowerVersus').then(m => ({ default: m.WordTowerVersus })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
// Lightweight gridless versus views (no pixi/gsap) — static-imported so they
// never race jsdom teardown via a deferred dynamic import. WordTower stays
// dynamic above because it pulls the pixi scene.
import { SealedBidVersus } from '@/components/multiplayer/sealedBid/SealedBidVersus';
import { CrosswordVersus } from '@/components/multiplayer/crossword/CrosswordVersus';
import type { LetterGrid, Language, TournamentStanding } from '@/shared/types/game';
import type { BoardTheme } from '@/shared/types/socket';
import { getMpInGameContainerClass, getMpInGamePlaceholderClass } from '@/lib/multiplayer/inGameContainerClass';
import { useDesktopShellEnabled } from '@/hooks/useDesktopShellEnabled';
import { useIsVocabQuizRoom } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import { MpDesktopShellFrame } from '@/components/multiplayer/desktop/MpDesktopShellFrame';
import type { MpRosterUserLike } from '@/lib/multiplayer/roster';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGameMode,
  useGameModeConfirmed,
  useGameStore,
  useBlastBoardClearedByLocal,
} from '@/hooks/gameState/store';
import { useReconnectFlow } from '@/lib/multiplayer/useReconnectFlow';
import { useRoundPendingWords, PendingWordChips } from '@/components/multiplayer/round/useRoundPendingWords';
import { PlayerRoundDialogs } from './in-game/PlayerRoundDialogs';
import type { PlayerFoundWord, PlayerHintsState, PlayerLeaderboardEntry, PlayerTournamentData } from './in-game/types';
import { ReconnectingOverlay } from '@/components/multiplayer/ReconnectingOverlay';
import { MPGameAbortedModal } from '@/components/multiplayer/MPGameAbortedModal';
import { useMpExit } from '@/hooks/useMpExit';
import { MpRoundShell, isRoundFrameMode } from '@/components/multiplayer/round/MpRoundShell';
import { MpBlastCanvas } from '@/components/multiplayer/round/MpBlastCanvas';
import { MP_ROUND_CONTAINER_CLASS } from '@/components/multiplayer/round/roundContainer';

type HintsState = PlayerHintsState;
type FoundWord = PlayerFoundWord;
type LeaderboardEntry = PlayerLeaderboardEntry;
type TournamentData = PlayerTournamentData;

interface PlayerInGameViewProps {
  // Core props
  username: string;
  gameCode: string;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';
  socket: Socket | null;

  // Game state
  letterGrid: LetterGrid | null;
  shufflingGrid: LetterGrid | null;
  gameActive: boolean;
  showStartAnimation: boolean;
  remainingTime: number | null;
  gameLanguage: Language | null;
  minWordLength: number;
  comboLevel: number;
  comboLevelRef: React.MutableRefObject<number>;
  /**
   * Timestamp of the last accepted word — drives the combo-window countdown
   * inside `ComboDisplayConnected`. The 10 Hz RAF state used to live in
   * `PlayerView` and cascade through every memo boundary down here on every
   * tick; passing the trigger value instead of the derived state keeps the
   * shell stable during drag.
   */
  lastWordTime: number | null;

  // Player data
  foundWords: FoundWord[];
  leaderboard: LeaderboardEntry[];
  /**
   * The room's seat list (updateUsers). Merged into the desktop roster so the
   * joiner never reads "PLAYERS 0" before the first leaderboard update.
   */
  rosterUsers?: MpRosterUserLike[];
  totalBoardWords?: number | null;

  // Tournament
  tournamentData: TournamentData | null;
  tournamentStandings: TournamentStanding[];
  showTournamentStandings: boolean;
  setShowTournamentStandings: (show: boolean) => void;

  // UI state
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;

  // Callbacks
  onExitRoom: () => void;
  onConfirmExit: () => void;
  onWordSubmit: (word: string) => void;
  onResetCombo?: () => void;

  // Hints (single-player mode)
  hints?: HintsState;

  // Earthquake/Fire Round
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;

  // Board theme
  boardTheme?: BoardTheme | null;

  // Tutorial callback
  onShowTutorial?: () => void;

  // Blast multiplayer: total game duration for CircularTimer progress ring
  totalTime?: number;
}

// ==================== Component ====================

/**
 * PlayerInGameView - Main game view for players during active gameplay
 * Uses shared InGameScreen for the game UI with player-specific modals
 */
const PlayerInGameView = memo<PlayerInGameViewProps>(({
  username, gameCode, t, dir, socket, letterGrid, shufflingGrid, gameActive, showStartAnimation,
  remainingTime, gameLanguage, minWordLength, comboLevel, comboLevelRef, lastWordTime, foundWords,
  leaderboard, rosterUsers, totalBoardWords, tournamentData, tournamentStandings, showTournamentStandings,
  setShowTournamentStandings, showExitConfirm, setShowExitConfirm, onExitRoom, onConfirmExit, onWordSubmit,
  onResetCombo, hints, earthquakeState, fireRoundActive, fireRoundRemaining, boardTheme, onShowTutorial,
  totalTime,
}): React.ReactElement | null => {
  // Get player's game history for trail display logic
  const { profile } = useAuth();

  // Sound effects for MP Blast board cleared celebration
  const { playEpicVictorySound } = useSoundEffects();

  // Game mode state from Zustand
  const gameMode = useGameMode();
  const gameModeConfirmed = useGameModeConfirmed();
  const gameDuration = useGameStore((s) => s.gameDuration);
  const setBlastBoardClearedByLocal = useGameStore((s) => s.setBlastBoardClearedByLocal);

  // Mode-overlay state subscribed inside InGameScreen — keeps this view
  // from re-rendering on irrelevant store updates when gameMode isn't classic.

  const { pendingWords, enqueuePending, dismissPending } = useRoundPendingWords(socket, username);

  const mpExit = useMpExit();
  const { isReconnecting, reconnectAttempt, maxReconnectAttempts, isServerUpdating, showAbortModal, triggerAbort } =
    useReconnectFlow({ gameCode, username, gameActive });

  const handleContinueSolo = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mp_solo_handoff', JSON.stringify({ grid: letterGrid, gameCode }));
    }
    mpExit('continue-solo');
  }, [mpExit, letterGrid, gameCode]);

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

  // Desktop 3-column chassis (≥1024px + flag): wraps each mode's canvas with
  // roster/words/insight rails instead of a mobile grid floating in empty space.
  const shellEnabled = useDesktopShellEnabled();
  // Live Vocab Quiz rooms replace the board entirely.
  const isVocabQuizRoom = useIsVocabQuizRoom(socket);

  // Wait for server to confirm mode before rendering — prevents one-frame classic flash
  // caused by the host handler setting tableData (React state) and gameMode (Zustand)
  // in separate calls, producing two render cycles.
  if (!gameModeConfirmed) return null;

  // Live Vocab Quiz — a classroom question round with no letter grid at all, so
  // it renders before the grid guard. Detected from the server's quiz traffic
  // rather than `gameMode`: the quiz is deliberately not a member of the
  // GameMode union (see shared/types/vocabQuiz), and the start payload that
  // mounts this view therefore carries a placeholder board mode.
  if (isVocabQuizRoom) {
    return <VocabQuizView socket={socket} username={username} t={t} />;
  }

  // Wheel-rush has no letter grid — render dedicated view before grid guard
  if (gameMode === 'wheel-rush') {
    const wheelCanvas = (
      <WheelRushView
        socket={socket}
        username={username}
        leaderboard={leaderboard}
        onQuit={onExitRoom}
        t={t}
        remainingTime={remainingTime}
        isDesktopCanvas={shellEnabled}
      />
    );
    if (shellEnabled) {
      return (
        <div className={getMpInGameContainerClass(gameMode)}>
          <MpDesktopShellFrame
            gameMode={gameMode}
            canvas={wheelCanvas}
            leaderboard={leaderboard}
            users={rosterUsers}
            foundWords={foundWords}
            socket={socket}
            meId={username}
            roomId={gameCode}
            remainingTime={remainingTime}
            totalTime={totalTime}
          />
        </div>
      );
    }
    return wheelCanvas;
  }

  // Word Tower versus — per-player towers, no shared grid
  if (gameMode === 'word-tower') {
    return <WordTowerVersus socket={socket} username={username} onQuit={onExitRoom} />;
  }

  // Sealed Bid — secret auction bids, no letter grid
  if (gameMode === 'sealed-bid') {
    return <SealedBidVersus socket={socket} username={username} onQuit={onExitRoom} />;
  }

  // Crossword race — all players solve the same puzzle, no letter grid
  if (gameMode === 'crossword') {
    return <CrosswordVersus socket={socket} username={username} onQuit={onExitRoom} />;
  }

  // Use letterGrid or shufflingGrid
  const effectiveGrid = letterGrid || shufflingGrid;

  // Show placeholder if no grid — non-interactive skeleton so users don't
  // rage-click inert tiles while startGame is in flight.
  if (!effectiveGrid) {
    return (
      <div className={getMpInGamePlaceholderClass()}>
        <div className="w-full max-w-2xl aspect-square grid grid-cols-4 gap-3 p-4 pointer-events-none" aria-label="Loading board">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="aspect-square rounded-xl bg-slate-700/50 text-white animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // The active mode's game component. On desktop it becomes the shell's center
  // slot; on mobile/tablet it's rendered directly.
  const roundTotal = totalTime ?? (gameDuration || 0);
  const gameCanvas = gameMode === 'blast' ? (
        <MpBlastCanvas
          grid={effectiveGrid}
          username={username}
          socket={socket}
          totalTime={roundTotal}
          onQuit={onExitRoom}
          onWordWithComboType={handleBlastWordWithCombo}
          onBoardCleared={handleMPBoardCleared}
        />
      ) : gameMode === 'word-hunt' ? (
          <WordHuntGame
            grid={effectiveGrid}
            gameLanguage={gameLanguage}
            leaderboard={leaderboard}
            username={username}
            score={leaderboard.find(p => p.username === username)?.score ?? 0}
            onQuit={onExitRoom}
            onWordSubmit={onWordSubmit}
            onWordHuntGuess={handleWordHuntGuess}
            gameActive={gameActive}
            minWordLength={minWordLength}
            socket={socket}
            foundWords={foundWords}
            mpChrome
          />
      ) : (
        <InGameScreen
          // Core identity
          username={username}
          gameCode={gameCode}
          isHost={false}
          isPlaying={true}
          mpChrome
          gameplayFocusMode={true}
          t={t}
          dir={dir}
          socket={socket}

          // Game state
          letterGrid={effectiveGrid}
          remainingTime={remainingTime}
          timerValue={gameDuration ? gameDuration / 60 : 2}
          gameActive={gameActive}
          showStartAnimation={showStartAnimation}
          gameLanguage={gameLanguage}
          minWordLength={minWordLength}
          comboLevel={comboLevel}
          comboLevelRef={comboLevelRef}
          lastWordTime={lastWordTime}

          // Player data
          foundWords={foundWords}
          leaderboard={leaderboard}
          totalBoardWords={totalBoardWords}

          // Callbacks
          onExitRoom={onExitRoom}
          onWordSubmit={onWordSubmit}
          onResetCombo={onResetCombo}

          // Tournament
          tournamentData={tournamentData}

          // Hints
          hints={hints}

          // Earthquake/Fire Round
          earthquakeState={earthquakeState}
          fireRoundActive={fireRoundActive}
          fireRoundRemaining={fireRoundRemaining}

          // Board theme
          boardTheme={boardTheme}

          // Game mode overlays
          gameMode={gameMode ?? undefined}
          onWordHuntGuess={handleWordHuntGuess}

          // Player experience (for keyboard trail inactivity threshold)
          totalGamesPlayed={profile?.total_games}

          // Tutorial callback
          onShowTutorial={onShowTutorial}
        />
      );

  const roundFrame = isRoundFrameMode(gameMode);

  return (
    <div className={roundFrame ? MP_ROUND_CONTAINER_CLASS : getMpInGameContainerClass(gameMode)}>
      {/* Classic, word-hunt and blast: the one round frame (HUD / roster /
          board, phone and desktop). */}
      {roundFrame ? (
        <MpRoundShell
          desktopShell={shellEnabled}
          roomId={gameCode}
          meId={username}
          gameMode={gameMode}
          remainingTime={remainingTime}
          totalTime={roundTotal || null}
          leaderboard={leaderboard}
          users={rosterUsers}
          foundWords={foundWords}
          comboLevel={comboLevel}
          revealed={!showStartAnimation}
          onExit={onExitRoom}
          canvas={gameCanvas}
          socket={socket}
        />
      ) : (
        gameCanvas
      )}

      <PendingWordChips pendingWords={pendingWords} dismissPending={dismissPending} />

      <PlayerRoundDialogs
        t={t}
        tournamentData={tournamentData}
        tournamentStandings={tournamentStandings}
        showTournamentStandings={showTournamentStandings}
        setShowTournamentStandings={setShowTournamentStandings}
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        onConfirmExit={onConfirmExit}
      />

      {isReconnecting && gameActive && (
        <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />
      )}
      {showAbortModal && (
        <MPGameAbortedModal wordCount={foundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onExitRoom} />
      )}

    </div>
  );
});

// Display name for debugging
PlayerInGameView.displayName = 'PlayerInGameView';

export default PlayerInGameView;
