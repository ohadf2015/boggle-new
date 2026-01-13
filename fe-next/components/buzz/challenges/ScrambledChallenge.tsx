'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Check, Delete, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { scrollInputIntoView } from '@/hooks/useMobileKeyboard';

interface ScrambledChallengeProps {
  challenge: {
    prompt: string;
    answer: string;
    hint?: string;
    trendingContext?: string;
  };
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

/**
 * ScrambledChallenge - Anagram/unscramble word challenge
 * User unscrambles letters to form the trending word
 * Features individual letter boxes with auto-advance
 */
export default function ScrambledChallenge({
  challenge,
  onAnswer,
  showHint,
}: ScrambledChallengeProps) {
  const { t, language } = useLanguage();
  const answerLength = challenge.answer.length;
  const [letters, setLetters] = useState<string[]>(Array(answerLength).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isRTL = language === 'he';

  // Focus the first box on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
      scrollInputIntoView(inputRefs.current[0]);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle letter input
  const handleLetterChange = useCallback((index: number, value: string) => {
    const letter = value.slice(-1).toUpperCase();
    if (!letter) return;

    setLetters(prev => {
      const newLetters = [...prev];
      newLetters[index] = letter;
      return newLetters;
    });

    // Auto-advance to next empty box
    if (index < answerLength - 1) {
      const nextIndex = index + 1;
      setActiveIndex(nextIndex);
      inputRefs.current[nextIndex]?.focus();
    }
  }, [answerLength]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();

      if (letters[index]) {
        setLetters(prev => {
          const newLetters = [...prev];
          newLetters[index] = '';
          return newLetters;
        });
      } else if (index > 0) {
        const prevIndex = index - 1;
        setLetters(prev => {
          const newLetters = [...prev];
          newLetters[prevIndex] = '';
          return newLetters;
        });
        setActiveIndex(prevIndex);
        inputRefs.current[prevIndex]?.focus();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const direction = e.key === 'ArrowLeft' ? (isRTL ? 1 : -1) : (isRTL ? -1 : 1);
      const newIndex = Math.max(0, Math.min(answerLength - 1, index + direction));
      setActiveIndex(newIndex);
      inputRefs.current[newIndex]?.focus();
    } else if (e.key === 'Enter') {
      const answer = letters.join('');
      if (answer.length === answerLength && letters.every(l => l)) {
        onAnswer(answer);
      }
    }
  }, [letters, answerLength, isRTL, onAnswer]);

  // Handle box click
  const handleBoxClick = useCallback((index: number) => {
    setActiveIndex(index);
    inputRefs.current[index]?.focus();
  }, []);

  // Handle submit
  const handleSubmit = useCallback(() => {
    const answer = letters.join('');
    if (answer.length === answerLength && letters.every(l => l)) {
      onAnswer(answer);
    }
  }, [letters, answerLength, onAnswer]);

  // Clear all letters
  const handleClear = useCallback(() => {
    setLetters(Array(answerLength).fill(''));
    setActiveIndex(0);
    inputRefs.current[0]?.focus();
  }, [answerLength]);

  const isComplete = letters.every(l => l);
  const filledCount = letters.filter(l => l).length;

  return (
    <div className="space-y-5">
      {/* Challenge Title */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-2 bg-neo-orange/10 rounded-lg border border-neo-orange/30 mb-3"
        >
          <span className="text-xs font-black text-neo-orange uppercase tracking-wider">
            <RotateCcw className="w-4 h-4 inline me-2" />
            {t('buzz.type.scrambled') || 'SCRAMBLED'}
          </span>
        </motion.div>

        {/* Scrambled Letters Display - Plain text like before */}
        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-4xl font-black text-white mb-2"
        >
          {challenge.prompt}
        </motion.h2>

        {/* Shuffle instruction */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-2"
        >
          <Shuffle className="w-4 h-4" />
          <span>{t('buzz.scrambled.unscramble') || 'Unscramble the letters!'}</span>
        </motion.div>

        {/* Letter count indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-slate-400"
        >
          <span className="font-bold text-neo-orange">{filledCount}</span>
          <span className="text-slate-500"> / </span>
          <span className="font-bold text-neo-orange">{answerLength}</span>
          {' '}{t('buzz.letters') || 'letters'}
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

      {/* Answer Letter Boxes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex flex-wrap justify-center gap-2 sm:gap-3 py-2"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {Array.from({ length: answerLength }).map((_, index) => {
          const letter = letters[index];
          const isActive = activeIndex === index;
          const isFilled = !!letter;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.4 + index * 0.04,
                type: 'spring',
                stiffness: 400,
                damping: 25
              }}
              className="relative"
            >
              {/* Letter Box */}
              <motion.div
                animate={{
                  scale: isFilled ? [1, 1.1, 1] : 1,
                  rotate: isFilled ? [0, -3, 3, 0] : 0,
                }}
                transition={{ duration: 0.2 }}
                onClick={() => handleBoxClick(index)}
                className={`
                  relative w-12 h-14 sm:w-14 sm:h-16
                  flex items-center justify-center
                  text-2xl sm:text-3xl font-black
                  border-3 rounded-lg cursor-pointer
                  transition-all duration-150
                  ${isActive
                    ? 'border-neo-orange bg-neo-orange/20 shadow-hard-lg scale-105'
                    : isFilled
                      ? 'border-neo-lime bg-neo-lime/10 shadow-hard text-neo-lime'
                      : 'border-slate-600 bg-slate-800/80 shadow-hard-sm hover:border-slate-500'
                  }
                `}
              >
                {/* Hidden input for keyboard support */}
                <input
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  value={letter}
                  onChange={(e) => handleLetterChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={() => setActiveIndex(index)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label={`Letter ${index + 1}`}
                />

                {/* Display letter or placeholder */}
                {letter ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="text-white"
                  >
                    {letter}
                  </motion.span>
                ) : (
                  <span className={`${isActive ? 'text-neo-orange' : 'text-slate-600'}`}>
                    _
                  </span>
                )}

                {/* Active indicator pulse */}
                {isActive && !isFilled && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-neo-orange rounded-lg"
                  />
                )}
              </motion.div>

              {/* Box number indicator */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-mono">
                {index + 1}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="flex gap-3 pt-2"
      >
        {/* Clear Button */}
        <Button
          onClick={handleClear}
          variant="outline"
          className="flex-shrink-0 px-4 py-6 border-2 border-slate-600 bg-slate-800 hover:border-neo-pink hover:bg-slate-700"
        >
          <Delete className="w-5 h-5" />
        </Button>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isComplete}
          className={`
            flex-1 py-6 text-xl font-black uppercase
            border-3 border-neo-black rounded-xl
            transition-all duration-200
            ${isComplete
              ? 'bg-neo-orange text-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5'
              : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-6 h-6 me-2" />
          {t('buzz.submit') || 'SUBMIT'}
        </Button>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(filledCount / answerLength) * 100}%` }}
          transition={{ duration: 0.3 }}
          className={`h-full ${isComplete ? 'bg-neo-lime' : 'bg-neo-orange'}`}
        />
      </motion.div>

      {/* Trending Context */}
      {challenge.trendingContext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-center text-xs text-slate-500 leading-relaxed"
        >
          {challenge.trendingContext}
        </motion.div>
      )}
    </div>
  );
}
