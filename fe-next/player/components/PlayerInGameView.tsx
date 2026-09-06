'use client';

import React, { memo, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import TournamentStandings from '../../components/TournamentStandings';
import dynamic from 'next/dynamic';
import InGameScreen from '../../components/game/InGameScreen';
import { useBlastMultiplayerBridge } from '@/components/blast/legacy/hooks/useBlastMultiplayerBridge';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

const BlastGame = dynamic(
  () => import('@/components/blast/legacy/BlastGame').then(m => ({ default: m.BlastGame })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);
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
import { ShiritoriVersus } from '@/components/multiplayer/shiritori/ShiritoriVersus';
import { SealedBidVersus } from '@/components/multiplayer/sealedBid/SealedBidVersus';
import { CrosswordVersus } from '@/components/multiplayer/crossword/CrosswordVersus';
import type { LetterGrid, Language, Avatar as AvatarType, TournamentStanding } from '@/shared/types/game';
import type { BoardTheme } from '@/shared/types/socket';
import { getMpInGameContainerClass, getMpInGamePlaceholderClass } from '@/lib/multiplayer/inGameContainerClass';
import { useDesktopShellEnabled } from '@/hooks/useDesktopShellEnabled';
import { useIsVocabQuizRoom } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import { MpDesktopShellFrame, isShellMode } from '@/components/multiplayer/desktop/MpDesktopShellFrame';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGameMode,
  useGameModeConfirmed,
  useGameStore,
  useBlastBoardClearedByLocal,
} from '@/hooks/gameState/store';
import { usePendingWords } from '@/lib/multiplayer/usePendingWords';
import { useReconnectFlow } from '@/lib/multiplayer/useReconnectFlow';
import { PendingWordChip } from '@/components/multiplayer/PendingWordChip';
import { ReconnectingOverlay } from '@/components/multiplayer/ReconnectingOverlay';
import { MPGameAbortedModal } from '@/components/multiplayer/MPGameAbortedModal';
import { useRouter, useParams } from 'next/navigation';

// ==================== Hint Types ====================

interface HintsState {
  hint: string | null;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category' | null;
  hintsRemaining: number;
  wordLength?: number;
  firstLetter?: string;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  isSinglePlayer: boolean;
  requestHint: () => void;
  clearHint: () => void;
}

// ==================== Type Definitions ====================

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: AvatarType;
  isHost?: boolean;
  isBot?: boolean;
}

interface TournamentData {
  name?: string;
  currentRound?: number;
  totalRounds?: number;
  status?: 'created' | 'in-progress' | 'completed' | 'cancelled';
}

interface PlayerInGameViewProps {
  // Core props
  username: string;
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
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
  // Core props
  username,
  gameCode,
  t,
  dir,
  socket,

  // Game state
  letterGrid,
  shufflingGrid,
  gameActive,
  showStartAnimation,
  remainingTime,
  gameLanguage,
  minWordLength,
  comboLevel,
  comboLevelRef,
  lastWordTime,

  // Player data
  foundWords,
  leaderboard,
  totalBoardWords,

  // Tournament
  tournamentData,
  tournamentStandings,
  showTournamentStandings,
  setShowTournamentStandings,

  // UI state
  showExitConfirm,
  setShowExitConfirm,

  // Callbacks
  onExitRoom,
  onConfirmExit,
  onWordSubmit,
  onResetCombo,

  // Hints
  hints,

  // Earthquake/Fire Round
  earthquakeState,
  fireRoundActive,
  fireRoundRemaining,

  // Board theme
  boardTheme,

  // Tutorial callback
  onShowTutorial,

  // Blast multiplayer
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

  // Blast multiplayer bridge — converts Zustand state to BlastGame props
  const blastBridge = useBlastMultiplayerBridge({
    letterGrid: letterGrid || shufflingGrid,
    gridSize: (letterGrid || shufflingGrid)?.[0]?.length ?? 4,
  });

  const { pendingWords, enqueuePending, confirmPending, rejectPending, dismissPending, clearAll } = usePendingWords();

