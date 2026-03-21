'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo, useReducer } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import { useSocket } from '../utils/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useComboTimer } from './hooks/useComboTimer';
import { usePlayerMusic } from './hooks/usePlayerMusic';
import { useFirstTimeTracking } from './hooks/useFirstTimeTracking';
import { usePlayerExit } from './hooks/usePlayerExit';
import { usePlayerLobby } from './hooks/usePlayerLobby';
import { useAchievementQueue } from '../components/achievements';
import { usePresence } from '../hooks/usePresence';
import { useHints } from '../hooks/useHints';
import { useGameTimer } from '../hooks/useGameTimer';
import logger from '@/utils/logger';
import type { TournamentStanding } from '@/types';
import type {
  ViewTournamentData as TournamentData,
} from '@/shared/types/view';

// Extracted components
import PlayerWaitingView from './components/PlayerWaitingView';
import PlayerInGameView from './components/PlayerInGameView';
import FirstTimeAchievement, { useFirstTimeAchievement } from '../components/game/FirstTimeAchievement';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Loader2 } from 'lucide-react';

// Custom hooks
import usePlayerSocketEvents from './hooks/usePlayerSocketEvents';
import { resetComboState } from '@/shared/utils/comboUtils';
import {
  useFoundWords,
  useBoardTheme,
  useTotalBoardWords,
  useWaitingForResults,
  useLetterGrid,
  useShufflingGrid,
  useLeaderboard,
  useGameActions,
  useGameMode,
} from '@/hooks/gameState';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useHideNavigation } from '@/contexts/NavigationContext';

import type { Player, WordToVote, PlayerViewProps } from './types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// ==========================================
// Component
// ==========================================

/**
 * PlayerView - Main player component managing game state and views
 * Memoized to prevent unnecessary re-renders from parent updates
 */
