'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';
import { Button } from '../ui/button';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { getCurrentSeasonDynamic } from '@/lib/seasons';
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
import { useBlastMultiplayerBridge } from '@/components/blast/legacy/hooks/useBlastMultiplayerBridge';
import { useDesktopShellEnabled } from '@/hooks/useDesktopShellEnabled';
import { StandardDesktopAdapter } from './desktop/StandardDesktopAdapter';
import { WheelRushDesktopAdapter } from './desktop/WheelRushDesktopAdapter';
import { WordHuntDesktopAdapter } from './desktop/WordHuntDesktopAdapter';
import { BlastDesktopAdapter } from './desktop/BlastDesktopAdapter';

// Mode-specific game views are split into per-route chunks. Only the active
// mode's bundle is downloaded — non-blast rooms don't pay for BlastGame's
// 528 lines + Pixi/blast-specific deps, etc. ssr:false because each view
// uses client-only hooks (sockets, sound effects, framer-motion).
const BlastGame = dynamic(
  () => import('@/components/blast/legacy/BlastGame').then(m => m.BlastGame),
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
import { getComboMultiplier } from '@/shared/utils/scoring';
import { useAuth } from '@/contexts/AuthContext';
import { OpponentWordFeedConnected } from '@/components/multiplayer/OpponentWordFeedConnected';
import { useGameMode, useGameStore } from '@/hooks/gameState/store';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameTimer } from '@/hooks/useGameTimer';

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
  inputMethod?: 'kb' | 'drag';
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
  /**
   * Timestamp of the last accepted word. The combo-window countdown lives in
   * `ComboDisplayConnected` (see InGameScreen) — we forward the trigger, not
   * the derived state.
   */
  lastWordTime?: number | null;
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

/**
 * Teaching in multiplayer now happens on the board itself (BoardHandCoach),
 * not through a blocking overlay.
 *
 * The old DirectionsTutorialOverlay disabled its own continue button for ten
 * seconds and froze the LOCAL clock — but a multiplayer round is timed by the
 * server, so a first-time player was locked out of a competitive round while it
 * kept counting down against them.
 */
