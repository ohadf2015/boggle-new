'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { scrollInputIntoView } from '@/hooks/useMobileKeyboard';

interface ChainChallengeProps {
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
 * ChainChallenge - Word chain challenge
 * User completes a word chain by guessing the final word
 * Features animated typing and visual chain representation
 */
export default function ChainChallenge({
  challenge,
  onAnswer,
  showHint,
}: ChainChallengeProps) {
  const { t, language } = useLanguage();
  const [userAnswer, setUserAnswer] = useState('');
  const [charCount, setCharCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRTL = language === 'he';

  // Parse chain words from prompt (format: "WORD1 → WORD2 → ?")
  const chainParts = challenge.prompt.split(/\s*[→➜>]\s*/);
  const chainWords = chainParts.slice(0, -1); // All except the "?"

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      scrollInputIntoView(inputRef.current);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Animate character count
  useEffect(() => {
    setCharCount(userAnswer.length);
  }, [userAnswer]);

  const handleSubmit = useCallback(() => {
    if (userAnswer.trim()) {
      onAnswer(userAnswer.trim());
    }
  }, [userAnswer, onAnswer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && userAnswer.trim()) {
        handleSubmit();
      }
    },
    [userAnswer, handleSubmit]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value.toUpperCase());
  };

  return (
    <div className="space-y-5">
      {/* Challenge Title */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-2 bg-neo-pink/10 rounded-lg border border-neo-pink/30 mb-4"
        >
          <span className="text-xs font-black text-neo-pink uppercase tracking-wider">
            <Link2 className="w-4 h-4 inline me-2" />
            {t('buzz.type.chain')}
          </span>
        </motion.div>

        {/* Visual Chain Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {chainWords.map((word, index) => (
            <React.Fragment key={index}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.1 }}
                className="px-4 py-2 bg-neo-pink/20 border-2 border-neo-pink/50 rounded-lg"
              >
                <span className="text-lg sm:text-xl font-black text-neo-pink">
                  {word.trim()}
                </span>
              </motion.div>

              {/* Arrow between words */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <ArrowRight className="w-5 h-5 text-neo-pink/50" />
              </motion.div>
            </React.Fragment>
          ))}

          {/* Mystery word placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + chainWords.length * 0.1 }}
            className="px-4 py-2 bg-slate-800 border-2 border-dashed border-neo-pink/50 rounded-lg min-w-[80px]"
          >
            <AnimatePresence mode="wait">
              {userAnswer ? (
                <motion.span
                  key="answer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg sm:text-xl font-black text-neo-lime"
                >
                  {userAnswer}
                </motion.span>
              ) : (
                <motion.span
                  key="placeholder"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-lg sm:text-xl font-black text-slate-500"
                >
                  ???
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Instruction with compound word hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-1"
        >
          <p className="text-sm text-slate-400">
            {t('buzz.chain.instruction')}
          </p>
          <p className="text-xs text-slate-500">
            {t('buzz.chain.compoundHint')}
          </p>
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

      {/* Input with character animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <input
          ref={inputRef}
          type="text"
          value={userAnswer}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('buzz.yourAnswer')}
          className={`
            w-full px-6 py-4 text-2xl font-black text-center text-white
            bg-slate-800 border-3 rounded-xl outline-none
            transition-all duration-200 uppercase tracking-wider
            ${userAnswer
              ? 'border-neo-pink shadow-hard-lg'
              : 'border-slate-600 shadow-hard focus:border-neo-pink focus:shadow-hard-lg'
            }
          `}
        />

        {/* Character count badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: charCount > 0 ? 1 : 0 }}
          className="absolute -top-2 -right-2 px-2 py-1 bg-neo-pink text-neo-black text-xs font-black rounded-full border-2 border-neo-black"
        >
          {charCount}
        </motion.div>

        {/* Typing indicator dots */}
        {userAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-1"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                className="w-1.5 h-1.5 bg-neo-pink/50 rounded-full"
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={!userAnswer.trim()}
          className={`
            w-full py-6 text-xl font-black uppercase
            border-3 border-neo-black rounded-xl
            transition-all duration-200
            ${userAnswer.trim()
              ? 'bg-neo-pink text-neo-white shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5'
              : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-6 h-6 me-2" />
          {t('buzz.submit')}
        </Button>
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
