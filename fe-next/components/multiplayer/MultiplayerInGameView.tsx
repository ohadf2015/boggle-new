'use client';

import React, { memo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';
import { Button } from '../ui/button';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import TournamentStandings from '../TournamentStandings';
import InGameScreen from '../game/InGameScreen';
import { useBlastMultiplayerBridge } from '@/components/blast/hooks/useBlastMultiplayerBridge';

// Mode-specific game views are split into per-route chunks. Only the active
// mode's bundle is downloaded — non-blast rooms don't pay for BlastGame's
// 528 lines + Pixi/blast-specific deps, etc. ssr:false because each view
// uses client-only hooks (sockets, sound effects, framer-motion).
const BlastGame = dynamic(
  () => import('@/components/blast/BlastGame').then(m => m.BlastGame),
  { ssr: false },
);
const WordHuntGame = dynamic(
  () => import('@/components/wordhunt/WordHuntGame').then(m => m.WordHuntGame),
  { ssr: false },
);
const WheelRushView = dynamic(
  () => import('@/components/multiplayer/WheelRushView').then(m => m.WheelRushView),
  { ssr: false },
);
import type {
  Language,
  LetterGrid,
  Avatar as AvatarType,
  PresenceStatus,
  TournamentStanding,
} from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { BoardTheme } from '@/shared/types/socket';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { OpponentWordFeed } from '@/components/multiplayer/OpponentWordFeed';
import { useOpponentWordFeed } from '@/hooks/useOpponentWordFeed';
import {
  useGameMode,
  useBlastTileOverlay,
  useWordHuntTargetLength,
  useWordHuntMyLife,
  useWordHuntTargetAttempts,
  useWordHuntTargetFound,
  useWordHuntPlayerLives,
  useWordHuntEliminatedPlayers,
} from '@/hooks/gameState/store';

// ==================== Types ====================

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

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
  comboBonus?: number;
  fireRoundBonus?: number;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: AvatarType;
  isHost?: boolean;
  isBot?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  disconnected?: boolean;
}

interface TournamentData {
  name?: string;
  currentRound?: number;
  totalRounds?: number;
  status?: 'created' | 'in-progress' | 'completed' | 'cancelled';
}

export interface MultiplayerInGameViewProps {
  // Role
  isHost: boolean;

  // Core props
  username: string;
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  dir?: 'rtl' | 'ltr';
  socket: Socket | null;

  // Game state
  letterGrid: LetterGrid | null;
  shufflingGrid?: LetterGrid | null;
  gameActive: boolean;
  showStartAnimation: boolean;
  remainingTime: number | null;
  gameLanguage: Language | null;
  minWordLength: number;
  comboLevel: number;
  comboLevelRef: React.RefObject<number>;
  comboTimeRemaining?: number | null;
  comboDanger?: boolean;
  timerValue?: number;

  // Player data
  foundWords: FoundWord[];
  leaderboard: LeaderboardEntry[];
  totalBoardWords?: number | null;

  // Tournament (player-only, optional)
  tournamentData?: TournamentData | null;
  tournamentStandings?: TournamentStanding[];
  showTournamentStandings?: boolean;
  setShowTournamentStandings?: (show: boolean) => void;

  // UI state (player-only exit confirm, optional)
  showExitConfirm?: boolean;
  setShowExitConfirm?: (show: boolean) => void;

  // Callbacks
  onExitRoom?: () => void;
  onStopGame?: () => void;
  onConfirmExit?: () => void;
  onWordSubmit: (word: string) => void;
  onResetCombo?: () => void;

  // Hints (player single-player mode)
  hints?: HintsState;

  // Earthquake/Fire Round
  earthquakeState?: EarthquakeState;
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;

  // Board theme
  boardTheme?: BoardTheme | null;

  // Tutorial callback (player-only)
  onShowTutorial?: () => void;

  // Blast multiplayer: total game duration
  totalTime?: number;
}

// ==================== Component ====================

/**
 * MultiplayerInGameView - Unified in-game view for both host and player.
 * Routes to BlastGame, WordHuntGame, or InGameScreen based on game mode.
 * Role-specific features (tournament modal, exit dialog) are conditionally rendered.
 */
