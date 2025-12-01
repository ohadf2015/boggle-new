import { useEffect, useCallback, useRef, MutableRefObject, RefObject } from 'react';
import { Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { wordAcceptedToast, wordNeedsValidationToast, wordAIValidatingToast, wordErrorToast, neoSuccessToast, neoErrorToast, neoInfoToast } from '../../components/NeoToast';
import { clearSessionPreservingUsername } from '../../utils/session';
import logger from '@/utils/logger';

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  timestamp?: number;
}

interface Player {
  username: string;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  isComplete?: boolean;
}

interface WordToVote {
  word: string;
  submittedBy: string;
  submitterAvatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string;
  };
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

interface XpGainedData {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  newLevel: number;
}

interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

interface UsePlayerSocketEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  inputRef: RefObject<HTMLInputElement>;
  wasInActiveGame: boolean;
  gameActive: boolean;
  letterGrid: any;
  gameLanguage: string | null;
  username: string;
  queueAchievement: (achievement: any) => void;
  playComboSound: (level: number) => void;
  onShowResults?: (data: { scores: any; letterGrid: any }) => void;

  // State setters
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  setShufflingGrid: React.Dispatch<React.SetStateAction<any>>;
  setHighlightedCells: React.Dispatch<React.SetStateAction<any>>;
  setWasInActiveGame: React.Dispatch<React.SetStateAction<boolean>>;
  setFoundWords: React.Dispatch<React.SetStateAction<FoundWord[]>>;
  setAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  setLetterGrid: React.Dispatch<React.SetStateAction<any>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  setGameLanguage: React.Dispatch<React.SetStateAction<string | null>>;
  setGameActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;
  setLeaderboard: React.Dispatch<React.SetStateAction<any[]>>;
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentStandings: React.Dispatch<React.SetStateAction<any[]>>;
  setShowTournamentStandings: React.Dispatch<React.SetStateAction<boolean>>;

  // Word feedback state setters
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<WordToVote | null>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedData | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpData | null>>;

  // Combo refs and setters
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;
}

/**
 * Custom hook for managing player socket events
 */
