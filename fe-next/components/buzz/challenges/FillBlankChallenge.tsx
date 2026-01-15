'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Check, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface FillBlankChallengeProps {
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
 * Strip the trailing "(N letters)" pattern from the prompt
 * This is added by the backend for validation but shouldn't be shown to players
 * Example: "Fill in the _ _ _ _ (4 letters)" → "Fill in the _ _ _ _"
 */
function stripLetterCount(prompt: string): string {
  // Match pattern like "(3 letters)" or "(10 letters)" at the end of the string
  return prompt.replace(/\s*\(\d+\s+letters\)\s*$/i, '').trim();
}

/**
 * FillBlankChallenge - Fill in the blank challenge with individual letter boxes
 * User completes a trending phrase by filling in the missing word letter by letter
 */
export default function FillBlankChallenge({
  challenge,
  onAnswer,
  showHint,
}: FillBlankChallengeProps) {
  const { t, language } = useLanguage();
  const answerLength = challenge.answer.length;
  const [letters, setLetters] = useState<string[]>(Array(answerLength).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRTL = language === 'he';

  // Strip letter count from prompt for display
  const displayPrompt = stripLetterCount(challenge.prompt);

  // Focus the first box on mount only
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle letter input
  const handleLetterChange = useCallback((index: number, value: string) => {
    // Only accept letters (including Hebrew, Japanese, etc.)
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
        // Clear current box
        setLetters(prev => {
          const newLetters = [...prev];
          newLetters[index] = '';
          return newLetters;
        });
      } else if (index > 0) {
        // Move to previous box and clear it
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
    <div className="space-y-6">
      {/* Challenge Title */}
      <div className="text-center">

        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xl md:text-2xl font-black text-white mb-2 leading-relaxed"
        >
          {displayPrompt}
        </motion.h2>

        {/* Letter count indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-slate-400"
        >
          <span className="font-bold text-neo-yellow">{filledCount}</span>
          <span className="text-slate-500"> / </span>
          <span className="font-bold text-neo-yellow">{answerLength}</span>
          {' '}{t('buzz.letters')}
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

      {/* Letter Boxes Grid */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap justify-center gap-2 sm:gap-3 py-4"
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
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                delay: 0.25 + index * 0.05,
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
                    ? 'border-neo-yellow bg-neo-yellow/20 shadow-hard-lg scale-105'
                    : isFilled
                      ? 'border-neo-cyan bg-neo-cyan/10 shadow-hard text-neo-cyan'
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
                  <span className={`${isActive ? 'text-neo-yellow' : 'text-slate-600'}`}>
                    _
                  </span>
                )}

                {/* Active indicator pulse */}
                {isActive && !isFilled && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-neo-yellow rounded-lg"
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
        transition={{ delay: 0.3 }}
        className="flex gap-3"
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
              ? 'bg-neo-yellow text-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5'
              : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-6 h-6 me-2" />
          {t('buzz.submit')}
        </Button>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(filledCount / answerLength) * 100}%` }}
          transition={{ duration: 0.3 }}
          className={`h-full ${isComplete ? 'bg-neo-lime' : 'bg-neo-yellow'}`}
        />
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
