'use client';

import React, { useMemo, memo, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import ExitRoomButton from '../../components/ExitRoomButton';
import HintButton from '../../components/HintButton';
import TournamentStandings from '../../components/TournamentStandings';
import InGameScreen from '../../components/game/InGameScreen';
import type { LetterGrid, Language, Avatar as AvatarType, TournamentStanding } from '@/shared/types/game';
import type { BoardTheme } from '@/shared/types/socket';
import { useAuth } from '@/contexts/AuthContext';

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
  /** Time remaining for combo as percentage (0-100), null when no active combo */
  comboTimeRemaining?: number | null;
  /** Whether combo timer is in danger zone (<30% remaining) */
  comboDanger?: boolean;

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
  setWord: (word: string) => void;
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
  comboTimeRemaining,
  comboDanger,

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
}): React.ReactElement => {
  // Get player's game history for trail display logic
  const { profile } = useAuth();

  // Memoized handler for closing tournament standings
  const handleCloseTournamentStandings = useCallback(() => {
    setShowTournamentStandings(false);
  }, [setShowTournamentStandings]);

  // Use letterGrid or shufflingGrid
  const effectiveGrid = letterGrid || shufflingGrid;

  // Show placeholder if no grid
  if (!effectiveGrid) {
    return (
      <div className="min-h-dvh bg-neo-cream dark:bg-neo-navy p-4 flex items-center justify-center">
        <div className="w-full max-w-2xl aspect-square grid grid-cols-4 gap-3 p-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-slate-700/50 text-white animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-neo-cream dark:bg-neo-navy p-0 md:p-4 flex flex-col transition-colors duration-300">

      {/* Top Bar - Desktop only */}
      <div className="hidden lg:flex w-full max-w-7xl mx-auto items-center justify-between mb-1 pt-2">
        <ExitRoomButton onClick={onExitRoom} label={t('playerView.exit')} className="relative z-[60]" />

        {/* Hint Button - Single Player Mode Only */}
        {hints && hints.isSinglePlayer && (
          <HintButton
            hint={hints.hint}
            hintType={hints.hintType}
            hintsRemaining={hints.hintsRemaining}
            wordLength={hints.wordLength}
            firstLetter={hints.firstLetter}
            isLoading={hints.isLoading}
            error={hints.error}
            isAvailable={hints.isAvailable}
            isSinglePlayer={hints.isSinglePlayer}
            gameActive={gameActive}
            onRequestHint={hints.requestHint}
            onClearHint={hints.clearHint}
            t={t}
          />
        )}
      </div>

      {/* Main Game Content */}
      <InGameScreen
        // Core identity
        username={username}
        gameCode={gameCode}
        isHost={false}
        isPlaying={true}
        gameplayFocusMode={true}
        t={t}
        dir={dir}
        socket={socket}

        // Game state
        letterGrid={effectiveGrid}
        remainingTime={remainingTime}
        timerValue={3} // Default 3 minutes, will be overridden by server
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

        // Player experience (for keyboard trail inactivity threshold)
        totalGamesPlayed={profile?.total_games}

        // Tutorial callback
        onShowTutorial={onShowTutorial}
      />

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
