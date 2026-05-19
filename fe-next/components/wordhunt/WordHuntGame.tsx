'use client';

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { validateWordLocally, couldBeOnBoard } from '@/utils/clientWordValidator';
import { useWordHuntMultiplayerBridge } from './hooks/useWordHuntMultiplayerBridge';
import { WordHuntGameLayout } from './WordHuntGameLayout';
import { WordHuntDangerToast } from './WordHuntDangerToast';
import { LowHPOverlay } from './LowHPOverlay';
import { WordHuntCategoryHint } from './WordHuntCategoryHint';
import { WordHuntFirstTimeNudges } from './WordHuntFirstTimeNudges';
import { WordHuntQuickRules } from './WordHuntQuickRules';
import { useWordHuntDangerAlerts } from '@/hooks/useWordHuntDangerAlerts';
import { useMPFTUEIdle } from '@/hooks/useMPFTUEIdle';
import { trackMpFtue } from '@/utils/posthogEngagement';
import type { DeathRecapStats, DeathCause } from './WordHuntDeathRecap';
import type { Socket } from 'socket.io-client';
import type { LetterGrid, Language } from '@/types';
import type { WordFeedback } from '@/components/game/WordFormingArea';

const QUICK_RULES_STORAGE_KEY = 'lexiclash_wh_rules_seen';

export interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
}

export interface WordHuntGameProps {
  grid: LetterGrid;
  gameLanguage: Language | null;
  leaderboard: LeaderboardEntry[];
  username: string;
  score: number;
  onQuit: () => void;
  onWordSubmit: (word: string) => void;
  onWordHuntGuess: (guess: string) => void;
  gameActive: boolean;
  minWordLength: number;
  socket: Socket | null;
  foundWords: Array<{ word: string; isValid?: boolean | null; score?: number; duplicate?: boolean }>;
}

