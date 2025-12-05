import React, { useState, useEffect, useCallback, useRef } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import { useSocket } from '../utils/SocketContext';
import { clearSessionPreservingUsername } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useAchievementQueue } from '../components/achievements';
import { usePresence } from '../hooks/usePresence';
import logger from '@/utils/logger';

// Extracted components
import PlayerWaitingView from './components/PlayerWaitingView';
import PlayerWaitingResultsView from './components/PlayerWaitingResultsView';
import PlayerInGameView from './components/PlayerInGameView';
// Word feedback modal is now on ResultsPage

// Custom hooks
import usePlayerSocketEvents from './hooks/usePlayerSocketEvents';

const PlayerView = ({ onShowResults, initialPlayers = [], username, gameCode, pendingGameStart, onGameStartConsumed }) => {
  const { t, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const inputRef = useRef(null);
  const intentionalExitRef = useRef(false);

  // Enable presence tracking
  usePresence({ enabled: !!gameCode });

  // Game state
  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [letterGrid, setLetterGrid] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [minWordLength, setMinWordLength] = useState(2);

  // Player state
  const [playersReady, setPlayersReady] = useState(initialPlayers);
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [gameLanguage, setGameLanguage] = useState(null);

  // UI state
  const [showQR, setShowQR] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Track active game session
  const [wasInActiveGame, setWasInActiveGame] = useState(false);

  // Combo system
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState(null);
  const comboTimeoutRef = useRef(null);
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef(null);

  // Combo shield system - protects combo from 1 wrong word per 10 valid words
  const comboShieldsUsedRef = useRef(0);

  // Tournament state
  const [tournamentData, setTournamentData] = useState(null);
  const [tournamentStandings, setTournamentStandings] = useState([]);
  const [showTournamentStandings, setShowTournamentStandings] = useState(false);

  // Word feedback state
  const [showWordFeedback, setShowWordFeedback] = useState(false);
  const [wordToVote, setWordToVote] = useState(null);

  // XP and Level state (for passing to results)
  const [xpGainedData, setXpGainedData] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);

  // Music ref
  const hasTriggeredUrgentMusicRef = useRef(false);

  // Use custom hook for socket events
  usePlayerSocketEvents({
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
    comboShieldsUsedRef,
    foundWords,
    intentionalExitRef,
  });

  // Music effects
  useEffect(() => {
    if (gameActive) {
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      hasTriggeredUrgentMusicRef.current = false;
    }
  }, [gameActive, fadeToTrack, TRACKS]);

  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 20 && remainingTime > 0 && !hasTriggeredUrgentMusicRef.current) {
      hasTriggeredUrgentMusicRef.current = true;
      fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 500, 500);
    }
    if (remainingTime === 0) {
      stopMusic(1500);
    }
  }, [remainingTime, gameActive, fadeToTrack, stopMusic, TRACKS]);

  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 3 && remainingTime > 0) {
      playCountdownBeep(remainingTime);
    }
  }, [remainingTime, gameActive, playCountdownBeep]);

  // Client-side countdown timer - decrements remainingTime every second
  // Server broadcasts time updates every ~10 seconds, so we interpolate locally
  useEffect(() => {
    if (!gameActive || remainingTime === null || remainingTime <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(intervalId);
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameActive, remainingTime === null, remainingTime <= 0]);

  // Keep refs in sync
  useEffect(() => {
    comboLevelRef.current = comboLevel;
  }, [comboLevel]);

  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);

  // Activate game when countdown animation completes (3-2-1-GO!)
  // This ensures the animation plays BEFORE the game board appears
  useEffect(() => {
    // Check if animation just finished and we have game data ready
    if (!showStartAnimation && letterGrid && remainingTime > 0 && !gameActive && !waitingForResults) {
      logger.log('[PLAYER] Countdown animation complete, activating game');
      setGameActive(true);
    }
  }, [showStartAnimation, letterGrid, remainingTime, gameActive, waitingForResults]);

  // Clear shuffling grid when game starts
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
      setHighlightedCells([]);
    }
  }, [gameActive]);

  // Clear game state on mount and cleanup
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    setFoundWords([]);
    setAchievements([]);

    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
    };
  }, []);

  // Update players from props
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

  // Handle pending game start
  useEffect(() => {
    if (pendingGameStart && socket && onGameStartConsumed) {
      logger.log('[PLAYER] Processing pending game start from results page:', pendingGameStart);

      setWasInActiveGame(true);
      setFoundWords([]);
      setAchievements([]);
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) setRemainingTime(pendingGameStart.timerSeconds);
      if (pendingGameStart.language) setGameLanguage(pendingGameStart.language);
      if (pendingGameStart.minWordLength) setMinWordLength(pendingGameStart.minWordLength);
      // Don't set gameActive here - let the countdown animation play first
      // Game will activate when animation completes via the effect above
      setShowStartAnimation(true);

      if (pendingGameStart.messageId) {
        socket.emit('startGameAck', { messageId: pendingGameStart.messageId });
        logger.log('[PLAYER] Sent startGameAck for pending game start, messageId:', pendingGameStart.messageId);
      }

      onGameStartConsumed();
    }
  }, [pendingGameStart, socket, onGameStartConsumed]);

  // Prevent accidental page refresh
  useEffect(() => {
    const shouldWarn = gameActive || foundWords.length > 0 || waitingForResults;
    if (!shouldWarn) return;

    const handleBeforeUnload = (e) => {
      if (intentionalExitRef.current) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameActive, foundWords.length, waitingForResults]);

  // Exit handlers
  const handleExitRoom = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowExitConfirm(true);
  }, []);

  const confirmExitRoom = useCallback(() => {
    logger.log('[PLAYER] Exit confirmed, closing connection');
    intentionalExitRef.current = true;

    try {
      if (socket && gameCode && username) {
        logger.log('[PLAYER] Emitting leaveRoom event');
        socket.emit('leaveRoom', { gameCode, username });
      }
    } catch (error) {
      logger.error('[PLAYER] Error emitting leaveRoom event:', error);
    }

    clearSessionPreservingUsername(username);

    setTimeout(() => {
      try {
        if (socket) {
          socket.disconnect();
        }
      } catch (error) {
        logger.error('[PLAYER] Error disconnecting socket:', error);
      }
      window.location.reload();
    }, 200);
  }, [socket, gameCode, username]);

  // Word submission handler - adds word to list, server will update isValid
  const handleWordSubmit = useCallback((formedWord) => {
    setFoundWords(prev => [...prev, { word: formedWord, isValid: null }]);
  }, []);

  // Render appropriate view
  // Note: waitingForResults state should transition quickly to results page
  // Word feedback modal is now shown on the ResultsPage instead
  if (waitingForResults) {
    return (
      <>
        {showStartAnimation && (
          <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
        )}
        <PlayerWaitingResultsView
          username={username}
          gameCode={gameCode}
          t={t}
          dir={dir}
          leaderboard={leaderboard}
          foundWords={foundWords}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
        />
      </>
    );
  }

  if (!gameActive && !waitingForResults) {
    return (
      <>
        {showStartAnimation && (
          <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
        )}
        <PlayerWaitingView
          gameCode={gameCode}
          gameLanguage={gameLanguage}
          username={username}
          t={t}
          playersReady={playersReady}
          shufflingGrid={shufflingGrid}
          highlightedCells={highlightedCells}
          showQR={showQR}
          setShowQR={setShowQR}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
        />
      </>
    );
  }

  return (
    <>
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
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
        foundWords={foundWords}
        leaderboard={leaderboard}
        tournamentData={tournamentData}
        tournamentStandings={tournamentStandings}
        showTournamentStandings={showTournamentStandings}
        setShowTournamentStandings={setShowTournamentStandings}
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        onExitRoom={handleExitRoom}
        onConfirmExit={confirmExitRoom}
        onWordSubmit={handleWordSubmit}
        setWord={setWord}
      />
    </>
  );
};

export default PlayerView;
