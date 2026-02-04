'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { normalizeHebrewLetter } from '@/shared/utils/wordNormalization';

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

const MAX_ATTEMPTS = 6;

/**
 * Word length varies by language to match typical word lengths
 * Hebrew: 4 letters (typical Hebrew word length)
 * English/Swedish/Spanish: 5 letters (standard Wordle)
 * Japanese: 4 characters (kanji/kana compounds)
 */
const WORDLE_WORD_LENGTH: Record<string, number> = {
  en: 5,
  he: 4,
  sv: 5,
  ja: 4,
  es: 5,
};

/**
 * Language-specific keyboard layouts
 * Each layout follows the standard keyboard arrangement for that language
 */
const KEYBOARD_LAYOUTS: Record<string, string[][]> = {
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  // Hebrew keyboard follows standard Israeli keyboard layout (no final letters)
  // Final letters (sofit) are excluded - they appear automatically at word end in typing
  // Layout mirrors Hebrew keyboard positions without finals: ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ
  he: [
    ['ק', 'ר', 'א', 'ט', 'ו', 'נ', 'מ', 'פ'],
    ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל'],
    ['ENTER', 'ז', 'ס', 'ב', 'ה', 'צ', 'ת', 'BACKSPACE'],
  ],
  sv: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Å'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  ja: [
    // Japanese uses hiragana - simplified layout for 4-character words
    ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と'],
    ['ENTER', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ', 'BACKSPACE'],
  ],
  es: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
};

/**
 * Get keyboard layout for a given language
 * Falls back to English if language not supported
 */
function getKeyboardLayout(language: string): string[][] {
  return KEYBOARD_LAYOUTS[language] || KEYBOARD_LAYOUTS.en;
}

/**
 * Regular expression to match valid letters for each language
 */
const LANGUAGE_LETTER_PATTERNS: Record<string, RegExp> = {
  en: /^[A-Za-z]$/,
  he: /^[\u0590-\u05FF]$/,
  sv: /^[A-Za-zÅÄÖåäö]$/i,
  ja: /^[\u3040-\u309F\u30A0-\u30FF]$/,
  es: /^[A-Za-zÑñ]$/,
};

/**
 * Check if a character is a valid letter for the current language
 */
function isValidLetter(char: string, language: string): boolean {
  const pattern = LANGUAGE_LETTER_PATTERNS[language] || LANGUAGE_LETTER_PATTERNS.en;
  return pattern.test(char);
}

/**
 * Normalize a letter for comparison based on language
 * For Hebrew: converts final form letters to regular form
 */
function normalizeLetterForComparison(letter: string, language: string): string {
  if (language === 'he') {
    return normalizeHebrewLetter(letter);
  }
  return letter.toUpperCase();
}

/**
 * Calculate letter states for a guess compared to the answer
 * Handles duplicate letters correctly using two-pass algorithm
 * For Hebrew: normalizes final form letters (ם,ן,ך,ף,ץ) to regular form for comparison
 */