const MultiplayerInGameView = memo<MultiplayerInGameViewProps>(({
  // Role
  isHost,

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
  comboTimeRemaining,
  comboDanger,
  timerValue,

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
  onStopGame,
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

  // Tutorial
  onShowTutorial,

  // Blast
  totalTime,
}): React.ReactElement => {
  const { profile } = useAuth();

  // Game mode state from Zustand
  const gameMode = useGameMode();
  const blastTileOverlay = useBlastTileOverlay();
  const wordHuntTargetLength = useWordHuntTargetLength();
  const wordHuntLife = useWordHuntMyLife();
  const wordHuntAttempts = useWordHuntTargetAttempts();
  const wordHuntFound = useWordHuntTargetFound();
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();

  // Opponent word feed for classic mode
  const { feedItems: opponentFeedItems } = useOpponentWordFeed({ socket, currentPlayerName: username });

  // Effective grid (player may have shufflingGrid fallback)
  const effectiveGrid = letterGrid || shufflingGrid || null;

  const noop = useCallback(() => {}, []);

  // Blast multiplayer bridge
  const blastBridge = useBlastMultiplayerBridge({
    letterGrid: effectiveGrid,
    gridSize: effectiveGrid?.[0]?.length ?? 4,
  });

  // Blast: emit word + comboType to server
  const handleBlastWordWithCombo = useCallback(
    (word: string, comboType: string | null) => {
      if (!socket) return;
      socket.emit('submitWord', { word, comboType });
    },
    [socket],
  );

  // Word hunt guess handler
  const handleWordHuntGuess = useCallback(
    (guess: string) => {
      if (!socket) return;
      socket.emit('submitTargetWord', { guess });
    },
    [socket],
  );

  // Tournament standings close handler
  const handleCloseTournamentStandings = useCallback(() => {
    setShowTournamentStandings?.(false);
  }, [setShowTournamentStandings]);

  // Quit handler — host uses onStopGame, player uses onExitRoom
  const handleQuit = useCallback(() => {
    (onStopGame ?? onExitRoom)?.();
  }, [onStopGame, onExitRoom]);

  // Wheel Rush mode — no letter grid; render before grid placeholder guard
  if (gameMode === 'wheel-rush') {
    return (
      <WheelRushView
        socket={socket}
        username={username}
        leaderboard={leaderboard}
        onQuit={handleQuit}
        t={t}
      />
    );
  }

  // No grid placeholder (player-only edge case)
  if (!effectiveGrid) {
    return (
      <div
        className="flex-1 flex flex-col min-h-0 bg-neo-cream dark:bg-neo-navy p-4 items-center justify-center"
        role="status"
        aria-busy="true"
        aria-label={t('common.loading')}
      >
        <div className="w-full max-w-2xl aspect-square grid grid-cols-4 gap-3 p-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={`tile-${i}`}
              className="aspect-square rounded-xl bg-slate-700/50 text-white animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Blast mode
  if (gameMode === 'blast') {
    return (
      <BlastGame
        config={blastBridge.config}
        mode="multiplayer"
        remainingTime={remainingTime}
        totalTime={totalTime}
        leaderboard={leaderboard}
        username={username}
        onGameEnd={noop} /* Server controls game end */
        onQuit={handleQuit}
        onWordWithComboType={handleBlastWordWithCombo}
        initialTileStates={blastBridge.initialTileStates}
        blastSeed={blastBridge.blastSeed}
        waveNumber={blastBridge.waveNumber}
      />
    );
  }

  // Word Hunt mode
  if (gameMode === 'word-hunt') {
    return (
      <WordHuntGame
        grid={effectiveGrid}
        gameLanguage={gameLanguage}
        leaderboard={leaderboard}
        username={username}
        score={leaderboard.find(p => p.username === username)?.score ?? 0}
        onQuit={handleQuit}
        onWordSubmit={onWordSubmit}
        onWordHuntGuess={handleWordHuntGuess}
        gameActive={gameActive}
        minWordLength={minWordLength}
        socket={socket}
        foundWords={foundWords}
      />
    );
  }

  // Classic mode — InGameScreen
  return (
    <div
      className={cn(
        'flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300',
        'bg-neo-cream dark:bg-neo-navy p-0 md:p-4',
      )}
    >
      <div className="relative flex-1 flex flex-col min-h-0">
        <OpponentWordFeed feedItems={opponentFeedItems} t={t} />
        <InGameScreen
          // Core identity
          username={username}
          gameCode={gameCode}
          isHost={isHost}
          isPlaying={true}
          gameplayFocusMode={true}
          t={t}
          dir={dir}
          socket={socket}
          // Game state
          letterGrid={effectiveGrid}
          remainingTime={remainingTime}
          timerValue={timerValue ?? 2}
          gameActive={gameActive}
          showStartAnimation={showStartAnimation}
          gameLanguage={gameLanguage}
          minWordLength={minWordLength}
          comboLevel={comboLevel}
          comboLevelRef={comboLevelRef}
          comboTimeRemaining={comboTimeRemaining}
          comboDanger={comboDanger}
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
          blastTileOverlay={blastTileOverlay}
          wordHuntTargetLength={wordHuntTargetLength}
          wordHuntAttempts={wordHuntAttempts}
          wordHuntFound={wordHuntFound}
          wordHuntLife={wordHuntLife}
          wordHuntPlayerLives={wordHuntPlayerLives}
          wordHuntEliminatedPlayers={wordHuntEliminatedPlayers}
          onWordHuntGuess={handleWordHuntGuess}
          // Player experience
          totalGamesPlayed={profile?.total_games}
          // Tutorial
          onShowTutorial={onShowTutorial}
        />
      </div>

      {/* Tournament Standings Modal (player-only) */}
      {!isHost && tournamentStandings && setShowTournamentStandings && (
        <Dialog
          open={showTournamentStandings}
          onOpenChange={setShowTournamentStandings}
        >
          <DialogContent
            noDescription
            className="max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain scrollable-area bg-white text-neo-black dark:bg-slate-800 dark:text-white border-purple-500/30"
          >
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-black text-neo-pink dark:text-neo-pink">
                {tournamentData?.status === 'completed'
                  ? t('hostView.tournamentComplete')
                  : t('hostView.tournamentStandings')}
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
      )}

      {/* Exit Confirmation Dialog (player-only) */}
      {!isHost && setShowExitConfirm && onConfirmExit && (
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
      )}
    </div>
  );
});

MultiplayerInGameView.displayName = 'MultiplayerInGameView';

function MultiplayerInGameViewWithErrorBoundary(props: MultiplayerInGameViewProps) {
  return (
    <FeatureErrorBoundary featureName="Multiplayer" showHomeButton={true}>
      <MultiplayerInGameView {...props} />
    </FeatureErrorBoundary>
  );
}

export default MultiplayerInGameViewWithErrorBoundary;
