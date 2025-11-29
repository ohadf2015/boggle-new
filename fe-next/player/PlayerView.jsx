import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import Avatar from '../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { wordAcceptedToast, wordNeedsValidationToast, wordErrorToast, neoSuccessToast, neoErrorToast, neoInfoToast } from '../components/NeoToast';
import { FaTrophy, FaDoorOpen, FaUsers, FaCrown, FaRandom, FaLink, FaWhatsapp, FaQrcode } from 'react-icons/fa';
import { useSocket } from '../utils/SocketContext';
import { clearSession, clearSessionPreservingUsername } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useAchievementQueue } from '../components/achievements';
import gsap from 'gsap';
import GridComponent from '../components/GridComponent';
import SlotMachineGrid from '../components/SlotMachineGrid';
import { applyHebrewFinalLetters } from '../utils/utils';
import RoomChat from '../components/RoomChat';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import CircularTimer from '../components/CircularTimer';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../utils/share';
import ShareButton from '../components/ShareButton';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import TournamentStandings from '../components/TournamentStandings';
import SlotMachineText from '../components/SlotMachineText';
import { sanitizeInput } from '../utils/validation';
import logger from '@/utils/logger';

const PlayerView = ({ onShowResults, initialPlayers = [], username, gameCode, pendingGameStart, onGameStartConsumed }) => {
  const { t, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const inputRef = useRef(null);
  const wordListRef = useRef(null);
  const intentionalExitRef = useRef(false);

  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]); // Array of { word: string, isValid: boolean | null }
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [letterGrid, setLetterGrid] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [minWordLength, setMinWordLength] = useState(2);

  const [playersReady, setPlayersReady] = useState(initialPlayers);
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [gameLanguage, setGameLanguage] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Track if player was in an active game session (to distinguish late joiners after game ended)
  const [wasInActiveGame, setWasInActiveGame] = useState(false);

  // Combo system state
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState(null);
  const comboTimeoutRef = useRef(null);
  // Refs for current values (to avoid stale closures in socket handlers)
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef(null);

  // Tournament state
  const [tournamentData, setTournamentData] = useState(null);
  const [tournamentStandings, setTournamentStandings] = useState([]);
  const [showTournamentStandings, setShowTournamentStandings] = useState(false);

  // Track if urgent music has been triggered (to prevent re-triggering)
  const hasTriggeredUrgentMusicRef = useRef(false);

  // Music: Play in_game music when game starts
  useEffect(() => {
    if (gameActive) {
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      hasTriggeredUrgentMusicRef.current = false; // Reset for new game
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameActive]);

  /// Music: Play urgent music when 20 seconds remaining
  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 20 && remainingTime > 0 && !hasTriggeredUrgentMusicRef.current) {
      hasTriggeredUrgentMusicRef.current = true;
      fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 500, 500);
    }
    // Stop music when game ends (remainingTime hits 0)
    if (remainingTime === 0) {
      stopMusic(1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingTime, gameActive]);

  // Countdown beep for last 3 seconds
  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 3 && remainingTime > 0) {
      playCountdownBeep(remainingTime);
    }
  }, [remainingTime, gameActive, playCountdownBeep]);

  // Keep refs in sync with state for socket handlers (avoids stale closures)
  useEffect(() => {
    comboLevelRef.current = comboLevel;
  }, [comboLevel]);

  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);

  // Pre-game shuffling animation - Disabled, now receives from host
  // Players will receive the shuffling grid from the host via socket event
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
      setHighlightedCells([]);
    }
  }, [gameActive]);

  // Clear game state when entering and cleanup combo timeout on unmount
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    setFoundWords([]);
    setAchievements([]);

    // Cleanup combo timeout on unmount to prevent memory leak
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
    };
  }, []);

  // Update players list when initialPlayers prop changes
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

  // Handle pending game start (when player was on results page and game started)
  useEffect(() => {
    if (pendingGameStart && socket && onGameStartConsumed) {
      logger.log('[PLAYER] Processing pending game start from results page:', pendingGameStart);

      // Apply the game start data
      setWasInActiveGame(true);
      setFoundWords([]);
      setAchievements([]);
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) setRemainingTime(pendingGameStart.timerSeconds);
      if (pendingGameStart.language) setGameLanguage(pendingGameStart.language);
      if (pendingGameStart.minWordLength) setMinWordLength(pendingGameStart.minWordLength);
      setGameActive(true);
      setShowStartAnimation(true);

      // Send acknowledgment to server if messageId is present
      if (pendingGameStart.messageId) {
        socket.emit('startGameAck', { messageId: pendingGameStart.messageId });
        logger.log('[PLAYER] Sent startGameAck for pending game start, messageId:', pendingGameStart.messageId);
      }

      neoSuccessToast(t('common.gameStarted'), { id: 'game-started', icon: '🚀', duration: 3000 });

      // Clear the pending game start
      onGameStartConsumed();
    }
  }, [pendingGameStart, socket, onGameStartConsumed, t]);

  // Prevent accidental page refresh/close only when game is active or has data
  useEffect(() => {
    const shouldWarn = gameActive || foundWords.length > 0 || waitingForResults;

    if (!shouldWarn) return;

    const handleBeforeUnload = (e) => {
      // Don't show warning if user is intentionally exiting
      if (intentionalExitRef.current) return;

      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers require a return value
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameActive, foundWords.length, waitingForResults]);

  // Socket.IO event handlers
  useEffect(() => {
    if (!socket) return;

    const handleUpdateUsers = (data) => {
      setPlayersReady(data.users || []);
    };

    const handleShufflingGridUpdate = (data) => {
      if (data.grid) {
        setShufflingGrid(data.grid);
      }
      if (data.highlightedCells !== undefined) {
        setHighlightedCells(data.highlightedCells);
      }
    };

    const handleStartGame = (data) => {
      setWasInActiveGame(true);
      setFoundWords([]);
      setAchievements([]);
      if (data.letterGrid) setLetterGrid(data.letterGrid);
      if (data.timerSeconds) setRemainingTime(data.timerSeconds);
      if (data.language) setGameLanguage(data.language);
      if (data.minWordLength) setMinWordLength(data.minWordLength);
      setGameActive(true);
      setShowStartAnimation(true);

      // Send acknowledgment to server (skip for late-join/reconnect scenarios)
      if (data.messageId && !data.skipAck) {
        socket.emit('startGameAck', { messageId: data.messageId });
        logger.log('[PLAYER] Sent startGameAck for messageId:', data.messageId);
      }

      neoSuccessToast(t('common.gameStarted'), { id: 'game-started', icon: '🚀', duration: 3000 });
    };

    const handleEndGame = () => {
      setGameActive(false);
      setRemainingTime(0);
      if (wasInActiveGame) {
        setWaitingForResults(true);
        toast(t('playerView.gameOver'), {
          duration: 4000,
          style: {
            background: '#FFFEF0',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            borderRadius: '8px',
            fontWeight: '700',
            color: '#000000',
            pointerEvents: 'auto',
          },
          icon: '⏱️',
        });
      }
    };

    const handleWordAccepted = (data) => {
      // Only animate input if it exists (may not exist when using grid swiping)
      if (inputRef.current) {
        gsap.fromTo(inputRef.current,
          { scale: 1.1, borderColor: '#4ade80' },
          { scale: 1, borderColor: '', duration: 0.3 }
        );
      }

      // Mark the word as valid in foundWords
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? { ...fw, isValid: true }
          : fw
      ));

      const now = Date.now();
      let newComboLevel = 0;

      if (data.autoValidated) {
        // Use refs to get current values (avoids stale closure bug)
        const currentComboLevel = comboLevelRef.current;
        const currentLastWordTime = lastWordTimeRef.current;

        // Combo chain window scales with current combo level (3s base + 1s per level, max 10s)
        const comboChainWindow = Math.min(3000 + currentComboLevel * 1000, 10000);
        if (currentLastWordTime && (now - currentLastWordTime) < comboChainWindow) {
          newComboLevel = currentComboLevel + 1;
          setComboLevel(newComboLevel);
          comboLevelRef.current = newComboLevel; // Update ref immediately
          // Play combo sound with increasing pitch
          playComboSound(newComboLevel);
        } else {
          newComboLevel = 0;
          setComboLevel(0);
          comboLevelRef.current = 0; // Update ref immediately
        }
        setLastWordTime(now);
        lastWordTimeRef.current = now; // Update ref immediately

        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }

        // Timeout to reset combo if no word submitted (same scaling)
        const comboTimeout = Math.min(3000 + newComboLevel * 1000, 10000);
        comboTimeoutRef.current = setTimeout(() => {
          setComboLevel(0);
          comboLevelRef.current = 0;
          setLastWordTime(null);
          lastWordTimeRef.current = null;
        }, comboTimeout);
      }

      // Use combo bonus from server response (already calculated correctly)
      // Neo-Brutalist word accepted toast with score and combo bonus
      wordAcceptedToast(data.word, {
        score: data.score || (data.word.length - 1),
        comboBonus: data.comboBonus || 0,
        comboLevel: data.comboLevel || 0,
        duration: 2000
      });
    };

    const handleWordNeedsValidation = (data) => {
      wordNeedsValidationToast(data.word, { duration: 3000 });

      setComboLevel(0);
      comboLevelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleWordAlreadyFound = () => {
      wordErrorToast(t('playerView.wordAlreadyFound'), { duration: 2000 });
      setComboLevel(0);
      comboLevelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleWordNotOnBoard = (data) => {
      wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 3000 });
      // Mark the word as invalid (red-pink) instead of removing it
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? { ...fw, isValid: false }
          : fw
      ));
      setComboLevel(0);
      comboLevelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleWordTooShort = (data) => {
      const msg = t('playerView.wordTooShortMin')
        ? t('playerView.wordTooShortMin').replace('${min}', data.minLength)
        : `Word too short! (min ${data.minLength} letters)`;
      wordErrorToast(msg, { duration: 2000 });
      // Remove the word from found words list
      setFoundWords(prev => prev.filter(fw =>
        fw.word.toLowerCase() !== data.word.toLowerCase()
      ));
      // Reset combo - update both state AND refs to ensure next submission uses correct values
      setComboLevel(0);
      comboLevelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleWordRejected = (data) => {
      // Handle rejected words (e.g., profanity filter)
      wordErrorToast(t('playerView.wordRejected') || 'Word rejected', { duration: 2000 });
      // Remove the word from found words list
      setFoundWords(prev => prev.filter(fw =>
        fw.word.toLowerCase() !== data.word.toLowerCase()
      ));
      // Reset combo
      setComboLevel(0);
      comboLevelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleTimeUpdate = (data) => {
      setRemainingTime(data.remainingTime);

      // If we receive letterGrid in timeUpdate, update it (for late joiners who missed startGame)
      if (data.letterGrid && !letterGrid) {
        logger.log('[PLAYER] Received letterGrid in timeUpdate - late join sync');
        setLetterGrid(data.letterGrid);
      }
      if (data.language && !gameLanguage) {
        setGameLanguage(data.language);
      }

      // Auto-activate game if timer is running and we have the grid
      const hasGrid = letterGrid || data.letterGrid;
      if (!gameActive && data.remainingTime > 0 && hasGrid) {
        logger.log('[PLAYER] Timer started on server, activating game (remainingTime:', data.remainingTime, ')');
        setGameActive(true);
        setShowStartAnimation(true);
      }

      if (data.remainingTime === 0) {
        setGameActive(false);
        setWaitingForResults(true);
      }
    };

    const handleUpdateLeaderboard = (data) => {
      setLeaderboard(data.leaderboard);
    };

    const handleLiveAchievementUnlocked = (data) => {
      // Validate achievement data before processing
      if (!data || !data.achievements || !Array.isArray(data.achievements)) {
        logger.warn('[PLAYER] Received invalid achievement data:', data);
        return;
      }

      logger.log(`[PLAYER] Received ${data.achievements.length} live achievements:`,
        data.achievements.map(a => a?.name || 'unknown').join(', '));

      // Queue achievements for Xbox-style popup display
      data.achievements.forEach(achievement => {
        if (achievement && achievement.name) {
          queueAchievement(achievement);
        } else {
          logger.warn('[PLAYER] Skipping invalid achievement object:', achievement);
        }
      });

      // Filter out any invalid achievements before adding to state
      const validAchievements = data.achievements.filter(a => a && a.name);
      if (validAchievements.length > 0) {
        setAchievements(prev => [...prev, ...validAchievements]);
        logger.log(`[PLAYER] Added ${validAchievements.length} valid achievements to state`);
      }
    };

    const handleValidatedScores = (data) => {
      setWaitingForResults(false);
      if (onShowResults) {
        onShowResults({
          scores: data.scores,
          letterGrid: data.letterGrid,
        });
      }
    };

    const handleFinalScores = (data) => {
      setTimeout(() => {
        setWaitingForResults(false);
        if (onShowResults) {
          onShowResults({
            scores: data.scores,
            letterGrid: letterGrid,
          });
        }
      }, 10000);
    };

    const handleHostLeftRoomClosing = (data) => {
      intentionalExitRef.current = true;
      // Preserve username in localStorage for smooth fallback to lobby
      clearSessionPreservingUsername(username);
      neoErrorToast(data.message || t('playerView.roomClosed'), { icon: '🚪', duration: 5000 });
      setTimeout(() => {
        socket.disconnect();
        window.location.reload();
      }, 2000);
    };

    const handleResetGame = (data) => {
      setGameActive(false);
      setWasInActiveGame(false);
      setFoundWords([]);
      setAchievements([]);
      setLeaderboard([]);
      setRemainingTime(null);
      setWaitingForResults(false);
      setLetterGrid(null);
      // NOTE: Don't clear playersReady here - the server will send updateUsers
      // with the correct player list. Clearing it causes a flash of empty player list.
      neoSuccessToast(data.message || t('common.newGameReady'), { icon: '🔄', duration: 3000 });
    };

    const handleTournamentCreated = (data) => {
      setTournamentData(data.tournament);
      neoSuccessToast(t('hostView.tournamentCreated') || 'Tournament created!', { icon: '🏆', duration: 3000 });
    };

    const handleTournamentRoundStarting = (data) => {
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

    const handleTournamentRoundCompleted = (data) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
    };

    const handleTournamentComplete = (data) => {
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

    const handleTournamentCancelled = (data) => {
      setTournamentData(null);
      setTournamentStandings([]);
      setShowTournamentStandings(false);
      neoErrorToast(data?.message || t('hostView.tournamentCancelled'), { icon: '❌', duration: 3000 });
    };

    // Handle generic errors from server (game state issues, invalid submissions)
    const handleError = (data) => {
      const message = data?.message || t('playerView.errorOccurred') || 'An error occurred';
      wordErrorToast(message, { duration: 3000 });
    };

    // Handle rate limiting feedback
    const handleRateLimited = () => {
      wordErrorToast(t('playerView.tooFast') || 'Slow down! Submitting too fast', { duration: 2000 });
    };

    // Register all event listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('shufflingGridUpdate', handleShufflingGridUpdate);
    socket.on('startGame', handleStartGame);
    socket.on('endGame', handleEndGame);
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
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

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('shufflingGridUpdate', handleShufflingGridUpdate);
      socket.off('startGame', handleStartGame);
      socket.off('endGame', handleEndGame);
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
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
    };
  // Note: comboLevel and lastWordTime removed from deps - we use refs to avoid stale closures
  }, [socket, onShowResults, t, letterGrid, wasInActiveGame, gameActive, gameLanguage, queueAchievement, playComboSound]);

  const submitWord = useCallback(() => {
    if (!word.trim() || !gameActive) return;

    // Language validation - ONLY use game language (never UI language)
    // Game language is set when the game starts from the server
    const currentLang = gameLanguage; // Don't fallback to UI language!
    if (!currentLang) {
      // Game hasn't started yet, shouldn't happen
      return;
    }

    let regex;
    if (currentLang === 'he') {
      regex = /^[\u0590-\u05FF]+$/;
    } else if (currentLang === 'sv') {
      regex = /^[a-zA-ZåäöÅÄÖ]+$/;
    } else if (currentLang === 'ja') {
      regex = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
    } else {
      regex = /^[a-zA-Z]+$/;
    }
    const trimmedWord = sanitizeInput(word, 20).trim();

    // Min length validation
    if (trimmedWord.length < minWordLength) {
      const msg = t('playerView.wordTooShortMin')
        ? t('playerView.wordTooShortMin').replace('${min}', minWordLength)
        : `Word too short! (min ${minWordLength} letters)`;
      wordErrorToast(msg, { duration: 2000 });
      return;
    }

    if (!regex.test(trimmedWord)) {
      wordErrorToast(t('playerView.onlyLanguageWords'), { duration: 2500 });
      setWord('');

      // Keep focus on input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    socket.emit('submitWord', {
      word: trimmedWord.toLowerCase(),
      comboLevel: comboLevelRef.current,
    });

    setFoundWords(prev => [...prev, { word: trimmedWord, isValid: null }]);
    setWord('');

    // Keep focus on input and prevent scroll
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.scrollIntoView({ behavior: 'instant', block: 'nearest' });


    }
  }, [word, gameActive, socket, t, gameLanguage, minWordLength]);

  const removeWord = (index) => {
    if (!gameActive) return;
    setFoundWords(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submitWord();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedSecs = secs < 10 ? `0${secs}` : secs;
    return `${mins}:${paddedSecs}`;
  };

  const handleExitRoom = (e) => {
    // Prevent any event bubbling that might interfere
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    logger.log('[PLAYER] Exit confirmed, closing connection');
    intentionalExitRef.current = true;

    // Emit explicit leave event BEFORE disconnecting
    try {
      if (socket && gameCode && username) {
        logger.log('[PLAYER] Emitting leaveRoom event');
        socket.emit('leaveRoom', { gameCode, username });
      }
    } catch (error) {
      logger.error('[PLAYER] Error emitting leaveRoom event:', error);
    }

    // Preserve username in localStorage for smooth fallback to lobby
    clearSessionPreservingUsername(username);

    // Safely disconnect socket after a brief delay to allow event to send
    setTimeout(() => {
      try {
        if (socket) {
          socket.disconnect();
        }
      } catch (error) {
        logger.error('[PLAYER] Error disconnecting socket:', error);
      }

      // Force reload after disconnect
      window.location.reload();
    }, 200);
  };

  // Show waiting for results screen after game ends - NEO-BRUTALIST STYLE
  if (waitingForResults) {
    return (
      <div className="min-h-screen bg-neo-cream p-3 sm:p-4 md:p-8 flex flex-col transition-colors duration-300">

        {/* Exit Button - Neo-Brutalist */}
        <div className="w-full max-w-md mx-auto flex justify-end mb-4 relative z-50">
          <Button
            type="button"
            onClick={handleExitRoom}
            size="sm"
            className="bg-neo-red text-neo-white border-4 border-neo-black shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-black"
          >
            <FaDoorOpen className="mr-2" />
            {t('playerView.exit')}
          </Button>
        </div>

        {/* Centered Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl w-full space-y-4 sm:space-y-6 md:space-y-8">
            {/* Waiting for Results Message - Neo-Brutalist */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="text-center"
            >
              <div className="bg-neo-yellow border-4 border-neo-black shadow-hard-lg p-6 sm:p-8 md:p-10 rotate-[1deg]">
                {/* Neo-Brutalist Hourglass Animation */}
                <div className="mb-6">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block bg-neo-pink border-4 border-neo-black shadow-hard p-3"
                  >
                    <div className="relative w-12 h-16 flex flex-col items-center">
                      {/* Top triangle */}
                      <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[24px] border-l-transparent border-r-transparent border-t-neo-black" />
                      {/* Middle neck */}
                      <div className="w-2 h-1 bg-neo-black -my-[2px] z-10" />
                      {/* Bottom triangle */}
                      <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[24px] border-l-transparent border-r-transparent border-b-neo-black" />
                      {/* Falling sand animation */}
                      <motion.div
                        animate={{ y: [0, 20, 0], opacity: [1, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[24px] w-1 h-2 bg-neo-cyan"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Title - Neo-Brutalist */}
                <div className="bg-neo-black text-neo-white px-6 py-4 font-black uppercase text-2xl md:text-3xl tracking-wider shadow-hard border-4 border-neo-black mb-4">
                  {t('playerView.waitingForResults')}
                </div>

                {/* Subtitle */}
                <p className="text-neo-black font-bold text-base uppercase tracking-wide">
                  {t('playerView.hostValidating') || 'Host is validating words...'}
                </p>

                {/* Decorative animated dots */}
                <div className="flex gap-3 mt-6 justify-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.3, 1], y: [0, -8, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-4 h-4 bg-neo-black border-2 border-neo-black"
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Leaderboard - Neo-Brutalist */}
            {leaderboard.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0, rotate: 1 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                className="rotate-[-0.5deg]"
              >
                <div className="bg-neo-cream border-4 border-neo-black shadow-hard-lg overflow-hidden">
                  {/* Header */}
                  <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
                    <h3 className="flex items-center gap-2 text-neo-white text-xl uppercase tracking-wider font-black">
                      <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
                      {t('playerView.leaderboard')}
                    </h3>
                  </div>
                  {/* Content */}
                  <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {leaderboard.map((player, index) => {
                      const isMe = player.username === username;
                      const getRankStyle = () => {
                        if (index === 0) return 'bg-neo-yellow text-neo-black';
                        if (index === 1) return 'bg-slate-300 text-neo-black';
                        if (index === 2) return 'bg-neo-orange text-neo-black';
                        return 'bg-neo-cream text-neo-black border-neo-black border-3';
                      };
                      return (
                        <motion.div
                          key={player.username}
                          initial={{ x: 50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black shadow-hard-sm transition-all
                            hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                            ${getRankStyle()} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                        >
                          <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-white border-2 border-neo-black">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <Avatar
                            profilePictureUrl={player.avatar?.profilePictureUrl}
                            avatarEmoji={player.avatar?.emoji}
                            avatarColor={player.avatar?.color}
                            size="md"
                          />
                          <div className="flex-1">
                            <div className={`font-black flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <SlotMachineText text={player.username} />
                              {isMe && (
                                <span className="text-xs bg-neo-black text-neo-white px-2 py-0.5 rounded-neo font-bold border-2 border-neo-black">
                                  ({t('playerView.me')})
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-bold opacity-75">{player.wordCount} {t('playerView.wordCount')}</div>
                          </div>
                          <div className="text-2xl font-black">
                            {player.score}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Chat Section - Neo-Brutalist */}
            <motion.div
              initial={{ y: 20, opacity: 0, rotate: -1 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.3 }}
              className="rotate-[0.5deg]"
            >
              <RoomChat
                username={username}
                isHost={false}
                gameCode={gameCode}
                className="min-h-[300px]"
              />
            </motion.div>
          </div>
        </div>

        {/* Exit Confirmation Dialog */}
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
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
                onClick={confirmExitRoom}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show waiting screen if game hasn't started yet - matches HostView layout
  if (!gameActive && !waitingForResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 overflow-auto transition-colors duration-300">

        {/* Top Bar with Exit Button */}
        <div className="w-full max-w-6xl flex justify-end mb-4">
          <Button
            type="button"
            onClick={handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer"
          >
            <FaDoorOpen className="mr-2" />
            {t('playerView.exit')}
          </Button>
        </div>

        {/* Main Layout - matches HostView structure */}
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl">

          {/* Row 1: Room Code + Language + Share Buttons */}
          <Card className="bg-slate-800/95 text-white p-3 sm:p-4 md:p-6 border-4 border-slate-700 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Room Code and Language */}
              <div className="flex flex-col items-center sm:items-start gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-cyan-400 font-bold uppercase">{t('hostView.roomCode')}:</p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-wide text-yellow-400">
                      {gameCode}
                    </h2>
                  </div>
                  {gameLanguage && (
                    <Badge className="text-base sm:text-lg px-3 py-1 bg-slate-200 text-slate-800 border-2 border-slate-600 font-bold">
                      {gameLanguage === 'he' ? '🇮🇱 עברית' : gameLanguage === 'sv' ? '🇸🇪 Svenska' : gameLanguage === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                <ShareButton
                  variant="link"
                  onClick={() => copyJoinUrl(gameCode, t)}
                  icon={<FaLink />}
                >
                  {t('joinView.copyLink')}
                </ShareButton>
                <ShareButton
                  variant="whatsapp"
                  onClick={() => shareViaWhatsApp(gameCode, '', t)}
                  icon={<FaWhatsapp />}
                >
                  {t('joinView.shareWhatsapp')}
                </ShareButton>
                <ShareButton
                  variant="qr"
                  onClick={() => setShowQR(true)}
                  icon={<FaQrcode />}
                >
                  {t('hostView.qrCode')}
                </ShareButton>
              </div>
            </div>
          </Card>

          {/* Row 2: Waiting Message (instead of settings) + Players List */}
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4 md:gap-6">
            {/* Waiting Message Card - LEFT (replaces game settings) - NEO-BRUTALIST */}
            <div className="flex-1 p-4 sm:p-6 md:p-8 bg-slate-800/95 border-4 border-neo-black shadow-hard flex flex-col items-center justify-center rotate-[-0.5deg]">
              <motion.div
                initial={{ scale: 0.9, rotate: -3 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                {/* Decorative background shapes */}
                <div className="absolute -top-4 -right-6 w-20 h-20 bg-neo-pink border-4 border-neo-black rotate-12 -z-10" />
                <div className="absolute -bottom-4 -left-6 w-16 h-16 bg-neo-cyan border-4 border-neo-black -rotate-6 -z-10" />
                <div className="absolute top-1/2 -right-10 w-10 h-10 bg-neo-yellow border-3 border-neo-black rotate-45 -z-10" />

                {/* Neo-Brutalist Hourglass */}
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-neo-yellow border-4 border-neo-black shadow-hard p-4 rotate-[2deg]"
                >
                  <div className="relative w-16 h-20 flex flex-col items-center">
                    {/* Top triangle (sand container) */}
                    <div className="w-0 h-0 border-l-[28px] border-r-[28px] border-t-[32px] border-l-transparent border-r-transparent border-t-neo-black" />
                    {/* Middle neck */}
                    <div className="w-2 h-1 bg-neo-black -my-[2px] z-10" />
                    {/* Bottom triangle (sand collecting) */}
                    <div className="w-0 h-0 border-l-[28px] border-r-[28px] border-b-[32px] border-l-transparent border-r-transparent border-b-neo-black" />
                    {/* Falling sand animation */}
                    <motion.div
                      animate={{ y: [0, 24, 0], opacity: [1, 1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute top-[32px] w-1 h-3 bg-neo-pink"
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Text with Neo-Brutalist styling */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-center"
              >
                <div className="bg-neo-black text-neo-white px-6 py-3 font-black uppercase text-xl md:text-2xl tracking-wider rotate-[1deg] shadow-hard border-4 border-neo-black">
                  {t('playerView.waitForGameStart')}
                </div>
                <motion.p
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-slate-400 font-bold text-sm mt-4 uppercase tracking-wide"
                >
                  {t('playerView.waitingForHostToStart') || 'Waiting for host to start the game...'}
                </motion.p>
              </motion.div>

              {/* Decorative dots */}
              <div className="flex gap-3 mt-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="w-4 h-4 bg-neo-pink border-2 border-neo-black"
                  />
                ))}
              </div>
            </div>

            {/* Players List - RIGHT */}
            <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-white border-4 border-slate-700 shadow-lg">
              <h3 className="text-lg font-black uppercase text-slate-200 mb-4 flex items-center gap-2 flex-shrink-0">
                <FaUsers className="text-purple-400" />
                {t('playerView.players')} ({playersReady.length})
              </h3>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                <AnimatePresence>
                  {playersReady.map((player, index) => {
                    const playerUsername = typeof player === 'string' ? player : player.username;
                    const avatar = typeof player === 'object' ? player.avatar : null;
                    const isHost = typeof player === 'object' ? player.isHost : false;
                    const isMe = playerUsername === username;

                    return (
                      <motion.div
                        key={playerUsername}
                        initial={{ scale: 0, opacity: 0, rotate: -5 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Badge
                          className={`font-black px-3 py-2 text-base w-full justify-between border-2 border-slate-600 shadow-md ${
                            isHost ? "bg-yellow-500 text-slate-900" : "bg-slate-200 text-slate-900"
                          }`}
                          style={avatar?.color && !isHost ? { backgroundColor: avatar.color } : {}}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar
                              profilePictureUrl={avatar?.profilePictureUrl}
                              avatarEmoji={avatar?.emoji}
                              avatarColor={avatar?.color}
                              size="sm"
                            />
                            {isHost && <FaCrown className="text-slate-900" />}
                            <SlotMachineText text={playerUsername} />
                            {isMe && (
                              <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full">
                                ({t('playerView.me')})
                              </span>
                            )}
                          </div>
                        </Badge>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {playersReady.length === 0 && (
                <p className="text-sm text-center text-slate-400 font-bold mt-2">
                  {t('hostView.waitingForPlayers')}
                </p>
              )}
            </Card>
          </div>

          {/* Row 3: Letter Grid + Chat */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
            {/* Letter Grid - LEFT */}
            <Card className="flex-1 p-1 sm:p-3 flex flex-col items-center bg-slate-800/95 border-4 border-slate-700 shadow-lg">
              <div className="w-full flex justify-center items-center transition-all duration-500 aspect-square max-w-full">
                <div className="w-full h-full flex items-center justify-center">
                  {shufflingGrid ? (
                    <SlotMachineGrid
                      grid={shufflingGrid}
                      highlightedCells={highlightedCells}
                      language={gameLanguage || 'en'}
                      className="w-full h-full"
                      animationDuration={600}
                      staggerDelay={40}
                      animationPattern="cascade"
                    />
                  ) : (
                    // Loading skeleton for the grid
                    <div className="w-full aspect-square grid grid-cols-4 gap-2 p-4">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="aspect-square rounded-lg bg-slate-700/50"
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.05,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Chat - RIGHT */}
            <div className="lg:w-[350px] xl:w-[400px]">
              <RoomChat
                username={username}
                isHost={false}
                gameCode={gameCode}
                className="h-full min-h-[400px]"
              />
            </div>
          </div>
        </div>

        {/* QR Code Dialog */}
        <Dialog open={showQR} onOpenChange={setShowQR}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-cyan-500/30">
            <DialogHeader>
              <DialogTitle className="text-center text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-2">
                <FaQrcode />
                {t('joinView.qrCodeTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" includeMargin />
              </div>
              <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{gameCode}</h4>
              <p className="text-sm text-center text-slate-500 dark:text-slate-400">
                {t('joinView.scanToJoin')} {gameCode}
              </p>
              <p className="text-xs text-center text-slate-500">
                {getJoinUrl(gameCode)}
              </p>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                onClick={() => setShowQR(false)}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              >
                {t('common.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Exit Confirmation Dialog */}
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
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
                onClick={confirmExitRoom}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Normal game UI (when game is active or waiting for results)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-0 md:p-4 flex flex-col transition-colors duration-300">

      {/* GO Animation */}
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
      )}

      {/* Top Bar with Title and Exit Button */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-1">
        <Button
          type="button"
          onClick={handleExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer relative z-50"
        >
          <FaDoorOpen className="mr-2" />
          {t('playerView.exit')}
        </Button>
      </div>

      {/* Timer with Circular Progress */}
      {remainingTime !== null && gameActive && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center mb-1 md:mb-2 relative z-10"
        >
          <CircularTimer remainingTime={remainingTime} totalTime={180} />
        </motion.div>
      )}

      {/* Tournament Progress Banner */}
      {tournamentData && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto mb-2"
        >
          <Card className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 dark:from-purple-700/90 dark:to-pink-700/90 backdrop-blur-md border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <CardContent className="py-2 px-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FaTrophy className="text-yellow-300 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <div>
                    <div className="text-white font-bold text-sm md:text-base">
                      {tournamentData.name || t('hostView.tournament')}
                    </div>
                    <div className="text-purple-100 text-xs md:text-sm">
                      {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} / {tournamentData.totalRounds || 3}
                    </div>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
                  {t('hostView.tournamentProgress')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 3 Column Layout: Found Words | Grid | Ranking */}
      <div className="flex flex-col lg:flex-row gap-0 md:gap-2 max-w-7xl mx-auto flex-grow w-full overflow-hidden">
        {/* Left Column: Found Words (Hidden on mobile, shown on desktop) - Neo-Brutalist */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2 min-h-0">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[60vh] overflow-hidden"
            style={{ transform: 'rotate(1deg)' }}
          >
            {/* Header */}
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan">
              <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
                {t('playerView.wordsFound')}
              </h3>
            </div>
            {/* Content with fixed height */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              <div className="space-y-2" ref={wordListRef}>
                <AnimatePresence>
                  {foundWords.map((foundWordObj, index) => {
                    const wordText = foundWordObj.word;
                    const isInvalid = foundWordObj.isValid === false;
                    const isLatest = index === foundWords.length - 1;
                    return (
                      <motion.div
                        key={index}
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all
                          ${isInvalid
                            ? 'bg-neo-red text-neo-cream shadow-hard-sm line-through opacity-70'
                            : isLatest
                              ? 'bg-neo-yellow text-neo-black shadow-hard'
                              : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'}`}
                      >
                        {applyHebrewFinalLetters(wordText).toUpperCase()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {foundWords.length === 0 && gameActive && (
                  <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                    {t('playerView.noWordsYet') || 'No words found yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Letter Grid */}
        <div className="flex-1 flex flex-col gap-0 md:gap-2 min-w-0 min-h-0">
          <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border-0 md:border border-cyan-500/40 shadow-none md:shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
            <CardContent className="flex-grow flex flex-col items-center justify-center p-0 md:p-2 bg-slate-900/90">
              {(letterGrid || shufflingGrid) ? (
                <>
                  <GridComponent
                    key={letterGrid ? 'game-grid' : 'waiting-grid'}
                    grid={letterGrid || shufflingGrid}
                    interactive={gameActive}
                    animateOnMount={!!letterGrid}
                    onWordSubmit={(formedWord) => {
                      // Direct submission logic - ONLY use game language
                      const currentLang = gameLanguage;
                      if (!currentLang) return; // Game hasn't started

                      let regex;
                      if (currentLang === 'he') {
                        regex = /^[\u0590-\u05FF]+$/;
                      } else if (currentLang === 'sv') {
                        regex = /^[a-zA-ZåäöÅÄÖ]+$/;
                      } else if (currentLang === 'ja') {
                        regex = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
                      } else {
                        regex = /^[a-zA-Z]+$/;
                      }

                      if (formedWord.length < minWordLength) {
                        const msg = t('playerView.wordTooShortMin')
                          ? t('playerView.wordTooShortMin').replace('${min}', minWordLength)
                          : `Word too short! (min ${minWordLength} letters)`;
                        wordErrorToast(msg, { duration: 1000 });
                        return;
                      }

                      if (regex.test(formedWord)) {
                        socket.emit('submitWord', {
                          word: formedWord.toLowerCase(),
                          comboLevel: comboLevelRef.current,
                        });
                        setFoundWords(prev => [...prev, { word: formedWord, isValid: null }]);
                      } else {
                        wordErrorToast(t('playerView.onlyLanguageWords'), { duration: 1000 });
                      }
                      setWord(''); // Clear input
                    }}
                    playerView={true}
                    comboLevel={comboLevel}
                    className="w-full max-w-full md:max-w-2xl"
                  />

                  {/* Shuffle Button - Only visible for host in waiting state */}
                  {!gameActive && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600"
                        disabled
                      >
                        <FaRandom className="mr-2" />
                        {t('playerView.shuffle') || 'SHUFFLE'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                // Loading skeleton for the grid while waiting
                <div className="w-full max-w-full md:max-w-2xl aspect-square grid grid-cols-4 gap-1 sm:gap-3 p-0 sm:p-4">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="aspect-square rounded-xl bg-slate-700/50"
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile: Word count display (input removed - use board to form words) */}
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-3">
                <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                  {foundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('playerView.swipeToFormWords') || 'Swipe on the board to form words'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Live Ranking - Neo-Brutalist */}
        <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow"
            style={{ transform: 'rotate(-1deg)' }}
          >
            {/* Header */}
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
              <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
                <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
                {t('playerView.leaderboard')}
              </h3>
            </div>
            {/* Content */}
            <div className="overflow-y-auto flex-1 p-3">
              <div className="space-y-2">
                {leaderboard.map((player, index) => {
                  const isMe = player.username === username;
                  // Neo-Brutalist rank colors (solid, no gradients)
                  const getRankStyle = () => {
                    if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
                    if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
                    if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
                    return 'bg-neo-cream text-neo-black border-neo-black';
                  };
                  return (
                  <motion.div
                    key={player.username}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
                      hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                      ${getRankStyle()} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <Avatar
                      profilePictureUrl={player.avatar?.profilePictureUrl}
                      avatarEmoji={player.avatar?.emoji}
                      avatarColor={player.avatar?.color}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`font-black truncate text-base flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <SlotMachineText text={player.username} />
                        {isMe && (
                          <span className="text-xs bg-neo-black text-neo-cream px-2 py-0.5 rounded-neo font-bold">
                            ({t('playerView.me')})
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold">{player.score} pts</div>
                    </div>
                  </motion.div>
                );
                })}
                {leaderboard.length === 0 && (
                  <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                    {t('playerView.noPlayersYet') || 'No players yet'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Component - Desktop only */}
          <div className="hidden lg:block">
            <RoomChat
              username={username}
              isHost={false}
              gameCode={gameCode}
              className="max-h-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Tournament Standings Modal */}
      <Dialog open={showTournamentStandings} onOpenChange={setShowTournamentStandings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
              {tournamentData?.status === 'completed' ? t('hostView.tournamentComplete') : t('hostView.tournamentStandings')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TournamentStandings
              standings={tournamentStandings}
              tournament={tournamentData}
              isComplete={tournamentData?.status === 'completed'}
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowTournamentStandings(false)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
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
              onClick={confirmExitRoom}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default PlayerView;