const usePlayerSocketEvents = ({
  socket,
  t,
  inputRef,
  wasInActiveGame,
  gameActive,
  letterGrid,
  gameLanguage,
  username,
  queueAchievement,
  playComboSound,
  onShowResults,

  // State setters
  setPlayersReady,
  setShufflingGrid,
  setHighlightedCells,
  setWasInActiveGame,
  setFoundWords,
  setAchievements,
  setLetterGrid,
  setRemainingTime,
  setMinWordLength,
  setGameLanguage,
  setGameActive,
  setShowStartAnimation,
  setWaitingForResults,
  setLeaderboard,
  setTournamentData,
  setTournamentStandings,
  setShowTournamentStandings,

  // Word feedback state setters
  setShowWordFeedback,
  setWordToVote,

  // XP state setters
  setXpGainedData,
  setLevelUpData,

  // Combo refs and setters
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,

  // Exit ref
  intentionalExitRef,
}: UsePlayerSocketEventsProps): void => {
  // Reset combo helper
  const resetCombo = useCallback(() => {
    setComboLevel(0);
    comboLevelRef.current = 0;
    setLastWordTime(null);
    lastWordTimeRef.current = null;
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
  }, [setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef]);

  // Use a ref for onShowResults to avoid stale closure issues during game end race condition
  // This ensures the validatedScores event handler always has access to the latest callback
  const onShowResultsRef = useRef(onShowResults);
  useEffect(() => {
    onShowResultsRef.current = onShowResults;
  }, [onShowResults]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdateUsers = (data: any) => {
      setPlayersReady(data.users || []);
    };

    const handleShufflingGridUpdate = (data: any) => {
      if (data.grid) {
        setShufflingGrid(data.grid);
      }
      if (data.highlightedCells !== undefined) {
        setHighlightedCells(data.highlightedCells);
      }
    };

    const handleStartGame = (data: any) => {
      setWasInActiveGame(true);
      setFoundWords([]);
      setAchievements([]);
      if (data.letterGrid) setLetterGrid(data.letterGrid);
      if (data.timerSeconds) setRemainingTime(data.timerSeconds);
      if (data.language) setGameLanguage(data.language);
      if (data.minWordLength) setMinWordLength(data.minWordLength);
      setGameActive(true);
      setShowStartAnimation(true);

      if (data.messageId && !data.skipAck) {
        socket.emit('startGameAck', { messageId: data.messageId });
        logger.log('[PLAYER] Sent startGameAck for messageId:', data.messageId);
      }

      neoSuccessToast(t('common.gameStarted'), { id: 'game-started', icon: '🚀', duration: 3000 });
    };

    const handleEndGame = () => {
      logger.log('[PLAYER] Received endGame event, wasInActiveGame:', wasInActiveGame);
      setGameActive(false);
      setRemainingTime(0);
      if (wasInActiveGame) {
        logger.log('[PLAYER] Setting waitingForResults to true');
        setWaitingForResults(true);
      }
    };

    const handleWordAccepted = (data: any) => {
      // Dismiss any AI validation toast for this word
      toast.dismiss(`ai-validating-${data.word.toLowerCase()}`);

      if (inputRef.current) {
        gsap.fromTo(inputRef.current,
          { scale: 1.1, borderColor: '#4ade80' },
          { scale: 1, borderColor: '', duration: 0.3 }
        );
      }

      // Update found words - mark as valid
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? { ...fw, isValid: true }
          : fw
      ));

      const now = Date.now();
      let newComboLevel = 0;

      if (data.autoValidated) {
        const currentComboLevel = comboLevelRef.current;
        const currentLastWordTime = lastWordTimeRef.current;

        const comboChainWindow = Math.min(3000 + currentComboLevel * 1000, 10000);
        if (currentLastWordTime && (now - currentLastWordTime) < comboChainWindow) {
          newComboLevel = currentComboLevel + 1;
          setComboLevel(newComboLevel);
          comboLevelRef.current = newComboLevel;
          playComboSound(newComboLevel);
        } else {
          newComboLevel = 0;
          setComboLevel(0);
          comboLevelRef.current = 0;
        }
        setLastWordTime(now);
        lastWordTimeRef.current = now;

        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }

        const comboTimeout = Math.min(3000 + newComboLevel * 1000, 10000);
        comboTimeoutRef.current = setTimeout(() => {
          setComboLevel(0);
          comboLevelRef.current = 0;
          setLastWordTime(null);
          lastWordTimeRef.current = null;
        }, comboTimeout);
      }

      // Show toast with score from server
      wordAcceptedToast(data.word, {
        score: data.score || (data.word.length - 1),
        comboBonus: data.comboBonus || 0,
        comboLevel: data.comboLevel || 0,
        comboBonusLabel: t('common.comboBonus'),
        duration: 2000
      });
    };

    const handleWordNeedsValidation = (data: any) => {
      wordNeedsValidationToast(data.word, { pendingLabel: t('common.pending'), duration: 3000 });
      // Word stays in list with isValid: null (pending validation)
      // No need to update state since it's already null
      resetCombo();
    };

    const handleWordValidatingWithAI = (data: any) => {
      // Show AI validation indicator toast
      wordAIValidatingToast(data.word, {
        aiValidatingLabel: t('playerView.aiValidating') || 'AI checking...',
        duration: 15000 // Will be dismissed when validation completes
      });
      logger.log('[PLAYER] AI is validating word:', data.word);
    };

    const handleWordAlreadyFound = (data: any) => {
      wordErrorToast(t('playerView.wordAlreadyFound'), { duration: 2000 });
      // Remove any pending (isValid === null) entries for this word
      if (data?.word) {
        setFoundWords(prev => prev.filter(fw => {
          if (fw.word.toLowerCase() === data.word.toLowerCase() && fw.isValid === null) {
            return false; // Remove pending duplicate
          }
          return true;
        }));
      }
      resetCombo();
    };

    const handleWordNotOnBoard = (data: any) => {
      wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 3000 });
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? { ...fw, isValid: false }
          : fw
      ));
      resetCombo();
    };

    const handleWordTooShort = (data: any) => {
      const msg = t('playerView.wordTooShortMin')
        ? t('playerView.wordTooShortMin').replace('${min}', data.minLength)
        : `Word too short! (min ${data.minLength} letters)`;
      wordErrorToast(msg, { duration: 2000 });
      setFoundWords(prev => prev.filter(fw =>
        fw.word.toLowerCase() !== data.word.toLowerCase()
      ));
      resetCombo();
    };

    const handleWordRejected = (data: any) => {
      // Dismiss any AI validation toast for this word
      toast.dismiss(`ai-validating-${data.word.toLowerCase()}`);

      wordErrorToast(t('playerView.wordRejected') || 'Word rejected', { duration: 2000 });
      setFoundWords(prev => prev.filter(fw =>
        fw.word.toLowerCase() !== data.word.toLowerCase()
      ));
      resetCombo();
    };

    const handleTimeUpdate = (data: any) => {
      setRemainingTime(data.remainingTime);

      if (data.letterGrid && !letterGrid) {
        logger.log('[PLAYER] Received letterGrid in timeUpdate - late join sync');
        setLetterGrid(data.letterGrid);
      }
      if (data.language && !gameLanguage) {
        setGameLanguage(data.language);
      }

      const hasGrid = letterGrid || data.letterGrid;
      if (!gameActive && data.remainingTime > 0 && hasGrid) {
        logger.log('[PLAYER] Timer started on server, activating game (remainingTime:', data.remainingTime, ')');
        setGameActive(true);
        setShowStartAnimation(true);
      }

      if (data.remainingTime <= 0) {
        setGameActive(false);
        setWaitingForResults(true);
      }
    };

    const handleUpdateLeaderboard = (data: any) => {
      setLeaderboard(data.leaderboard);
    };

    const handleLiveAchievementUnlocked = (data: any) => {
      if (!data || !data.achievements || !Array.isArray(data.achievements)) {
        logger.warn('[PLAYER] Received invalid achievement data:', data);
        return;
      }

      logger.log(`[PLAYER] Received ${data.achievements.length} live achievements:`,
        data.achievements.map((a: any) => a?.name || 'unknown').join(', '));

      data.achievements.forEach((achievement: any) => {
        if (achievement && achievement.name) {
          queueAchievement(achievement);
        } else {
          logger.warn('[PLAYER] Skipping invalid achievement object:', achievement);
        }
      });

      const validAchievements = data.achievements.filter((a: any) => a && a.name);
      if (validAchievements.length > 0) {
        setAchievements(prev => [...prev, ...validAchievements]);
        logger.log(`[PLAYER] Added ${validAchievements.length} valid achievements to state`);
      }
    };

    const handleValidatedScores = (data: any) => {
      logger.log('[PLAYER] Received validatedScores event:', data);
      setWaitingForResults(false);
      setShowWordFeedback(false);
      setWordToVote(null);
      // Use ref to get the latest onShowResults callback to avoid stale closure issues
      const currentOnShowResults = onShowResultsRef.current;
      if (currentOnShowResults) {
        logger.log('[PLAYER] Calling onShowResults with scores');
        currentOnShowResults({
          scores: data.scores,
          letterGrid: data.letterGrid,
        });
      } else {
        logger.warn('[PLAYER] onShowResults is not defined!');
      }
    };

    const handleFinalScores = (data: any) => {
      // Legacy handler - finalScores is no longer used in the new flow
      // The new flow uses validatedScores which is handled by handleValidatedScores
      logger.log('[PLAYER] Received legacy finalScores event (deprecated):', data);
      setWaitingForResults(false);
      setShowWordFeedback(false);
      setWordToVote(null);
      // Use ref to get the latest onShowResults callback
      const currentOnShowResults = onShowResultsRef.current;
      if (currentOnShowResults) {
        currentOnShowResults({
          scores: data.scores,
          letterGrid: letterGrid,
        });
      }
    };

    const handleHostLeftRoomClosing = (data: any) => {
      intentionalExitRef.current = true;
      clearSessionPreservingUsername(username);
      neoErrorToast(data.message || t('playerView.roomClosed'), { icon: '🚪', duration: 5000 });
      setTimeout(() => {
        socket.disconnect();
        window.location.reload();
      }, 2000);
    };

    const handleResetGame = (data: any) => {
      setGameActive(false);
      setWasInActiveGame(false);
      setFoundWords([]);
      setAchievements([]);
      setLeaderboard([]);
      setRemainingTime(null);
      setWaitingForResults(false);
      setLetterGrid(null);
      neoSuccessToast(data.message || t('common.newGameReady'), { icon: '🔄', duration: 3000 });
    };

    const handleTournamentCreated = (data: any) => {
      setTournamentData(data.tournament);
      neoSuccessToast(t('hostView.tournamentCreated') || 'Tournament created!', { icon: '🏆', duration: 3000 });
    };

    const handleTournamentRoundStarting = (data: any) => {
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
      if (data.standings) {
        setTournamentStandings(data.standings);
      }
      const roundNum = data.tournament?.currentRound || 1;
      const totalRounds = data.tournament?.totalRounds || 3;
      neoInfoToast(`${t('hostView.tournamentRound')} ${roundNum}/${totalRounds}`, { icon: '🎯', duration: 3000 });
    };

    const handleTournamentRoundCompleted = (data: any) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
    };

    const handleTournamentComplete = (data: any) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
      const winner = data.standings?.[0];
      if (winner) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
        });
        neoSuccessToast(`🏆 ${winner.username} ${t('hostView.wonTournament')}!`, { duration: 5000 });
      }
    };

    const handleTournamentCancelled = (data: any) => {
      setTournamentData(null);
      setTournamentStandings([]);
      setShowTournamentStandings(false);
      neoErrorToast(data?.message || t('hostView.tournamentCancelled'), { icon: '❌', duration: 3000 });
    };

    const handleError = (data: any) => {
      const message = data?.message || t('playerView.errorOccurred') || 'An error occurred';
      wordErrorToast(message, { duration: 3000 });
    };

    const handleRateLimited = () => {
      wordErrorToast(t('playerView.tooFast') || 'Slow down! Submitting too fast', { duration: 2000 });
    };

    // Word feedback handlers
    const handleShowWordFeedback = (data: any) => {
      logger.log('[PLAYER] Received word feedback request:', data);
      setWordToVote({
        word: data.word,
        submittedBy: data.submittedBy,
        submitterAvatar: data.submitterAvatar,
        timeoutSeconds: data.timeoutSeconds || 10,
        gameCode: data.gameCode,
        language: data.language
      });
      setShowWordFeedback(true);
    };

    const handleNoWordFeedback = () => {
      logger.log('[PLAYER] No word feedback needed');
      setShowWordFeedback(false);
      setWordToVote(null);
    };

    const handleVoteRecorded = (data: any) => {
      logger.log('[PLAYER] Vote recorded:', data);
      if (data.success) {
        neoSuccessToast(t('wordFeedback.thankYou') || 'Thanks for voting!', { icon: '✓', duration: 2000 });
      }
    };

    const handleWordBecameValid = (data: any) => {
      logger.log('[PLAYER] Word became valid:', data);
      neoInfoToast(`"${data.word}" ${t('wordFeedback.nowValid') || 'is now a valid word!'}`, { icon: '📖', duration: 3000 });
    };

    const handlePlayerPresenceUpdate = (data: any) => {
      const { username: playerUsername, presenceStatus, isWindowFocused } = data;
      setPlayersReady(prev => {
        return prev.map(player => {
          const name = typeof player === 'string' ? player : player.username;
          if (name === playerUsername) {
            const newPlayer: Player = typeof player === 'string'
              ? { username: player, presenceStatus, isWindowFocused }
              : { ...player, presenceStatus, isWindowFocused };
            return newPlayer;
          }
          return player;
        });
      });
    };

    // Reconnection and host transfer handlers
    const handleHostDisconnected = (data: any) => {
      logger.log('[PLAYER] Host disconnected, waiting for reconnection');
      neoInfoToast(data.message || t('playerView.hostDisconnected') || 'Host disconnected. Waiting for reconnection...', {
        icon: '⏳',
        duration: 5000
      });
    };

    const handleHostTransferred = (data: any) => {
      logger.log('[PLAYER] Host transferred to:', data.newHost);
      neoSuccessToast(data.message || `${data.newHost} ${t('playerView.isNowHost') || 'is now the host'}`, {
        icon: '👑',
        duration: 4000
      });
    };

    const handlePlayerDisconnected = (data: any) => {
      logger.log('[PLAYER] Player disconnected:', data.username);
      neoInfoToast(data.message || `${data.username} ${t('playerView.disconnected') || 'disconnected. Waiting for reconnection...'}`, {
        icon: '📡',
        duration: 3000
      });
    };

    const handlePlayerReconnected = (data: any) => {
      logger.log('[PLAYER] Player reconnected:', data.username);
      neoSuccessToast(data.message || `${data.username} ${t('playerView.reconnected') || 'reconnected'}`, {
        icon: '✅',
        duration: 2000
      });
    };

    const handlePlayerConnectionStatusChanged = (data: { username: string; connectionStatus: 'weak' | 'stable'; message: string }) => {
      logger.log('[PLAYER] Player connection status changed:', data);
      if (data.connectionStatus === 'weak') {
        // Show a subtle warning toast for weak connection
        neoInfoToast(data.message || `${data.username} has weak connection`, {
          icon: '📶',
          duration: 4000
        });
      } else if (data.connectionStatus === 'stable') {
        // Connection recovered
        neoSuccessToast(data.message || `${data.username}'s connection recovered`, {
          icon: '✅',
          duration: 2000
        });
      }
    };

    const handlePlayerLeft = (data: any) => {
      logger.log('[PLAYER] Player left:', data.username);
      neoInfoToast(data.message || `${data.username} ${t('playerView.leftRoom') || 'left the room'}`, {
        icon: '👋',
        duration: 2000
      });
    };

    // Multi-tab handling - session taken over by another tab
    const handleSessionTakenOver = (data: any) => {
      logger.log('[PLAYER] Session taken over by another tab');
      intentionalExitRef.current = true;
      clearSessionPreservingUsername(username);
      neoInfoToast(data.message || t('playerView.sessionMovedToAnotherTab') || 'Session moved to another tab', {
        icon: '📱',
        duration: 3000
      });
      // Don't reload - just let the socket disconnect naturally
    };

    const handleSessionMigrated = (data: any) => {
      logger.log('[PLAYER] Session migrated to different room');
      intentionalExitRef.current = true;
      clearSessionPreservingUsername(username);
      neoInfoToast(data.message || t('playerView.sessionMovedToAnotherRoom') || 'Session moved to another room', {
        icon: '🔄',
        duration: 3000
      });
    };

    // XP and Level Up handlers
    const handleXpGained = (data: XpGainedData) => {
      logger.log('[PLAYER] XP gained:', data);
      setXpGainedData(data);
      // Show a brief toast notification
      neoSuccessToast(`+${data.xpEarned} ${t('common.xpGained')}`, {
        icon: '⭐',
        duration: 3000
      });
    };

    const handleLevelUp = (data: LevelUpData) => {
      logger.log('[PLAYER] Level up!', data);
      setLevelUpData(data);
      // Celebratory confetti for level up
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1']
      });
      neoSuccessToast(`${t('results.levelUp') || 'Level Up!'} ${data.oldLevel} → ${data.newLevel}`, {
        icon: '🎉',
        duration: 5000
      });
    };

    // Register all event listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('playerPresenceUpdate', handlePlayerPresenceUpdate);
    socket.on('shufflingGridUpdate', handleShufflingGridUpdate);
    socket.on('startGame', handleStartGame);
    socket.on('endGame', handleEndGame);
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('wordValidatingWithAI', handleWordValidatingWithAI);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordTooShort', handleWordTooShort);
    socket.on('wordRejected', handleWordRejected);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('updateLeaderboard', handleUpdateLeaderboard);
    socket.on('liveAchievementUnlocked', handleLiveAchievementUnlocked);
    socket.on('validatedScores', handleValidatedScores);
    socket.on('finalScores', handleFinalScores);
    socket.on('hostLeftRoomClosing', handleHostLeftRoomClosing);
    socket.on('resetGame', handleResetGame);
    socket.on('tournamentCreated', handleTournamentCreated);
    socket.on('tournamentRoundStarting', handleTournamentRoundStarting);
    socket.on('tournamentRoundCompleted', handleTournamentRoundCompleted);
    socket.on('tournamentComplete', handleTournamentComplete);
    socket.on('tournamentCancelled', handleTournamentCancelled);
    socket.on('error', handleError);
    socket.on('rateLimited', handleRateLimited);
    socket.on('showWordFeedback', handleShowWordFeedback);
    socket.on('noWordFeedback', handleNoWordFeedback);
    socket.on('voteRecorded', handleVoteRecorded);
    socket.on('wordBecameValid', handleWordBecameValid);
    socket.on('hostDisconnected', handleHostDisconnected);
    socket.on('hostTransferred', handleHostTransferred);
    socket.on('playerDisconnected', handlePlayerDisconnected);
    socket.on('playerReconnected', handlePlayerReconnected);
    socket.on('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('sessionTakenOver', handleSessionTakenOver);
    socket.on('sessionMigrated', handleSessionMigrated);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('playerPresenceUpdate', handlePlayerPresenceUpdate);
      socket.off('shufflingGridUpdate', handleShufflingGridUpdate);
      socket.off('startGame', handleStartGame);
      socket.off('endGame', handleEndGame);
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
      socket.off('wordValidatingWithAI', handleWordValidatingWithAI);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordTooShort', handleWordTooShort);
      socket.off('wordRejected', handleWordRejected);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('updateLeaderboard', handleUpdateLeaderboard);
      socket.off('liveAchievementUnlocked', handleLiveAchievementUnlocked);
      socket.off('validatedScores', handleValidatedScores);
      socket.off('finalScores', handleFinalScores);
      socket.off('hostLeftRoomClosing', handleHostLeftRoomClosing);
      socket.off('resetGame', handleResetGame);
      socket.off('tournamentCreated', handleTournamentCreated);
      socket.off('tournamentRoundStarting', handleTournamentRoundStarting);
      socket.off('tournamentRoundCompleted', handleTournamentRoundCompleted);
      socket.off('tournamentComplete', handleTournamentComplete);
      socket.off('tournamentCancelled', handleTournamentCancelled);
      socket.off('error', handleError);
      socket.off('rateLimited', handleRateLimited);
      socket.off('showWordFeedback', handleShowWordFeedback);
      socket.off('noWordFeedback', handleNoWordFeedback);
      socket.off('voteRecorded', handleVoteRecorded);
      socket.off('wordBecameValid', handleWordBecameValid);
      socket.off('hostDisconnected', handleHostDisconnected);
      socket.off('hostTransferred', handleHostTransferred);
      socket.off('playerDisconnected', handlePlayerDisconnected);
      socket.off('playerReconnected', handlePlayerReconnected);
      socket.off('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('sessionTakenOver', handleSessionTakenOver);
      socket.off('sessionMigrated', handleSessionMigrated);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
    };
  }, [
    socket,
    t,
    inputRef,
    wasInActiveGame,
    gameActive,
    letterGrid,
    gameLanguage,
    username,
    queueAchievement,
    playComboSound,
    // onShowResults removed - using onShowResultsRef instead to avoid stale closure issues
    resetCombo,
    setPlayersReady,
    setShufflingGrid,
    setHighlightedCells,
    setWasInActiveGame,
    setFoundWords,
    setAchievements,
    setLetterGrid,
    setRemainingTime,
    setMinWordLength,
    setGameLanguage,
    setGameActive,
    setShowStartAnimation,
    setWaitingForResults,
    setLeaderboard,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setShowWordFeedback,
    setWordToVote,
    setXpGainedData,
    setLevelUpData,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    intentionalExitRef,
  ]);
};

export default usePlayerSocketEvents;
