'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, Delete } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

interface WordleChallengeProps {
  challenge: {
    prompt: string;
    answer: string;
    hint?: string;
    trendingContext?: string;
  };
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

/**
 * Calculate letter states for a guess compared to the answer
 * Handles duplicate letters correctly using two-pass algorithm
 */
function getLetterStates(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = new Array(WORD_LENGTH).fill('absent');
  const answerChars = answer.toUpperCase().split('');
  const guessChars = guess.toUpperCase().split('');
  const remaining: (string | null)[] = [...answerChars];

  // First pass: mark correct positions (green)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = 'correct';
      remaining[i] = null; // Mark as used
    }
  }

  // Second pass: mark present letters (yellow)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const idx = remaining.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = 'present';
      remaining[idx] = null; // Mark as used
    }
  }

  return result;
}

/**
 * WordleChallenge - Wordle-style word guessing game
 * Player has 6 attempts to guess a 5-letter word related to a trending topic
 */
export default function WordleChallenge({
  challenge,
  onAnswer,
  showHint,
}: WordleChallengeProps) {
  const { t } = useLanguage();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(
    'playing'
  );
  const [keyboardStates, setKeyboardStates] = useState<
    Record<string, LetterState>
  >({});

  const attemptsLeft = MAX_ATTEMPTS - guesses.length;
  const currentRow = guesses.length;

  // Handle keyboard input
  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameStatus !== 'playing') return;

      if (key === 'ENTER') {
        if (currentGuess.length === WORD_LENGTH) {
          const newGuesses = [...guesses, currentGuess];
          setGuesses(newGuesses);

          // Calculate letter states for keyboard
          const states = getLetterStates(currentGuess, challenge.answer);
          const newKeyboardStates = { ...keyboardStates };
          currentGuess.split('').forEach((letter, i) => {
            const currentState = newKeyboardStates[letter];
            const newState = states[i];
            // Only upgrade state: absent -> present -> correct
            if (
              !currentState ||
              currentState === 'empty' ||
              currentState === 'tbd'
            ) {
              newKeyboardStates[letter] = newState;
            } else if (currentState === 'absent' && newState !== 'absent') {
              newKeyboardStates[letter] = newState;
            } else if (currentState === 'present' && newState === 'correct') {
              newKeyboardStates[letter] = newState;
            }
          });
          setKeyboardStates(newKeyboardStates);

          // Check win/lose
          if (currentGuess.toUpperCase() === challenge.answer.toUpperCase()) {
            setGameStatus('won');
            onAnswer(currentGuess);
          } else if (newGuesses.length >= MAX_ATTEMPTS) {
            setGameStatus('lost');
            onAnswer(currentGuess);
          }

          setCurrentGuess('');
        }
      } else if (key === 'BACKSPACE') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/i.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((prev) => prev + key.toUpperCase());
      }
    },
    [
      currentGuess,
      guesses,
      gameStatus,
      challenge.answer,
      keyboardStates,
      onAnswer,
    ]
  );

  // Listen for physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACKSPACE');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  // Render a single cell in the grid
  const renderCell = (
    rowIndex: number,
    colIndex: number,
    letter: string,
    state: LetterState
  ) => {
    const stateStyles: Record<LetterState, string> = {
      correct: 'bg-green-500 border-green-500 text-white',
      present: 'bg-yellow-500 border-yellow-500 text-white',
      absent: 'bg-slate-600 border-slate-600 text-white',
      empty: 'bg-transparent border-slate-600',
      tbd: 'bg-transparent border-slate-400',
    };

    return (
      <motion.div
        key={`${rowIndex}-${colIndex}`}
        data-testid={`wordle-cell-${rowIndex}-${colIndex}`}
        data-state={state}
        initial={state !== 'empty' && state !== 'tbd' ? { scale: 0.8 } : false}
        animate={{ scale: 1 }}
        className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl font-black border-2 rounded-lg ${stateStyles[state]}`}
      >
        {letter}
      </motion.div>
    );
  };

  // Render a row of the grid
  const renderRow = (rowIndex: number) => {
    const isCurrentRow = rowIndex === currentRow;
    const isSubmittedRow = rowIndex < currentRow;
    const guess = isSubmittedRow ? guesses[rowIndex] : isCurrentRow ? currentGuess : '';
    const states: LetterState[] = isSubmittedRow
      ? getLetterStates(guess, challenge.answer)
      : new Array(WORD_LENGTH).fill(isCurrentRow ? 'tbd' : 'empty');

    return (
      <div
        key={rowIndex}
        data-testid={`wordle-row-${rowIndex}`}
        className="flex gap-1.5 justify-center"
      >
        {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
          const letter = guess[colIndex] || '';
          const state = letter ? states[colIndex] : isCurrentRow ? 'tbd' : 'empty';
          return renderCell(rowIndex, colIndex, letter, state);
        })}
      </div>
    );
  };

  // Render keyboard key
  const renderKey = (key: string) => {
    const state = keyboardStates[key] || 'empty';
    const isWide = key === 'ENTER' || key === 'BACKSPACE';

    const stateStyles: Record<LetterState, string> = {
      correct: 'bg-green-500 text-white border-green-500',
      present: 'bg-yellow-500 text-white border-yellow-500',
      absent: 'bg-slate-700 text-slate-400 border-slate-700',
      empty: 'bg-slate-600 text-white border-slate-500 hover:bg-slate-500',
      tbd: 'bg-slate-600 text-white border-slate-500 hover:bg-slate-500',
    };

    return (
      <motion.button
        key={key}
        data-testid={`key-${key}`}
        data-state={state}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleKeyPress(key)}
        disabled={gameStatus !== 'playing'}
        className={`${isWide ? 'px-3 sm:px-4' : 'w-8 sm:w-10'} h-12 sm:h-14 flex items-center justify-center text-xs sm:text-sm font-bold rounded-md border-2 transition-colors disabled:opacity-50 ${stateStyles[state]}`}
      >
        {key === 'BACKSPACE' ? <Delete className="w-5 h-5" /> : key}
      </motion.button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Challenge Title */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-2 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-3"
        >
          <span className="text-xs font-black text-purple-400 uppercase tracking-wider">
            <Grid3X3 className="w-4 h-4 inline me-2" />
            {t('buzz.type.wordle') || 'WORDLE'}
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-3xl font-black text-white mb-2"
        >
          {challenge.prompt}
        </motion.h2>

        {/* Attempts remaining */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-slate-400"
        >
          <span className="font-bold text-purple-400">{attemptsLeft}</span>{' '}
          {t('buzz.wordle.attemptsLeft') || 'attempts left'}
        </motion.div>
      </div>

      {/* Hint */}
      {showHint && challenge.hint && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-4 py-3 bg-neo-cyan/10 border-2 border-neo-cyan/30 rounded-lg"
        >
          <div className="text-xs text-neo-cyan font-bold uppercase mb-1">
            {t('buzz.hint') || 'HINT'}
          </div>
          <p className="text-white text-sm">{challenge.hint}</p>
        </motion.div>
      )}

      {/* Wordle Grid */}
      <motion.div
        data-testid="wordle-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-1.5 items-center py-4"
      >
        {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) =>
          renderRow(rowIndex)
        )}
      </motion.div>

      {/* Game Status */}
      {gameStatus !== 'playing' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center py-3 px-4 rounded-lg font-black text-lg ${
            gameStatus === 'won'
              ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
              : 'bg-red-500/20 text-red-400 border-2 border-red-500/30'
          }`}
        >
          {gameStatus === 'won'
            ? t('buzz.wordle.solved') || 'Solved!'
            : `${t('buzz.wordle.failed') || 'Out of attempts'}: ${challenge.answer}`}
        </motion.div>
      )}

      {/* On-screen Keyboard */}
      <motion.div
        data-testid="wordle-keyboard"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-1.5 items-center"
      >
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {row.map((key) => renderKey(key))}
          </div>
        ))}
      </motion.div>

      {/* Trending Context */}
      {challenge.trendingContext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-slate-500 leading-relaxed"
        >
          {challenge.trendingContext}
        </motion.div>
      )}
    </div>
  );
}