function getLetterStates(guess: string, answer: string, language: string, wordLength: number): LetterState[] {
  const result: LetterState[] = new Array(wordLength).fill('absent');

  // Normalize both guess and answer for comparison
  const answerChars = answer.split('').map(c => normalizeLetterForComparison(c, language));
  const guessChars = guess.split('').map(c => normalizeLetterForComparison(c, language));
  const remaining: (string | null)[] = [...answerChars];

  // First pass: mark correct positions (green)
  for (let i = 0; i < wordLength; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = 'correct';
      remaining[i] = null; // Mark as used
    }
  }

  // Second pass: mark present letters (yellow)
  for (let i = 0; i < wordLength; i++) {
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
 * Player has 6 attempts to guess a word related to a trending topic
 * Word length varies by language (4 for Hebrew/Japanese, 5 for English/Swedish/Spanish)
 */
export default function WordleChallenge({
  challenge,
  onAnswer,
  showHint,
}: WordleChallengeProps) {
  const { t, language } = useLanguage();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(
    'playing'
  );
  const [keyboardStates, setKeyboardStates] = useState<
    Record<string, LetterState>
  >({});
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Dynamic word length based on language
  const wordLength = WORDLE_WORD_LENGTH[language] || 5;

  const attemptsLeft = MAX_ATTEMPTS - guesses.length;
  const currentRow = guesses.length;
  const keyboardRows = getKeyboardLayout(language);

  // Handle keyboard input
  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameStatus !== 'playing') return;

      if (key === 'ENTER') {
        if (currentGuess.length === wordLength) {
          const newGuesses = [...guesses, currentGuess];
          setGuesses(newGuesses);

          // Calculate letter states for keyboard (normalize Hebrew final forms)
          const states = getLetterStates(currentGuess, challenge.answer, language, wordLength);
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

          // Check win/lose (normalize Hebrew final forms for comparison)
          const normalizedGuess = currentGuess.split('').map(c => normalizeLetterForComparison(c, language)).join('');
          const normalizedAnswer = challenge.answer.split('').map(c => normalizeLetterForComparison(c, language)).join('');
          if (normalizedGuess === normalizedAnswer) {
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
      } else if (isValidLetter(key, language) && currentGuess.length < wordLength) {
        // Uppercase for Latin scripts, keep as-is for others (Hebrew, Japanese)
        const normalizedKey = /^[a-zA-ZÅÄÖåäöÑñ]$/.test(key) ? key.toUpperCase() : key;
        setCurrentGuess((prev) => prev + normalizedKey);
      }
    },
    [
      currentGuess,
      guesses,
      gameStatus,
      challenge.answer,
      keyboardStates,
      onAnswer,
      language,
      wordLength,
    ]
  );

  // Listen for physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Ignore if typing in the native input (it handles its own events)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACKSPACE');
      } else if (isValidLetter(e.key, language)) {
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, language]);

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
      ? getLetterStates(guess, challenge.answer, language, wordLength)
      : new Array(wordLength).fill(isCurrentRow ? 'tbd' : 'empty');

    return (
      <div
        key={rowIndex}
        data-testid={`wordle-row-${rowIndex}`}
        className="flex gap-1.5 justify-center"
      >
        {Array.from({ length: wordLength }).map((_, colIndex) => {
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

    // Display backspace icon instead of text
    const keyDisplay = key === 'BACKSPACE' ? '⌫' : key;

    return (
      <motion.button
        key={key}
        data-testid={`key-${key}`}
        data-state={state}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleKeyPress(key)}
        disabled={gameStatus !== 'playing'}
        className={`${isWide ? 'px-2 sm:px-3' : 'w-8 sm:w-10'} h-12 sm:h-14 flex items-center justify-center text-xs sm:text-sm font-bold rounded-md border-2 transition-colors disabled:opacity-50 ${stateStyles[state]}`}
      >
        {keyDisplay}
      </motion.button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Challenge Title */}
      <div className="text-center">
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
          {t('buzz.wordle.attemptsLeft')}
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
            {t('buzz.hint')}
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
            ? t('buzz.wordle.solved')
            : `${t('buzz.wordle.failed')}: ${challenge.answer}`}
        </motion.div>
      )}

      {/* Hidden input for native device keyboard support */}
      <input
        ref={nativeInputRef}
        data-testid="wordle-native-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        className="sr-only"
        value={currentGuess}
        onChange={(e) => {
          if (gameStatus !== 'playing') return;
          const newValue = e.target.value;
          // Handle input changes from native keyboard
          if (newValue.length > currentGuess.length) {
            // New character(s) added
            const newChars = newValue.slice(currentGuess.length);
            for (const char of newChars) {
              if (isValidLetter(char, language) && currentGuess.length < wordLength) {
                handleKeyPress(char);
              }
            }
          } else if (newValue.length < currentGuess.length) {
            // Character deleted
            handleKeyPress('BACKSPACE');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleKeyPress('ENTER');
          }
        }}
        aria-label={t('buzz.wordle.useDeviceKeyboard')}
      />

      {/* On-screen Keyboard */}
      <motion.div
        data-testid="wordle-keyboard"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-1.5 items-center"
      >
        {keyboardRows.map((row: string[], rowIndex: number) => (
          <div key={rowIndex} className="flex gap-1 flex-wrap justify-center">
            {row.map((key: string) => renderKey(key))}
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
