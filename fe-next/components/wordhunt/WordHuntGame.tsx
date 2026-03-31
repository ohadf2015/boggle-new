'use client';

import { memo, useState, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { validateWordLocally, couldBeOnBoard } from '@/utils/clientWordValidator';
import { useWordHuntMultiplayerBridge } from './hooks/useWordHuntMultiplayerBridge';
import { WordHuntGameLayout } from './WordHuntGameLayout';
import { WordHuntDangerToast } from './WordHuntDangerToast';
import { LowHPOverlay } from './LowHPOverlay';
import { WordHuntCategoryHint } from './WordHuntCategoryHint';
import { useWordHuntDangerAlerts } from '@/hooks/useWordHuntDangerAlerts';
import type { Socket } from 'socket.io-client';
import type { LetterGrid, Language } from '@/types';
import type { WordFeedback } from '@/components/game/WordFormingArea';

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

  // Bridge: convert Zustand MP state → SP-compatible props
  const bridge = useWordHuntMultiplayerBridge();

  // Danger alert toasts (opponent danger / eliminated / last standing)
  const { toasts: dangerToasts, dismissToast } = useWordHuntDangerAlerts();

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

  // Handle word change from grid swiping
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

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

  return (
    <>
    <LowHPOverlay hp={bridge.lifePoints} />
    {/* TODO: targetCategory not yet in bridge/store — pass null until backend wires it */}
    <WordHuntCategoryHint targetLength={bridge.targetLength} targetCategory={null} />
    <WordHuntDangerToast toasts={dangerToasts} onDismiss={dismissToast} />
    <WordHuntGameLayout
      // Header (no timer)
      score={score}
      onQuit={onQuit}

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

      // Leaderboard (from bridge + props)
      playerLives={bridge.playerLives}
      eliminatedPlayers={bridge.eliminatedPlayers}
      leaderboard={leaderboard}
      currentUsername={username}
      wrongGuessShake={bridge.wrongGuessShake}

      // Common
      t={t}
      gameDir={dir}
    />
    </>
  );
});

WordHuntGame.displayName = 'WordHuntGame';
