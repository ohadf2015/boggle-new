'use client';

import React, { memo, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import TournamentStandings from '../../components/TournamentStandings';
import InGameScreen from '../../components/game/InGameScreen';
import { BlastGame } from '@/components/blast/BlastGame';
import { useBlastMultiplayerBridge } from '@/components/blast/hooks/useBlastMultiplayerBridge';
import { WordHuntGame } from '@/components/wordhunt/WordHuntGame';
import type { LetterGrid, Language, Avatar as AvatarType, TournamentStanding } from '@/shared/types/game';
import type { BoardTheme } from '@/shared/types/socket';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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

  // Blast multiplayer
  totalTime,
}): React.ReactElement => {
  // Get player's game history for trail display logic
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

  // Blast multiplayer bridge — converts Zustand state to BlastGame props
  const blastBridge = useBlastMultiplayerBridge({
    letterGrid: letterGrid || shufflingGrid,
    gridSize: (letterGrid || shufflingGrid)?.[0]?.length ?? 4,
  });

  // Blast multiplayer: emit word + comboType to server via socket
  const handleBlastWordWithCombo = useCallback((word: string, comboType: string | null) => {
    if (!socket) return;
    socket.emit('submitWord', { word, comboType });
  }, [socket]);

  // Word hunt guess handler — emits to server
  const handleWordHuntGuess = useCallback((guess: string) => {
    if (!socket) return;
    socket.emit('submitTargetWord', { guess });
  }, [socket]);

  // Memoized handler for closing tournament standings
  const handleCloseTournamentStandings = useCallback(() => {
    setShowTournamentStandings(false);
  }, [setShowTournamentStandings]);

  // Use letterGrid or shufflingGrid
  const effectiveGrid = letterGrid || shufflingGrid;

  // Show placeholder if no grid
  if (!effectiveGrid) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-neo-cream dark:bg-neo-navy p-4 items-center justify-center">
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
    <div className={cn(
      'flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300',
      gameMode === 'blast' ? 'bg-neo-navy p-0' : 'bg-neo-cream dark:bg-neo-navy p-0 md:p-4'
    )}>


      {/* Main Game Content — Blast/WordHunt use dedicated components, others use InGameScreen */}
      {gameMode === 'blast' ? (
          <BlastGame
            config={blastBridge.config}
            mode="multiplayer"
            remainingTime={remainingTime}
            totalTime={totalTime}
            leaderboard={leaderboard}
            username={username}
            onGameEnd={() => {/* Server controls game end in multiplayer */}}
            onQuit={onExitRoom}
            onWordWithComboType={handleBlastWordWithCombo}
            initialTileStates={blastBridge.initialTileStates}
            blastSeed={blastBridge.blastSeed}
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
          />
      ) : (
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
          timerValue={3}
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

          // Player experience (for keyboard trail inactivity threshold)
          totalGamesPlayed={profile?.total_games}

          // Tutorial callback
          onShowTutorial={onShowTutorial}
        />
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