const PlayerView: React.FC<PlayerViewProps> = memo(({
  onShowResults,
  initialPlayers = [],
  username,
  gameCode,
  pendingGameStart,
  onGameStartConsumed,
  roomLanguage,
  onUsernameChange,
}) => {
  const { t, dir } = useLanguage();
  const { socket } = useSocket();
  const { playComboSound } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const inputRef = useRef<HTMLInputElement>(null);
  const intentionalExitRef = useRef<boolean>(false);
  const setIsInGame = useHideNavigation();

  // Enable presence tracking
  usePresence({ enabled: !!gameCode });

  // Use game state from Zustand store (selective subscriptions for performance)
  // CRITICAL: letterGrid, shufflingGrid, and leaderboard MUST come from store, not local state
  // The socket handlers in usePlayerGameEvents and usePlayerSessionEvents update the STORE,
  // so we must read from store to see real-time updates
  const foundWords = useFoundWords();
  const boardTheme = useBoardTheme();
  const totalBoardWords = useTotalBoardWords();
  const waitingForResults = useWaitingForResults();
  const letterGrid = useLetterGrid();
  const shufflingGrid = useShufflingGrid();
  const leaderboard = useLeaderboard();

  // Get setters from Zustand store (actions never trigger re-renders)
  const { setFoundWords, setLetterGrid, setShufflingGrid } = useGameActions();

  // Game state
  const [gameActive, setGameActive] = useState<boolean>(false);
  // Batch showModeReveal + showStartAnimation — sequential animation states
  type RevealState = { showModeReveal: boolean; showStartAnimation: boolean };
  type RevealAction = { type: 'startReveal' } | { type: 'endReveal' } | { type: 'reset' };
  const [revealState, dispatchReveal] = useReducer(
    (state: RevealState, action: RevealAction): RevealState => {
      switch (action.type) {
        case 'startReveal': return { showModeReveal: true, showStartAnimation: false };
        case 'endReveal': return { showModeReveal: false, showStartAnimation: true };
        case 'reset': return { showModeReveal: false, showStartAnimation: false };
        default: return state;
      }
    },
    { showModeReveal: false, showStartAnimation: false }
  );
  const { showModeReveal, showStartAnimation } = revealState;
  const setShowModeReveal = (v: boolean) =>
    v ? dispatchReveal({ type: 'startReveal' }) : dispatchReveal({ type: 'reset' });
  const setShowStartAnimation = (v: boolean) =>
    v ? dispatchReveal({ type: 'endReveal' }) : dispatchReveal({ type: 'reset' });
  const [minWordLength, setMinWordLength] = useState<number>(2);
  const gameMode = useGameMode();

  // Multiplayer timer - uses timestamp-based countdown that syncs with server
  // Initial time will be set when game starts via socket event
  const gameTimer = useGameTimer({
    initialTime: 180, // Default, will be updated on game start
    isPaused: !gameActive, // Pause when game is not active
    autoStart: false, // Don't auto-start, wait for game to become active
    onTimeUp: () => {
      // Time up is handled by server, this is just for local display
      logger.log('[PLAYER] Local timer reached 0');
    },
  });

  // Use timer's remaining time for display
  // Note: Always use the actual timer value, not conditioned on gameActive
  // The timer is set during pendingGameStart processing before gameActive is true
  const remainingTime = gameTimer.remainingTime;

  // Player state
  const [playersReady, setPlayersReady] = useState<Player[]>(initialPlayers);

  // Calculate human player count (exclude bots)
  const humanPlayerCount = playersReady.filter(p => !p.isBot && !p.disconnected).length;

  // Enable hints for single-player mode
  const hints = useHints({
    socket,
    playerCount: humanPlayerCount,
    gameActive,
  });

  // Lobby state (loading indicator, name change, game language)
  const { isGameLoading, gameLanguage, setGameLanguage, handleNameChange } = usePlayerLobby({
    socket,
    gameActive,
    showModeReveal,
    showStartAnimation,
    onUsernameChange,
  });

  // Avatar change handler — emits socket event so other players see the update
  const handleAvatarChange = useCallback((config: CustomAvatarConfig) => {
    socket?.emit('updateAvatar', { customAvatar: config });
  }, [socket]);

  // UI state
  const [showQR, setShowQR] = useState<boolean>(false);

  // Exit handlers (confirmation, room leave, custom event listener)
  const { showExitConfirm, setShowExitConfirm, handleExitRoom, confirmExitRoom } = usePlayerExit({
    socket,
    gameCode,
    username,
    gameActive,
    setGameActive,
    intentionalExitRef,
  });


  // Navigation guard - prevent accidental navigation during active game
  useNavigationGuard({
    enabled: gameActive,
    message: t('playerView.exitWarning'),
    onNavigationAttempt: () => {
      // Show the exit confirmation dialog
      setShowExitConfirm(true);
      return false; // Block navigation, let modal handle it
    },
  });

  // Combo system
  const [comboLevel, setComboLevel] = useState<number>(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const comboLevelRef = useRef<number>(0);
  const lastWordTimeRef = useRef<number | null>(null);

  // Combo shield system
  const comboShieldsUsedRef = useRef<number>(0);

  // Combo timer visual feedback (RAF-based, threshold updates)
  const { comboTimeRemaining, comboDanger } = useComboTimer(comboLevel, lastWordTime);

  // Tournament state
  const [tournamentData, _setTournamentData] = useState<TournamentData | null>(null);
  const [tournamentStandings, _setTournamentStandings] = useState<TournamentStanding[]>([]);
  const [showTournamentStandings, setShowTournamentStandings] = useState<boolean>(false);

  // Word feedback state
  const [_showWordFeedback, setShowWordFeedback] = useState<boolean>(false);
  const [_wordToVote, setWordToVote] = useState<WordToVote | null>(null);

  // Earthquake/Fire Round state
  const [earthquakeState, setEarthquakeState] = useState<'idle' | 'warning' | 'shaking' | 'fire-round'>('idle');
  const [fireRoundActive, setFireRoundActive] = useState(false);
  const [fireRoundRemaining, setFireRoundRemaining] = useState(0);


  // First-time achievement tracking (only for new players)
  const { pendingAchievement, triggerAchievement, clearAchievement } = useFirstTimeAchievement();
  const isNewPlayerRef = useFirstTimeTracking(foundWords, comboLevel, gameActive, triggerAchievement);

  const totalGameTimeRef = useRef<number>(180); // Default 3 minutes, updated on game start

  // Music transitions: lobby → in-game → urgent → earthquake → results
  const { handleGameStartMusic } = usePlayerMusic({
    gameActive,
    remainingTime,
    waitingForResults,
    earthquakeState,
    totalGameTime: totalGameTimeRef.current,
  });

  // Use custom hook for socket events (now uses GameStateContext - no more prop drilling!)
  usePlayerSocketEvents({
    socket,
    t,
    inputRef,
    username,
    queueAchievement,
    playComboSound,
    fireRoundActive,
    onShowResults,
    setShowWordFeedback,
    setWordToVote,
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    comboShieldsUsedRef,
    intentionalExitRef,
    totalGameTimeRef,
    // Timer sync for multiplayer
    gameTimer,
    // Start music immediately when startGame event is received for better synchronization
    onGameStart: handleGameStartMusic,
  });


  // Keep refs in sync with state for use in callbacks
  useEffect(() => {
    comboLevelRef.current = comboLevel;
  }, [comboLevel]);

  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);


  // Activate game when countdown animation completes
  useEffect(() => {
    if (!showModeReveal && !showStartAnimation && letterGrid && remainingTime && remainingTime > 0 && !gameActive && !waitingForResults) {
      logger.log('[PLAYER] Countdown animation complete, activating game');
      setGameActive(true);
      // Resume internal timer so local countdown ticks between server syncs.
      // reset() sets internalPaused=true (autoStart=false), and nothing else clears it.
      gameTimer.resume();
    }
  }, [showModeReveal, showStartAnimation, letterGrid, remainingTime, gameActive, waitingForResults, gameTimer]);

  // Auto-dismiss mode reveal after 2 seconds, then trigger countdown
  useEffect(() => {
    if (!showModeReveal) return;
    const timer = setTimeout(() => {
      // dispatch batches showModeReveal=false + showStartAnimation=true in one update
      dispatchReveal({ type: 'endReveal' });
    }, 2000);
    return () => clearTimeout(timer);
  }, [showModeReveal]);

  // Clear shuffling grid when game starts
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
    }
  }, [gameActive, setShufflingGrid]);



  // Clear game state on mount and cleanup
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    setFoundWords([]);

    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
    };
  }, [setFoundWords]);

  // Update players from props
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

  // Handle pending game start
  useEffect(() => {
    if (!pendingGameStart || !socket || !onGameStartConsumed) {
      return;
    }

    logger.log('[PLAYER] Processing pending game start:', pendingGameStart);

    setFoundWords([]);

    // For late joins, show waiting screen briefly before starting animation
    // This gives visual confirmation that the player successfully joined the room
    const isLateJoin = pendingGameStart.messageId?.startsWith('late-join-');
    const delay = isLateJoin ? 1500 : 0; // 1.5 second delay for late joins to show room code

    // Set game language immediately so waiting screen shows correct language
    if (pendingGameStart.language) setGameLanguage(pendingGameStart.language);

    const startGame = () => {
      // Set game data and start animation
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) {
        totalGameTimeRef.current = pendingGameStart.timerSeconds;
        // Sync timer with pending game start
        gameTimer.reset();
        gameTimer.setTime(pendingGameStart.timerSeconds);
      }
      if (pendingGameStart.minWordLength) setMinWordLength(pendingGameStart.minWordLength);
      // Show mode reveal first, which will trigger countdown animation after 2s
      setShowModeReveal(true);

      // Trigger music immediately for synchronization
      handleGameStartMusic();

      if (pendingGameStart.messageId) {
        socket.emit('startGameAck', { messageId: pendingGameStart.messageId });
        logger.log('[PLAYER] Sent startGameAck for pending game start, messageId:', pendingGameStart.messageId);
      }
    };

    onGameStartConsumed();

    if (delay > 0) {
      // Late join - delay to show waiting screen briefly
      const startAnimationTimer = setTimeout(startGame, delay);
      return () => clearTimeout(startAnimationTimer);
    } else {
      // Normal game start - no delay
      startGame();
      return;
    }
  }, [pendingGameStart, socket, onGameStartConsumed, handleGameStartMusic, gameTimer, setFoundWords, setLetterGrid, setGameLanguage]);


  // Word submission handler - adds word with pending validation state
  // Uses WordDetail type from GameStateContext
  const handleWordSubmit = useCallback((formedWord: string) => {
    setFoundWords(prev => [...prev, {
      word: formedWord,
      score: 0, // Will be updated when validated
      validated: false, // Pending validation - will be updated by usePlayerWordEvents
      isDuplicate: false,
    }]);
  }, [setFoundWords]);

  // Map WordDetail (from context) to FoundWord (expected by components)
  // This ensures type compatibility between context and view components
  const mappedFoundWords = useMemo(() =>
    foundWords.map(w => ({
      word: w.word,
      isValid: w.validated === true ? true : w.validated === false ? null : null,
      score: w.score,
      duplicate: w.isDuplicate,
      comboBonus: w.comboBonus,
      fireRoundBonus: w.fireRoundBonus,
    })),
    [foundWords]
  );

  // Reset combo handler (for client-side duplicate detection)
  const handleResetCombo = useCallback(() => {
    resetComboState(
      { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
      { setComboLevel, setLastWordTime }
    );
  }, []);

  // Show game board during countdown animation when we have letterGrid
  // This allows players to see the board while countdown is active
  // Also covers the transition period between countdown ending and gameActive being set
  const hasGameData = letterGrid && remainingTime !== null && remainingTime > 0;
  const showGameView = gameActive || (hasGameData && !waitingForResults);

  // Hide bottom navigation during gameplay
  useEffect(() => {
    setIsInGame(showModeReveal || showStartAnimation || !!showGameView);
    return () => setIsInGame(false);
  }, [showModeReveal, showStartAnimation, showGameView, setIsInGame]);

  // Map game mode to display label
  const modeRevealLabel = gameMode === 'blast' ? t('countdown.modeReveal.blast') : gameMode === 'word-hunt' ? t('countdown.modeReveal.wordHunt') : t('countdown.modeReveal.classic');

  if (!showGameView && !waitingForResults) {
    // Show loading indicator when server is preparing the game
    if (isGameLoading) {
      return (
        <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-neo-lime animate-spin" />
            <div className="text-lg font-bold text-white/70">
              {t('common.preparingGame')}
            </div>
          </div>
        </div>
      );
    }

    // Show dramatic mode reveal overlay before countdown
    if (showModeReveal) {
      return (
        <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
          <AdaptiveAnimatePresence>
            <AdaptiveMotion.div
              key="mode-reveal"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="text-7xl font-neo-display font-black text-neo-lime uppercase tracking-wider drop-shadow-[0_0_40px_rgba(163,230,53,0.5)]">
                {modeRevealLabel}
              </div>
              <AdaptiveMotion.div
                initial={{ width: 0 }}
                animate={{ width: '80%' }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                className="h-1 bg-neo-lime rounded-full"
              />
            </AdaptiveMotion.div>
          </AdaptiveAnimatePresence>
        </div>
      );
    }

    // When countdown animation is active, only show the countdown overlay
    // Don't render PlayerWaitingView underneath to avoid double loaders
    if (showStartAnimation) {
      return (
        <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
          <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} t={t} />
        </div>
      );
    }

    return (
      <PlayerWaitingView
          gameCode={gameCode}
          gameLanguage={gameLanguage || roomLanguage || null}
          username={username}
          t={t}
          playersReady={playersReady}
          showQR={showQR}
          setShowQR={setShowQR}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
          onNameChange={handleNameChange}
          onAvatarChange={handleAvatarChange}
        />
    );
  }

  // Waiting for results — brief transition until scores arrive (no validation modal)
  if (waitingForResults) {
    const playerEntry = leaderboard.find(p => p.username === username);
    const playerScore = playerEntry?.score ?? 0;
    const validWords = foundWords.filter(w => w.validated !== false);

    return (
      <div className="flex-1 w-full bg-neo-navy flex items-center justify-center">
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center gap-4 text-center px-6"
        >
          <div className="border-3 border-neo-black rounded-neo shadow-hard px-6 py-4 bg-gradient-to-br from-neo-yellow to-neo-orange">
            <div className="font-black text-neo-black text-3xl tabular-nums">
              {playerScore.toLocaleString()}
            </div>
            <div className="font-bold uppercase tracking-wider text-neo-black/60 text-xs">
              {t('common.score')}
            </div>
          </div>
          <div className="text-white/60 font-bold text-sm">
            {validWords.length} {t('common.words')}
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('game.calculatingResults')}</span>
          </div>
        </AdaptiveMotion.div>
      </div>
    );
  }

  return (
    <>
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} t={t} />
      )}
      {/* First-time achievement celebrations for new players */}
      {isNewPlayerRef.current && (
        <FirstTimeAchievement
          achievementType={pendingAchievement}
          onDismiss={clearAchievement}
          position="top"
        />
      )}

      <PlayerInGameView
        username={username}
        gameCode={gameCode}
        t={t}
        dir={dir}
        socket={socket}
        letterGrid={letterGrid}
        shufflingGrid={shufflingGrid}
        gameActive={gameActive}
        showStartAnimation={showStartAnimation}
        remainingTime={remainingTime}
        gameLanguage={gameLanguage}
        minWordLength={minWordLength}
        comboLevel={comboLevel}
        comboLevelRef={comboLevelRef}
        comboTimeRemaining={comboTimeRemaining}
        comboDanger={comboDanger}
        foundWords={mappedFoundWords}
        leaderboard={leaderboard}
        totalBoardWords={totalBoardWords}
        tournamentData={tournamentData}
        tournamentStandings={tournamentStandings}
        showTournamentStandings={showTournamentStandings}
        setShowTournamentStandings={setShowTournamentStandings}
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        onExitRoom={handleExitRoom}
        onConfirmExit={confirmExitRoom}
        onWordSubmit={handleWordSubmit}
        onResetCombo={handleResetCombo}
        hints={hints}
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        boardTheme={boardTheme}
        totalTime={totalGameTimeRef.current}
      />
    </>
  );
});

PlayerView.displayName = 'PlayerView';

export default PlayerView;
