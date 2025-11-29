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
  setPlayerWords: React.Dispatch<React.SetStateAction<any[]>>;
  setShowValidation: React.Dispatch<React.SetStateAction<boolean>>;
  setValidations: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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
  setPlayerWords,
  setShowValidation,
  setValidations,
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
  // Handle word accepted (for host playing)
  const handleWordAccepted = useCallback((data: any) => {
    if (!hostPlaying) return;

    const now = Date.now();
    let newComboLevel: number;
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

    const baseScore = data.word.length - 1;
    const comboBonus = (data.score || baseScore) - baseScore;

    wordAcceptedToast(data.word, {
      score: data.score || baseScore,
      comboBonus: comboBonus > 0 ? comboBonus : 0,
      comboLevel: newComboLevel,
      duration: 2000
    });
  }, [hostPlaying, playComboSound, setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef]);

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

    const handleShowValidation = (data: any) => {
      if (data.skipValidation) {
        const validationArray: any[] = [];
        data.playerWords.forEach((player: any) => {
          player.words.forEach((wordObj: any) => {
            if (!validationArray.some(v => v.word === wordObj.word)) {
              validationArray.push({
                word: wordObj.word,
                isValid: wordObj.autoValidated,
              });
            }
          });
        });

        socket.emit('validateWords', { validations: validationArray });

        neoSuccessToast(t('hostView.allWordsAutoValidated') || 'All words auto-validated!', {
          icon: '✅',
          duration: 3000,
        });
        return;
      }

      setPlayerWords(data.playerWords);
      setShowValidation(true);
      const initialValidations: Record<string, boolean> = {};
      const uniqueWords = new Set<string>();
      data.playerWords.forEach((player: any) => {
        player.words.forEach((wordObj: any) => {
          uniqueWords.add(wordObj.word);
          if (wordObj.autoValidated) {
            initialValidations[wordObj.word] = true;
          }
        });
      });
      uniqueWords.forEach(word => {
        if (initialValidations[word] === undefined) {
          initialValidations[word] = false;
        }
      });
      setValidations(initialValidations);

      if (data.autoValidatedCount > 0) {
        neoSuccessToast(`${data.autoValidatedCount} ${t('hostView.autoValidatedCount')}`, {
          duration: 5000,
          icon: '✅',
        });
      }

      neoInfoToast(t('hostView.validateWords'), {
        icon: '✅',
        duration: 5000,
      });
    };

    const handleValidationComplete = (data: any) => {
      logger.log('[HOST] Received validationComplete event:', data);
      setShowValidation(false);
      neoSuccessToast(t('hostView.validationComplete'), {
        icon: '🎉',
        duration: 3000,
      });
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
      if (onShowResults) {
        onShowResults({
          scores: data.scores,
          letterGrid: tableData
        });
      } else {
        setFinalScores(data.scores);
      }
    };

    const handleAutoValidationOccurred = (data: any) => {
      neoInfoToast(data.message || t('hostView.autoValidationCompleted'), {
        icon: '⏱️',
        duration: 4000,
      });
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
      setShowStartAnimation(true);
      setPlayerWordCounts({});
      setPlayerScores({});
      setHostFoundWords([]);
      setHostAchievements([]);
    };

    const handleWordAlreadyFound = () => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordAlreadyFound'), { duration: 2000 });
        resetCombo();
      }
    };

    const handleWordNotOnBoard = (data: any) => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 3000 });
        setHostFoundWords(prev => prev.filter(w => w !== data.word));
        resetCombo();
      }
    };

    const handleWordRejected = (data: any) => {
      if (hostPlaying) {
        const reason = data.reason === 'notInDictionary'
          ? (t('playerView.notInDictionary') || 'Not in dictionary')
          : (t('playerView.wordRejected') || 'Word rejected');
        wordErrorToast(`${data.word}: ${reason}`, { duration: 3000 });
        setHostFoundWords(prev => prev.filter(w => w !== data.word));
        resetCombo();
      }
    };

    const handleWordNeedsValidation = (data: any) => {
      if (hostPlaying) {
        wordNeedsValidationToast(data.word, { duration: 3000 });
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
      console.log('[PRESENCE] Host received playerPresenceUpdate:', data);
      const { username: playerUsername, presenceStatus, isWindowFocused } = data;
      setPlayersReady(prev => {
        console.log('[PRESENCE] Host current playersReady:', prev);
        const updated = prev.map(player => {
          const name = typeof player === 'string' ? player : player.username;
          if (name === playerUsername) {
            const newPlayer: Player = typeof player === 'string'
              ? { username: player, presenceStatus, isWindowFocused }
              : { ...player, presenceStatus, isWindowFocused };
            console.log('[PRESENCE] Host updated player:', newPlayer);
            return newPlayer;
          }
          return player;
        });
        console.log('[PRESENCE] Host updated playersReady:', updated);
        return updated;
      });
    };

    const handleWordsForBoard = (data: any) => {
      if (data?.words) {
        setWordsForBoard(data.words);
      }
    };

    // Register all event listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('playerPresenceUpdate', handlePlayerPresenceUpdate);
    socket.on('playerJoinedLate', handlePlayerJoinedLate);
    socket.on('playerFoundWord', handlePlayerFoundWord);
    socket.on('achievementUnlocked', handleAchievementUnlocked);
    socket.on('liveAchievementUnlocked', handleLiveAchievementUnlocked);
    socket.on('showValidation', handleShowValidation);
    socket.on('validationComplete', handleValidationComplete);
    socket.on('autoValidationOccurred', handleAutoValidationOccurred);
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

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('playerPresenceUpdate', handlePlayerPresenceUpdate);
      socket.off('playerJoinedLate', handlePlayerJoinedLate);
      socket.off('playerFoundWord', handlePlayerFoundWord);
      socket.off('achievementUnlocked', handleAchievementUnlocked);
      socket.off('liveAchievementUnlocked', handleLiveAchievementUnlocked);
      socket.off('showValidation', handleShowValidation);
      socket.off('validationComplete', handleValidationComplete);
      socket.off('autoValidationOccurred', handleAutoValidationOccurred);
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
    };
  }, [
    socket,
    t,
    hostPlaying,
    gameStarted,
    tableData,
    username,
    queueAchievement,
    onShowResults,
    handleWordAccepted,
    resetCombo,
    setPlayersReady,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,
    setPlayerWords,
    setShowValidation,
    setValidations,
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
    intentionalExitRef,
    tournamentTimeoutRef,
  ]);
};

export default useHostSocketEvents;