  const router = useRouter();
  const params = useParams();
  const { isReconnecting, reconnectAttempt, maxReconnectAttempts, isServerUpdating, showAbortModal, triggerAbort } =
    useReconnectFlow({ gameCode, username, gameActive });

  const handleContinueSolo = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mp_solo_handoff', JSON.stringify({ grid: letterGrid, gameCode }));
    }
    const locale = (params?.locale as string) || 'en';
    router.push(`/${locale}/singleplayer?mpHandoff=1`);
  }, [router, params, letterGrid, gameCode]);

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

  // Memoized handler for closing tournament standings
  const handleCloseTournamentStandings = useCallback(() => {
    setShowTournamentStandings(false);
  }, [setShowTournamentStandings]);

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

  // Shiritori — turn-based word chain, no letter grid
  if (gameMode === 'shiritori') {
    return <ShiritoriVersus socket={socket} username={username} onQuit={onExitRoom} />;
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
  const gameCanvas = gameMode === 'blast' ? (
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
            onQuit={onExitRoom}
            onWordWithComboType={handleBlastWordWithCombo}
            initialTileStates={blastBridge.initialTileStates}
            blastSeed={blastBridge.blastSeed}
            serverGrid={blastBridge.serverGrid}
            isDesktopCanvas={shellEnabled && isShellMode(gameMode)}
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
            isDesktopCanvas={shellEnabled && isShellMode(gameMode)}
          />
      ) : (
        <InGameScreen
          // Core identity
          username={username}
          gameCode={gameCode}
          isHost={false}
          isPlaying={true}
          inDesktopShell={shellEnabled && isShellMode(gameMode ?? '')}
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

  return (
    <div className={getMpInGameContainerClass(gameMode)}>
      {/* Desktop wraps the mode canvas in the 3-column shell (roster / game /
          words+insights); mobile/tablet renders the canvas directly. */}
      {shellEnabled && isShellMode(gameMode) ? (
        <MpDesktopShellFrame
          gameMode={gameMode}
          canvas={gameCanvas}
          leaderboard={leaderboard}
          foundWords={foundWords}
          socket={socket}
          meId={username}
          roomId={gameCode}
          remainingTime={remainingTime}
          totalTime={totalTime}
        />
      ) : (
        gameCanvas
      )}

      {/* Pending word chips — optimistic submit feedback */}
      {pendingWords.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-wrap gap-1 justify-center pointer-events-none">
          {Array.from(pendingWords.entries()).map(([word, status]) => (
            <PendingWordChip key={word} word={word} status={status} onDismiss={dismissPending} />
          ))}
        </div>
      )}

      {/* Tournament Standings Modal */}
      <Dialog open={showTournamentStandings} onOpenChange={setShowTournamentStandings}>
        <DialogContent noDescription className="max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain scrollable-area bg-white text-neo-black dark:bg-slate-800 dark:text-white border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black text-neo-pink dark:text-neo-pink">
              {tournamentData?.status === 'completed' ? t('hostView.tournamentComplete') : t('hostView.tournamentStandings')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TournamentStandings
              standings={tournamentStandings}
              currentRound={tournamentData?.currentRound ?? 0}
              totalRounds={tournamentData?.totalRounds ?? 0}
              isComplete={tournamentData?.status === 'completed'}
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseTournamentStandings}
              className="w-full bg-neo-pink text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isReconnecting && gameActive && (
        <ReconnectingOverlay attempt={reconnectAttempt} maxAttempts={maxReconnectAttempts} onGiveUp={triggerAbort} isServerUpdating={isServerUpdating} />
      )}
      {showAbortModal && (
        <MPGameAbortedModal wordCount={foundWords.length} boardSeed={gameCode} onContinueSolo={handleContinueSolo} onReturnToLobby={onExitRoom} />
      )}

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white text-neo-black dark:bg-slate-800 dark:text-white border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('playerView.exitConfirmation')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {t('playerView.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmExit}
              className="bg-neo-red text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

// Display name for debugging
PlayerInGameView.displayName = 'PlayerInGameView';

export default PlayerInGameView;