function WithTutorial({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
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
  lastWordTime,
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

  // Only gameMode at root — mode-specific overlay state subscribed by
  // InGameScreen directly so this component doesn't re-render on irrelevant
  // word-hunt/blast store updates.
  const gameMode = useGameMode();

  // Server-authoritative timer: the prop carries the latest `timeUpdate`, but we
  // mirror it through useGameTimer so the display ticks smoothly between 1 Hz
  // server broadcasts and snaps back into sync after reconnect / background tab.
  const { remainingTime: syncedRemainingTime, setTime: setSyncedTime } = useGameTimer({
    initialTime: totalTime ?? remainingTime ?? 180,
    isPaused: !gameActive || remainingTime == null,
    autoStart: false,
    onTimeUp: () => {
      // The server owns game end; this local callback is only for display safety.
    },
  });

  // Sync whenever the parent re-renders with a fresh server reading.
  useEffect(() => {
    if (remainingTime != null) {
      setSyncedTime(remainingTime);
    }
  }, [remainingTime, setSyncedTime]);

  // Also listen directly to socket time updates so we stay in sync even if the
  // parent batches or delays prop updates (reconnect resends, tab wake).
  useEffect(() => {
    if (!socket) return;
    const handleTimeUpdate = (data: { remainingTime?: number }) => {
      if (data.remainingTime !== undefined) {
        setSyncedTime(data.remainingTime);
      }
    };
    socket.on('timeUpdate', handleTimeUpdate);
    return () => {
      socket.off('timeUpdate', handleTimeUpdate);
    };
  }, [socket, setSyncedTime]);

  // Desktop shell routing (standard mode only)
  const shellEnabled = useDesktopShellEnabled();

  // Opponent feed state lives inside the feed components themselves
  // (OpponentWordFeedConnected / OpponentInsightFeedConnected) — pushing the
  // `useOpponentWordFeed` subscription out of this parent stops socket bursts
  // of opponent words from re-rendering the whole game shell mid-drag.

  // Memoize the leaderboard → RosterPlayer and foundWords → LadderWord
  // mappings. Without these useMemos every parent re-render (timer tick at
  // ~1Hz, combo updates, etc.) allocated brand-new arrays which then broke
  // memo on RosterRail / WordsLadder / MyStatsCard / OpponentInsightFeed,
  // causing the whole desktop shell to re-render on every tick — visible as
  // sluggish word-accept feedback in multiplayer classic.
  const rosterPlayers = useMemo(
    () => leaderboard.map(entry => ({
      userId: entry.username ?? '',
      username: entry.username,
      score: entry.score,
      wordCount: entry.wordCount,
      status: entry.disconnected ? ('disconnected' as const) : ('connected' as const),
      isYou: entry.username === username,
      customAvatar: entry.avatar?.customAvatar ?? null,
    })),
    [leaderboard, username],
  );
  const ladderWords = useMemo(
    () => foundWords.map(fw => ({
      word: fw.word,
      score: fw.score ?? 0,
      ts: fw.timestamp ?? 0,
      userId: username,
      inputMethod: fw.inputMethod ?? 'drag',
    })),
    [foundWords, username],
  );

  // Effective grid (player may have shufflingGrid fallback)
  const effectiveGrid = letterGrid || shufflingGrid || null;

  const noop = useCallback(() => {}, []);
  const [fogProgress, setFogProgress] = useState(0);

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

  // Sound effects for MP Blast board cleared celebration
  const { playEpicVictorySound } = useSoundEffects();
  const setBlastBoardClearedByLocal = useGameStore((s) => s.setBlastBoardClearedByLocal);

  // Blast multiplayer: local player cleared the shared board
  const handleMPBoardCleared = useCallback(() => {
    setBlastBoardClearedByLocal(true);
    playEpicVictorySound();
  }, [setBlastBoardClearedByLocal, playEpicVictorySound]);

  // Wheel Rush mode — no letter grid; render before grid placeholder guard.
  // Mobile-only fallback: desktop path is handled by WheelRushDesktopAdapter below.
  if (gameMode === 'wheel-rush' && !shellEnabled) {
    return (
      <WithTutorial>
        <WheelRushView
          socket={socket}
          username={username}
          leaderboard={leaderboard}
          onQuit={handleQuit}
          t={t}
          remainingTime={syncedRemainingTime}
          totalTime={totalTime ?? undefined}
          gameLanguage={gameLanguage}
        />
      </WithTutorial>
    );
  }

  // No grid placeholder (player-only edge case)
  if (!effectiveGrid) {
    return (
      <WithTutorial>
        <div
          className="flex-1 flex flex-col min-h-0 bg-neo-navy p-4 items-center justify-center"
          role="status"
          aria-busy="true"
          aria-label={t('common.loading')}
        >
          <div className="w-full max-w-2xl aspect-square grid grid-cols-4 gap-3 p-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={`tile-${i}`}
              className="aspect-square rounded-xl bg-neo-navy-elevated/50 text-white animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
      </WithTutorial>
    );
  }

  // Desktop shell for classic mode
  if (shellEnabled && gameMode === 'classic') {
    // rosterPlayers + ladderWords are memoized at the top of the component
    // (see useMemo above) so timer-driven re-renders don't churn referential
    // identity and trash downstream memo boundaries.

    // Build InGameScreen props object
    const inGameScreenProps = {
      // Core identity
      username,
      gameCode,
      isHost,
      isPlaying: true,
      gameplayFocusMode: true,
      t,
      dir,
      socket,
      // Game state
      letterGrid: effectiveGrid,
      remainingTime: syncedRemainingTime,
      timerValue: timerValue ?? 2,
      gameActive,
      showStartAnimation,
      gameLanguage,
      minWordLength,
      comboLevel,
      comboLevelRef,
      lastWordTime,
      // Player data
      foundWords,
      leaderboard,
      totalBoardWords,
      // Callbacks
      onExitRoom,
      onWordSubmit,
      onResetCombo,
      // Tournament
      tournamentData,
      // Hints
      hints,
      // Earthquake/Fire Round
      earthquakeState,
      fireRoundActive,
      fireRoundRemaining,
      // Board theme
      boardTheme,
      // Game mode overlays
      gameMode: gameMode ?? undefined,
      onWordHuntGuess: handleWordHuntGuess,
      // Player experience
      totalGamesPlayed: profile?.total_games,
      // Tutorial
      onShowTutorial,
      // Desktop shell integration
      inDesktopShell: true,
    };

    return (
      <WithTutorial>
        <StandardDesktopAdapter
          roomId={gameCode}
          leaderboard={rosterPlayers}
          foundWords={ladderWords}
          remainingTime={syncedRemainingTime ?? 0}
          totalTime={totalTime ?? 180}
          meId={username}
          socket={socket}
          canvas={<InGameScreen {...inGameScreenProps} />}
        />
      </WithTutorial>
    );
  }

  // Desktop shell for wheel-rush mode
  // TypeScript doesn't narrow properly on 'wheel-rush' variant in some builds,
  // but the runtime value is correct (validated in backend/modules/gameModeSelector.ts)
  if ((gameMode as string) === 'wheel-rush' && shellEnabled) {
    // rosterPlayers + ladderWords memoized at top of component.

    const wheelRushProps = {
      socket,
      username,
      leaderboard,
      onQuit: handleQuit,
      t,
      remainingTime: syncedRemainingTime,
      onFogProgressChange: setFogProgress,
      gameLanguage,
    };

    return (
      <WithTutorial>
        <WheelRushDesktopAdapter
          roomId={gameCode}
          leaderboard={rosterPlayers}
          foundWords={ladderWords}
          remainingTime={syncedRemainingTime ?? 0}
          totalTime={totalTime ?? 60}
          fogProgress={fogProgress}
          meId={username}
          socket={socket}
          canvas={<WheelRushView {...wheelRushProps} isDesktopCanvas />}
        />
      </WithTutorial>
    );
  }

  // Desktop shell for word-hunt mode
  if ((gameMode as string) === 'word-hunt' && shellEnabled) {
    // rosterPlayers + ladderWords memoized at top of component.

    const wordHuntGameProps = {
      grid: effectiveGrid,
      gameLanguage,
      leaderboard,
      username,
      score: leaderboard.find(p => p.username === username)?.score ?? 0,
      onQuit: handleQuit,
      onWordSubmit,
      onWordHuntGuess: handleWordHuntGuess,
      gameActive,
      minWordLength,
      socket,
      foundWords,
    };

    return (
      <WithTutorial>
        <WordHuntDesktopAdapter
          roomId={gameCode}
          leaderboard={rosterPlayers}
          foundWords={ladderWords}
          remainingTime={syncedRemainingTime ?? 0}
          totalTime={totalTime ?? 180}
          targetCategory=""
          meId={username}
          socket={socket}
          canvas={<WordHuntGame {...wordHuntGameProps} />}
        />
      </WithTutorial>
    );
  }

  // Blast mode — desktop shell + mobile fallback
  if (gameMode === 'blast') {
    const blastCanvas = (
      <BlastGame
        config={blastBridge.config}
        mode="multiplayer"
        remainingTime={syncedRemainingTime}
        totalTime={totalTime}
        leaderboard={leaderboard}
        username={username}
        onGameEnd={noop} /* Server controls game end */
        onMPBoardCleared={handleMPBoardCleared}
        onQuit={handleQuit}
        onWordWithComboType={handleBlastWordWithCombo}
        initialTileStates={blastBridge.initialTileStates}
        blastSeed={blastBridge.blastSeed}
        serverGrid={blastBridge.serverGrid}
      />
    );
    if (shellEnabled) {
      // rosterPlayers + ladderWords memoized at top of component.
      return (
        <WithTutorial>
          <BlastDesktopAdapter
            roomId={gameCode}
            leaderboard={rosterPlayers}
            foundWords={ladderWords}
            remainingTime={syncedRemainingTime ?? 0}
            totalTime={totalTime ?? 60}
          meId={username}
          socket={socket}
          comboCount={comboLevel}
          comboMultiplier={getComboMultiplier(comboLevel)}
          canvas={blastCanvas}
        />
        </WithTutorial>
      );
    }
    return (
      <WithTutorial>
        {blastCanvas}
      </WithTutorial>
    );
  }

  // Word Hunt mode
  if (gameMode === 'word-hunt') {
    return (
      <WithTutorial>
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
      </WithTutorial>
    );
  }

  // Classic mode — InGameScreen. Subtle seasonal ambience on the wrapper bg.
  return (
    <WithTutorial>
      <div
        className={cn(
          'flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300',
          'bg-neo-navy p-0 md:p-4',
          getCurrentSeasonDynamic().gridSkinClass,
        )}
        translate="no"
      >
      <div className="relative flex-1 flex flex-col min-h-0">
        <OpponentWordFeedConnected socket={socket} currentPlayerName={username} t={t} />
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
          remainingTime={syncedRemainingTime}
          timerValue={timerValue ?? 2}
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
            className="max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain scrollable-area bg-white text-neo-black dark:bg-neo-navy-light dark:text-white border-purple-500/30"
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
                className="w-full bg-neo-pink text-neo-white font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
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
          <AlertDialogContent className="bg-neo-navy-light text-neo-white border-neo-thick border-neo-black shadow-hard-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-neo-white">
                {t('playerView.exitConfirmation')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                {t('playerView.exitWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-neo-navy-elevated text-neo-white border-slate-600">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirmExit}
                className="bg-neo-red text-neo-white font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
              >
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
    </WithTutorial>
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