export const WordHuntGame = memo<WordHuntGameProps>(({
  grid,
  gameLanguage,
  leaderboard,
  username,
  score,
  onQuit,
  onWordSubmit,
  onWordHuntGuess,
  gameActive,
  minWordLength,
  socket,
  foundWords,
}) => {
  const { t, dir } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();

  // Enable sound gate on mount
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  // Bridge: convert Zustand MP state → SP-compatible props
  const bridge = useWordHuntMultiplayerBridge();

  // Self-heal missing target metadata. If startGame was lost (clue tiles invisible),
  // poll server via requestGameState. Recovery startGame carries wordHuntTargetLength;
  // client guards apply it on same-session retry now. Cap at 3 attempts.
  const recoveryAttemptsRef = useRef(0);
  useEffect(() => {
    if (!gameActive || !socket || bridge.targetLength > 0) return;
    if (recoveryAttemptsRef.current >= 3) return;
    const t = setTimeout(() => {
      recoveryAttemptsRef.current += 1;
      socket.emit('requestGameState');
    }, 1500);
    return () => clearTimeout(t);
  }, [gameActive, socket, bridge.targetLength]);

  // Danger alert toasts (own low-life encouragement + opponent danger / eliminated / last standing)
  const { toasts: dangerToasts, dismissToast } = useWordHuntDangerAlerts(username);

  // Quick rules overlay (first time only)
  const [showQuickRules, setShowQuickRules] = useState(() => {
    try { return !localStorage.getItem(QUICK_RULES_STORAGE_KEY); } catch { return true; }
  });
  const handleDismissRules = useCallback(() => {
    setShowQuickRules(false);
    try { localStorage.setItem(QUICK_RULES_STORAGE_KEY, '1'); } catch { /* SSR */ }
  }, []);
  const handleShowHelp = useCallback(() => {
    setShowQuickRules(true);
  }, []);

  // Track survival duration for death recap
  const [survivalSeconds, setSurvivalSeconds] = useState(0);
  const gameStartTimeRef = useRef(0);
  useEffect(() => { gameStartTimeRef.current = Date.now(); }, []);

  // Local swipe/word state
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [wordFeedback, setWordFeedback] = useState<WordFeedback | null>(null);
  const feedbackIdRef = useRef(0);

  // Keyboard input support
  const keyboard = useKeyboardWordInput({
    grid,
    language: gameLanguage || 'en',
    gameLanguage,
    enabled: gameActive && !bridge.isGameOver,
    onWordSubmit: handleWordSubmit,
    minWordLength,
    disablePathHighlighting: true,
  });

  // MP drag-to-spell FTUE — shows after 20s of no drag / no word.
  // Gated on socket presence so solo Survival never triggers it.
  const validWordsFound = foundWords.filter(w => w.isValid !== false && !w.duplicate).length;
  const ftue = useMPFTUEIdle({
    enabled: !!socket && gameActive && !bridge.isGameOver,
    wordsFound: validWordsFound,
    onShown: () => trackMpFtue({ event: 'shown', mode: 'word_hunt' }),
  });

  // Handle word change from grid swiping
  const handleWordChange = useCallback((word: string, count: number) => {
    if (count > 0) ftue.markActivity();
    setFormedWord(word);
    setLetterCount(count);
  }, [ftue]);

  // Handle word submission — validate locally, emit to server, dual submission
  function handleWordSubmit(word: string) {
    const lang = gameLanguage || 'en';

    // Client-side validation
    const validation = validateWordLocally(word, lang, minWordLength, foundWords);
    if (!validation.isValid) {
      feedbackIdRef.current += 1;
      setWordFeedback({
        id: String(feedbackIdRef.current),
        type: validation.errorKey === 'playerView.wordAlreadyFound' ? 'duplicate' : 'rejected',
        word,
        message: validation.errorKey ? t(validation.errorKey) : undefined,
        timestamp: Date.now(),
      });
      playWordRejectedSound();
      setFormedWord('');
      setLetterCount(0);
      return;
    }

    // Board check
    if (!couldBeOnBoard(word, grid, lang)) {
      feedbackIdRef.current += 1;
      setWordFeedback({
        id: String(feedbackIdRef.current),
        type: 'rejected',
        word,
        message: t('playerView.wordNotOnBoard'),
        timestamp: Date.now(),
      });
      playWordRejectedSound();
      setFormedWord('');
      setLetterCount(0);
      return;
    }

    // Emit to server for scoring + validation
    if (socket && gameActive) {
      socket.emit('submitWord', {
        word: word.toLowerCase(),
        comboLevel: 0,
        fireRoundActive: false,
        comboType: null,
      });
    }

    // Add to local found words
    onWordSubmit(word);

    // Submit all words as target guesses (server handles different-length words
    // as discovery feedback without life penalty, mirroring SP behavior)
    if (!bridge.targetFound) {
      onWordHuntGuess(word);
    }

    // Show accepted feedback in word forming area for all submitted words.
    // For target guesses, detailed green/yellow/gray feedback also appears
    // in the clue boxes via the bridge's FeedbackOverlay.
    feedbackIdRef.current += 1;
    setWordFeedback({
      id: String(feedbackIdRef.current),
      type: 'accepted',
      word,
      timestamp: Date.now(),
    });
    playWordAcceptedSound();

    // Clear formed word
    setFormedWord('');
    setLetterCount(0);
  }

  // Use ref to avoid recreating callback on every state change
  const handleWordSubmitRef = useRef(handleWordSubmit);
  handleWordSubmitRef.current = handleWordSubmit;

  const handleWordSubmitCb = useCallback((word: string) => {
    handleWordSubmitRef.current(word);
  }, []);

  // Capture survival time when game ends
  useEffect(() => {
    if (bridge.isGameOver && survivalSeconds === 0 && gameStartTimeRef.current > 0) {
      setSurvivalSeconds(Math.round((Date.now() - gameStartTimeRef.current) / 1000));
    }
  }, [bridge.isGameOver, survivalSeconds]);

  // Count wrong guesses from attempts (same-length guesses that weren't the target)
  const wrongGuessCount = useMemo(() => {
    return bridge.attempts.filter(
      (a) => a.word.length === bridge.targetLength && a.feedback.some((f) => f.feedback !== 'green')
    ).length;
  }, [bridge.attempts, bridge.targetLength]);

  // Determine death cause: was the last thing that happened a wrong guess?
  const lastAttemptWasWrong = useMemo(() => {
    if (bridge.attempts.length === 0) return false;
    const last = bridge.attempts[bridge.attempts.length - 1];
    return last.word.length === bridge.targetLength && last.feedback.some((f) => f.feedback !== 'green');
  }, [bridge.attempts, bridge.targetLength]);

  // Build death recap stats when eliminated
  const deathRecapStats = useMemo<DeathRecapStats | null>(() => {
    if (!bridge.isGameOver || bridge.targetFound) return null;
    const validWords = foundWords.filter((w) => w.isValid !== false && !w.duplicate).length;
    const avgLen = validWords > 0
      ? foundWords.filter((w) => w.isValid !== false && !w.duplicate)
          .reduce((sum, w) => sum + w.word.length, 0) / validWords
      : 0;
    const cause: DeathCause = (lastAttemptWasWrong && bridge.lifePoints <= 0) ? 'wrongGuess' : 'lifeDrain';

    return {
      cause,
      wordsFound: validWords,
      wrongGuesses: wrongGuessCount,
      survivalSeconds: survivalSeconds,
      totalPlayers: leaderboard.length,
      eliminationOrder: bridge.eliminatedPlayers.indexOf(username) + 1 || bridge.eliminatedPlayers.length,
      avgWordLength: Math.round(avgLen * 10) / 10,
    };
  }, [bridge.isGameOver, bridge.targetFound, bridge.lifePoints, bridge.eliminatedPlayers,
      foundWords, wrongGuessCount, lastAttemptWasWrong, leaderboard.length, username, survivalSeconds]);

  return (
    <>
    {showQuickRules && <WordHuntQuickRules onDismiss={handleDismissRules} t={t} />}
    <LowHPOverlay hp={bridge.lifePoints} />
    <WordHuntCategoryHint targetLength={bridge.targetLength} targetCategory={bridge.targetCategory} />
    <WordHuntDangerToast toasts={dangerToasts} onDismiss={dismissToast} />
    <WordHuntGameLayout
      // Header (no timer)
      score={score}
      onQuit={onQuit}
      onShowHelp={handleShowHelp}

      // Clue boxes (from bridge)
      targetLength={bridge.targetLength}
      currentHint={bridge.currentHint}
      attempts={bridge.attempts}
      accumulatedClues={bridge.accumulatedClues}
      knownLetters={bridge.knownLetters}
      latestAttemptFeedback={bridge.latestAttemptFeedback}
      showFeedbackOverlay={bridge.showFeedbackOverlay}

      // Life bar (from bridge)
      lifePoints={bridge.lifePoints}
      isGameOver={bridge.isGameOver}
      targetFound={bridge.targetFound}
      targetFoundBy={bridge.targetFoundBy}
      isLifeGaining={false}
      lifeGainAmount={null}
      isClueGaining={bridge.isClueGaining}

      // Grid
      grid={grid}
      onWordSubmit={handleWordSubmitCb}
      onWordChange={handleWordChange}
      highlightedPath={keyboard.highlightedCells}

      // Word forming
      formedWord={keyboard.isTypingMode ? keyboard.typedWord : formedWord}
      letterCount={keyboard.isTypingMode ? keyboard.typedWord.length : letterCount}
      wordFeedback={wordFeedback}
      matchesTargetLength={
        !bridge.targetFound &&
        !bridge.showFeedbackOverlay &&
        bridge.targetLength > 0 &&
        (keyboard.isTypingMode ? keyboard.typedWord.length : letterCount) === bridge.targetLength
      }

      // Leaderboard (from bridge + props)
      playerLives={bridge.playerLives}
      eliminatedPlayers={bridge.eliminatedPlayers}
      leaderboard={leaderboard}
      currentUsername={username}
      wrongGuessShake={bridge.wrongGuessShake}

      // Death recap
      deathRecapStats={deathRecapStats}

      dragFTUE={{
        visible: ftue.visible,
        onDismiss: () => {
          trackMpFtue({ event: 'dismissed', mode: 'word_hunt', reason: 'manual' });
          ftue.dismiss();
        },
      }}

      // Common
      t={t}
      gameDir={dir}
    />
    <WordHuntFirstTimeNudges
      lifePoints={bridge.lifePoints}
      discoveryClueCount={bridge.accumulatedClues.size}
      wrongGuessCount={wrongGuessCount}
      t={t}
    />
    </>
  );
});

WordHuntGame.displayName = 'WordHuntGame';
