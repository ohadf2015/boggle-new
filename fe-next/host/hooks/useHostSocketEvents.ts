import { useEffect, useCallback, useRef, MutableRefObject, RefObject } from 'react';
import { Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { wordAcceptedToast, wordNeedsValidationToast, wordErrorToast, neoSuccessToast, neoErrorToast, neoInfoToast } from '../../components/NeoToast';
import { clearSessionPreservingUsername } from '../../utils/session';
import logger from '@/utils/logger';

interface Player {
  username: string;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: any[];
  isComplete?: boolean;
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

interface UseHostSocketEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  hostPlaying: boolean;
  gameStarted: boolean;
  tableData: any;
  username: string;
  queueAchievement: (achievement: any) => void;
  playComboSound: (level: number) => void;
  onShowResults?: (data: { scores: any; letterGrid: any }) => void;

  // State setters
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayerWordCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerAchievements: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setFinalScores: React.Dispatch<React.SetStateAction<any>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setTableData: React.Dispatch<React.SetStateAction<any>>;
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setHostAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setWordsForBoard: React.Dispatch<React.SetStateAction<string[]>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedData | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpData | null>>;

  // Results waiting state
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;

  // Combo refs and setters
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;

  // Tournament refs
  tournamentTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  tournamentData: TournamentData | null;

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;
}

/**
 * Custom hook for managing host socket events
 */
const useHostSocketEvents = ({
  socket,
  t,
  hostPlaying,
  gameStarted,
  tableData,
  username,
  queueAchievement,
  playComboSound,
  onShowResults,

  // State setters
  setPlayersReady,
  setPlayerWordCounts,
  setPlayerScores,
  setPlayerAchievements,
  setFinalScores,
  setRemainingTime,
  setGameStarted,
  setShowStartAnimation,
  setTableData,
  setHostFoundWords,
  setHostAchievements,
  setTournamentData,
  setTournamentCreating,
  setWordsForBoard,

  // XP state setters
  setXpGainedData,
  setLevelUpData,

  // Results waiting state
  setWaitingForResults,

  // Combo refs and setters
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,

  // Tournament refs
  tournamentTimeoutRef,
  tournamentData,

  // Exit ref
  intentionalExitRef,
}: UseHostSocketEventsProps): void => {
  // Reset combo helper - defined first since handleWordAccepted depends on it
  const resetCombo = useCallback(() => {
    setComboLevel(0);
    comboLevelRef.current = 0;
    setLastWordTime(null);
    lastWordTimeRef.current = null;
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
  }, [setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef]);

  // Handle word accepted (for host playing)
  const handleWordAccepted = useCallback((data: any) => {
    if (!hostPlaying) return;

    const now = Date.now();
    let newComboLevel = 0;

    if (data.autoValidated) {
      // Word was in dictionary - combo can continue
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
    } else {
      // Word was NOT in dictionary (AI-validated or host-validated) - reset combo
      resetCombo();
    }

    const baseScore = data.word.length - 1;
    const comboBonus = (data.score || baseScore) - baseScore;

    wordAcceptedToast(data.word, {
      score: data.score || baseScore,
      comboBonus: comboBonus > 0 ? comboBonus : 0,
      comboLevel: newComboLevel,
      comboBonusLabel: t('common.comboBonus'),
      duration: 2000
    });
  }, [hostPlaying, playComboSound, setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef, t, resetCombo]);

  // Use refs for onShowResults and tableData to avoid stale closure issues during game end race condition
  const onShowResultsRef = useRef(onShowResults);
  const tableDataRef = useRef(tableData);
  useEffect(() => {
    onShowResultsRef.current = onShowResults;
    tableDataRef.current = tableData;
  }, [onShowResults, tableData]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdateUsers = (data: any) => {
      const newUsers = data.users || [];
      setPlayersReady(newUsers);

      const currentUsernames = new Set(newUsers.map((u: string | Player) =>
        typeof u === 'string' ? u : u.username
      ));

      setPlayerScores(prev => {
        const filtered: Record<string, number> = {};
        Object.keys(prev).forEach(uname => {
          if (currentUsernames.has(uname)) {
            filtered[uname] = prev[uname];
          }
        });
        return filtered;
      });

      setPlayerWordCounts(prev => {
        const filtered: Record<string, number> = {};
        Object.keys(prev).forEach(uname => {
          if (currentUsernames.has(uname)) {
            filtered[uname] = prev[uname];
          }
        });
        return filtered;
      });

      setPlayerAchievements(prev => {
        const filtered: Record<string, any[]> = {};
        Object.keys(prev).forEach(uname => {
          if (currentUsernames.has(uname)) {
            filtered[uname] = prev[uname];
          }
        });
        return filtered;
      });
    };

    const handlePlayerJoinedLate = (data: any) => {
      neoInfoToast(`${data.username} ${t('hostView.playerJoinedLate')}`, {
        icon: '🚀',
        duration: 4000,
      });
    };

    const handlePlayerFoundWord = (data: any) => {
      setPlayerWordCounts(prev => ({
        ...prev,
        [data.username]: data.wordCount
      }));
      if (data.score !== undefined) {
        setPlayerScores(prev => ({
          ...prev,
          [data.username]: data.score
        }));
      }
    };

    const handleAchievementUnlocked = (data: any) => {
      if (!hostPlaying && data.username && data.achievement) {
        setPlayerAchievements(prev => ({
          ...prev,
          [data.username]: [...(prev[data.username] || []), data.achievement]
        }));
      }
    };

    const handleLiveAchievementUnlocked = (data: any) => {
      if (!data || !data.achievements || !Array.isArray(data.achievements)) {
        logger.warn('[HOST] Received invalid achievement data:', data);
        return;
      }

      logger.log(`[HOST] Received ${data.achievements.length} live achievements:`,
        data.achievements.map((a: any) => a?.name || 'unknown').join(', '));

      data.achievements.forEach((achievement: any) => {
        if (achievement && achievement.name) {
          queueAchievement(achievement);
        } else {
          logger.warn('[HOST] Skipping invalid achievement:', achievement);
        }
      });

      if (hostPlaying) {
        const validAchievements = data.achievements.filter((a: any) => a && a.name);
        setHostAchievements(prev => [...prev, ...validAchievements]);
        logger.log(`[HOST] Added ${validAchievements.length} achievements to host state`);
      }
    };

    // Handle validation complete (after word feedback voting timeout)
    const handleValidationComplete = (data: any) => {
      logger.log('[HOST] Received validationComplete event:', data);
      // Use refs to get the latest values to avoid stale closure issues
      const currentOnShowResults = onShowResultsRef.current;
      const currentTableData = tableDataRef.current;
      logger.log('[HOST] onShowResults defined:', !!currentOnShowResults);
      logger.log('[HOST] tableData available:', !!currentTableData);

      // Clear waiting state - results are ready
      setWaitingForResults(false);

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
      neoSuccessToast(t('hostView.gameComplete') || 'Game complete!', {
        icon: '🎉',
        duration: 3000,
      });
      if (currentOnShowResults) {
        logger.log('[HOST] Calling onShowResults with scores');
        currentOnShowResults({
          scores: data.scores,
          letterGrid: currentTableData
        });
      } else {
        logger.log('[HOST] onShowResults not defined, setting finalScores in modal');
        setFinalScores(data.scores);
      }
    };

    const handleRoomClosedDueToInactivity = (data: any) => {
      intentionalExitRef.current = true;
      neoErrorToast(data.message || t('hostView.roomClosedInactivity'), {
        icon: '⏰',
        duration: 5000,
      });
      setTimeout(() => {
        clearSessionPreservingUsername(username);
        socket.disconnect();
        window.location.reload();
      }, 2000);
    };

    const handleTimeUpdate = (data: any) => {
      setRemainingTime(data.remainingTime);
      if (data.remainingTime === 0 && gameStarted) {
        setGameStarted(false);
        setWaitingForResults(true); // Show loading state while calculating scores
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
        neoSuccessToast(t('hostView.gameOverCheckScores'), {
          icon: '🏁',
          duration: 5000,
        });
      }
    };

    const handleGameStarted = (data: any) => {
      if (data.letterGrid) {
        setTableData(data.letterGrid);
      }
      if (data.timerSeconds !== undefined) {
        setRemainingTime(data.timerSeconds);
      }
      setGameStarted(true);
      setWaitingForResults(false); // Reset waiting state when new game starts
      setShowStartAnimation(true);
      setPlayerWordCounts({});
      setPlayerScores({});
      setHostFoundWords([]);
      setHostAchievements([]);
    };

    const handleWordAlreadyFound = (data: any) => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordAlreadyFound'), { duration: 2000 });
        // Remove the duplicate word that was just added
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => {
            // Keep the first occurrence, remove subsequent duplicates
            let foundFirst = false;
            return prev.filter(w => {
              if (w.toLowerCase() === wordLower) {
                if (!foundFirst) {
                  foundFirst = true;
                  return true;
                }
                return false;
              }
              return true;
            });
          });
        }
        resetCombo();
      }
    };

    const handleWordNotOnBoard = (data: any) => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 3000 });
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    const handleWordRejected = (data: any) => {
      if (hostPlaying) {
        const reason = data.reason === 'notInDictionary'
          ? (t('playerView.notInDictionary') || 'Not in dictionary')
          : (t('playerView.wordRejected') || 'Word rejected');
        wordErrorToast(`${data.word}: ${reason}`, { duration: 3000 });
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    const handleWordNeedsValidation = (data: any) => {
      if (hostPlaying) {
        wordNeedsValidationToast(data.word, { pendingLabel: t('common.pending'), duration: 3000 });
        // Word stays in list - host can decide whether to validate it
        resetCombo();
      }
    };

    const handleTournamentCreated = (data: any) => {
      if (tournamentTimeoutRef.current) {
        clearTimeout(tournamentTimeoutRef.current);
        tournamentTimeoutRef.current = null;
      }
      setTournamentCreating(false);
      setTournamentData(data.tournament);
      neoSuccessToast(`${t('hostView.tournamentMode')}: ${data.tournament.totalRounds} ${t('hostView.rounds')}`, {
        icon: '🏆',
        duration: 4000,
      });
      setTimeout(() => {
        socket.emit('startTournamentRound');
      }, 1500);
    };

    const handleTournamentRoundStarting = (data: any) => {
      setTournamentData(prev => ({
        ...prev,
        currentRound: data.roundNumber,
        standings: data.standings,
      }));
      neoInfoToast(`${t('hostView.tournamentRound')} ${data.roundNumber}/${data.totalRounds}`, {
        icon: '🏁',
        duration: 3000,
      });
    };

    const handleTournamentRoundCompleted = (data: any) => {
      setTournamentData(prev => ({
        ...prev,
        standings: data.standings,
        isComplete: data.isComplete,
      }));

      if (data.isComplete) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
        });
        neoSuccessToast(t('hostView.tournamentComplete'), {
          icon: '🏆',
          duration: 5000,
        });
      }
    };

    const handleTournamentComplete = (data: any) => {
      setTournamentData(prev => ({
        ...prev,
        standings: data.standings,
        isComplete: true,
      }));
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
      });
    };

    const handleTournamentCancelled = () => {
      setTournamentData(null);
      neoErrorToast('Tournament cancelled', {
        icon: '🚫',
        duration: 3000,
      });
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

    const handleWordsForBoard = (data: any) => {
      if (data?.words) {
        setWordsForBoard(data.words);
      }
    };

    // Reconnection and player status handlers
    const handlePlayerDisconnected = (data: any) => {
      logger.log('[HOST] Player disconnected:', data.username);
      neoInfoToast(data.message || `${data.username} disconnected. Waiting for reconnection...`, {
        icon: '📡',
        duration: 3000,
      });
    };

    const handlePlayerReconnected = (data: any) => {
      logger.log('[HOST] Player reconnected:', data.username);
      neoSuccessToast(data.message || `${data.username} reconnected`, {
        icon: '✅',
        duration: 2000,
      });
    };

    const handlePlayerConnectionStatusChanged = (data: { username: string; connectionStatus: 'weak' | 'stable'; message: string }) => {
      logger.log('[HOST] Player connection status changed:', data);
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
      logger.log('[HOST] Player left:', data.username);
      neoInfoToast(data.message || `${data.username} left the room`, {
        icon: '👋',
        duration: 2000,
      });
    };

    // XP and Level Up handlers (for host who is also playing)
    const handleXpGained = (data: XpGainedData) => {
      logger.log('[HOST] XP gained:', data);
      setXpGainedData(data);
      neoSuccessToast(`+${data.xpEarned} ${t('common.xpGained')}`, {
        icon: '⭐',
        duration: 3000
      });
    };

    const handleLevelUp = (data: LevelUpData) => {
      logger.log('[HOST] Level up!', data);
      setLevelUpData(data);
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
    socket.on('playerJoinedLate', handlePlayerJoinedLate);
    socket.on('playerFoundWord', handlePlayerFoundWord);
    socket.on('achievementUnlocked', handleAchievementUnlocked);
    socket.on('liveAchievementUnlocked', handleLiveAchievementUnlocked);
    socket.on('validationComplete', handleValidationComplete);
    socket.on('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('gameStarted', handleGameStarted);
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('tournamentCreated', handleTournamentCreated);
    socket.on('tournamentRoundStarting', handleTournamentRoundStarting);
    socket.on('tournamentRoundCompleted', handleTournamentRoundCompleted);
    socket.on('tournamentComplete', handleTournamentComplete);
    socket.on('tournamentCancelled', handleTournamentCancelled);
    socket.on('wordsForBoard', handleWordsForBoard);
    socket.on('playerDisconnected', handlePlayerDisconnected);
    socket.on('playerReconnected', handlePlayerReconnected);
    socket.on('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('playerPresenceUpdate', handlePlayerPresenceUpdate);
      socket.off('playerJoinedLate', handlePlayerJoinedLate);
      socket.off('playerFoundWord', handlePlayerFoundWord);
      socket.off('achievementUnlocked', handleAchievementUnlocked);
      socket.off('liveAchievementUnlocked', handleLiveAchievementUnlocked);
      socket.off('validationComplete', handleValidationComplete);
      socket.off('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('gameStarted', handleGameStarted);
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordRejected', handleWordRejected);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
      socket.off('tournamentCreated', handleTournamentCreated);
      socket.off('tournamentRoundStarting', handleTournamentRoundStarting);
      socket.off('tournamentRoundCompleted', handleTournamentRoundCompleted);
      socket.off('tournamentComplete', handleTournamentComplete);
      socket.off('tournamentCancelled', handleTournamentCancelled);
      socket.off('wordsForBoard', handleWordsForBoard);
      socket.off('playerDisconnected', handlePlayerDisconnected);
      socket.off('playerReconnected', handlePlayerReconnected);
      socket.off('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
    };
  }, [
    socket,
    t,
    hostPlaying,
    gameStarted,
    // tableData and onShowResults removed - using refs instead to avoid stale closure issues
    username,
    queueAchievement,
    handleWordAccepted,
    resetCombo,
    setPlayersReady,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,
    setFinalScores,
    setRemainingTime,
    setGameStarted,
    setShowStartAnimation,
    setTableData,
    setHostFoundWords,
    setHostAchievements,
    setTournamentData,
    setTournamentCreating,
    setWordsForBoard,
    setXpGainedData,
    setLevelUpData,
    setWaitingForResults,
    intentionalExitRef,
    tournamentTimeoutRef,
  ]);
};

export default useHostSocketEvents;
