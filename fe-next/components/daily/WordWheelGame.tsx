'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { isValidWordWheelWord, type WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
// ==========================================
// Types
// ==========================================

export interface WordWheelGameResult {
  wordsFound: string[];
  score: number;
  timeSeconds: number;
}

interface WordWheelGameProps {
  puzzle: WordWheelPuzzle;
  duration: number; // seconds
  onComplete: (result: WordWheelGameResult) => void;
  onValidateWord: (word: string) => Promise<boolean>;
}

// ==========================================
// Scoring
// ==========================================

function scoreWord(word: string): number {
  const len = word.length;
  if (len <= 2) return 0;
  if (len === 3) return 1;
  if (len === 4) return 3;
  if (len === 5) return 5;
  if (len === 6) return 8;
  if (len === 7) return 12;
  if (len === 8) return 18;
  return 25; // 9+ letters (pangram!)
}

// ==========================================
// Wheel Letter Component
// ==========================================

interface WheelLetterProps {
  letter: string;
  isCenter: boolean;
  angle?: number;
  radius?: number;
  onPress: (letter: string) => void;
  isUsed: boolean;
  dir: string;
}

const WheelLetter: React.FC<WheelLetterProps> = ({ letter, isCenter, angle = 0, radius = 0, onPress, dir }) => {
  const isRTL = dir === 'rtl';
  const style = isCenter
    ? {}
    : {
        transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`,
      };

  return (
    <motion.button
      type="button"
      className={cn(
        'absolute flex items-center justify-center font-neo-display font-black uppercase select-none',
        'border-3 border-neo-black rounded-full transition-colors',
        isCenter
          ? 'w-16 h-16 sm:w-20 sm:h-20 bg-neo-lime text-neo-black text-2xl sm:text-3xl shadow-hard-lg z-10'
          : 'w-12 h-12 sm:w-14 sm:h-14 bg-neo-white text-neo-navy text-lg sm:text-xl shadow-hard',
        isRTL ? 'active:-translate-x-px active:translate-y-px' : 'active:translate-x-px active:translate-y-px',
        'active:shadow-hard-pressed cursor-pointer hover:bg-neo-cream'
      )}
      style={isCenter ? {} : style}
      onClick={() => onPress(letter)}
      whileTap={{ scale: 0.92 }}
    >
      {letter}
    </motion.button>
  );
};

// ==========================================
// Main Game Component
// ==========================================

const WordWheelGame: React.FC<WordWheelGameProps> = ({
  puzzle,
  duration,
  onComplete,
  onValidateWord,
}) => {
  const { t, dir } = useLanguage();
  const [input, setInput] = useState('');
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const gameOverRef = useRef(false);
  const wordsFoundRef = useRef<string[]>([]);
  const scoreRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { wordsFoundRef.current = wordsFound; }, [wordsFound]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Timer
  useEffect(() => {
    if (gameOverRef.current) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          gameOverRef.current = true;
          onComplete({
            wordsFound: wordsFoundRef.current,
            score: scoreRef.current,
            timeSeconds: duration,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration, onComplete]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1500);
  }, []);

  const handleLetterPress = useCallback((letter: string) => {
    setInput(prev => prev + letter);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isValidating || !input.trim() || gameOverRef.current) return;

    const word = input.toUpperCase().trim();
    setInput('');

    // Client-side checks
    if (word.length < 3) {
      showFeedback(t('wordWheel.tooShort').replace('{min}', '3'), 'error');
      return;
    }

    if (!word.includes(puzzle.centerLetter.toUpperCase())) {
      showFeedback(
        t('wordWheel.missingCenter').replace('{letter}', puzzle.centerLetter),
        'error'
      );
      return;
    }

    if (!isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)) {
      showFeedback(t('wordWheel.invalidLetters'), 'error');
      return;
    }

    if (wordsFound.includes(word)) {
      showFeedback(t('wordWheel.alreadyFound'), 'error');
      return;
    }

    // Server validation
    setIsValidating(true);
    try {
      const isValid = await onValidateWord(word);
      if (isValid) {
        const points = scoreWord(word);
        setWordsFound(prev => [...prev, word]);
        setScore(prev => prev + points);
        showFeedback(`+${points}`, 'success');
      } else {
        showFeedback(t('wordWheel.notInDictionary'), 'error');
      }
    } finally {
      setIsValidating(false);
    }
  }, [input, isValidating, puzzle, wordsFound, onValidateWord, showFeedback, t]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const isRTL = dir === 'rtl';
  const wheelRadius = typeof window !== 'undefined' && window.innerWidth < 640 ? 72 : 88;

  // Timer color
  const timerColor = timeLeft <= 10 ? 'text-neo-red' : timeLeft <= 30 ? 'text-neo-orange' : 'text-neo-white';
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-lg mx-auto px-4">
      {/* Timer & Score Bar */}
      <div className="flex items-center justify-between w-full">
        <div className={cn('flex items-center gap-2 font-neo-display font-black text-xl', timerColor)}>
          <Clock className="w-5 h-5" />
          <span className="tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neo-cream text-sm font-semibold">
            {t('wordWheel.wordsFound').replace('{count}', String(wordsFound.length))}
          </span>
          <span className="font-neo-display font-black text-neo-lime text-xl">
            {score}
          </span>
        </div>
      </div>

      {/* The Wheel */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
        {/* Center letter */}
        <WheelLetter
          letter={puzzle.centerLetter}
          isCenter
          onPress={handleLetterPress}
          isUsed={false}
          dir={dir}
        />
        {/* Outer letters */}
        {puzzle.outerLetters.map((letter, i) => (
          <WheelLetter
            key={`${letter}-${i}`}
            letter={letter}
            isCenter={false}
            angle={i * 45}
            radius={wheelRadius}
            onPress={handleLetterPress}
            isUsed={false}
            dir={dir}
          />
        ))}
      </div>

      {/* Center letter rule hint */}
      <p className="text-neo-cream/60 text-xs text-center">
        {t('wordWheel.centerLetterRule')} &middot; {t('wordWheel.minLetters').replace('{min}', '3')}
      </p>

      {/* Input area */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder={t('wordWheel.inputPlaceholder')}
            className={cn(
              'w-full px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white',
              'font-neo-display text-lg uppercase tracking-wider placeholder:text-neo-white/30',
              'focus:outline-none focus:ring-2 focus:ring-neo-lime shadow-hard',
              isRTL && 'text-right'
            )}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={gameOverRef.current}
          />
          {/* Inline feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                className={cn(
                  'absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-neo border-2 border-neo-black text-sm font-bold whitespace-nowrap',
                  feedback.type === 'success'
                    ? 'bg-neo-lime text-neo-black'
                    : 'bg-neo-red text-neo-white'
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {feedback.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isValidating || !input.trim()}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard',
            'hover:bg-neo-lime-light active:shadow-hard-pressed font-bold',
            isRTL ? 'active:-translate-x-px active:translate-y-px' : 'active:translate-x-px active:translate-y-px',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Found words list */}
      {wordsFound.length > 0 && (
        <div className="w-full">
          <h3 className="text-neo-cream/70 text-xs font-bold uppercase mb-2">
            {t('wordWheel.foundWords')} ({wordsFound.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {wordsFound.map((word) => (
              <span
                key={word}
                className="px-2 py-0.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-cream text-xs font-semibold shadow-hard-xs"
              >
                {word} <span className="text-neo-lime">+{scoreWord(word)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WordWheelGame;
