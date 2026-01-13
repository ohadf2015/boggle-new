'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { scrollInputIntoView } from '@/hooks/useMobileKeyboard';

interface TrioChallengeProps {
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
 * TrioChallenge - Find word connecting three trends
 * User identifies the common word that links three trending topics
 * Features animated topic cards and visual connection theme
 */
export default function TrioChallenge({
  challenge,
  onAnswer,
  showHint,
}: TrioChallengeProps) {
  const { t, language } = useLanguage();
  const [userAnswer, setUserAnswer] = useState('');
  const [charCount, setCharCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRTL = language === 'he';

  // Parse topics from prompt (assumes format like "Topic1, Topic2, Topic3" or similar)
  const topics = challenge.prompt.split(/[,،•\n]+/).map(t => t.trim()).filter(Boolean);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      scrollInputIntoView(inputRef.current);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Track character count
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

  // Colors for each topic card
  const topicColors = [
    { bg: 'bg-neo-lime/20', border: 'border-neo-lime/50', text: 'text-neo-lime' },
    { bg: 'bg-neo-cyan/20', border: 'border-neo-cyan/50', text: 'text-neo-cyan' },
    { bg: 'bg-neo-purple/20', border: 'border-neo-purple/50', text: 'text-neo-purple' },
  ];

  return (
    <div className="space-y-5">
      {/* Challenge Title */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-2 bg-neo-lime/10 rounded-lg border border-neo-lime/30 mb-4"
        >
          <span className="text-xs font-black text-neo-lime uppercase tracking-wider">
            <Sparkles className="w-4 h-4 inline me-2" />
            {t('buzz.type.trio') || 'TRENDING TRIO'}
          </span>
        </motion.div>

        {/* Topic Cards in Triangle Formation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Topics display */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {topics.map((topic, index) => {
              const color = topicColors[index % topicColors.length];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.15 + index * 0.1,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20
                  }}
                  whileHover={{ scale: 1.05 }}
                  className={`
                    px-4 py-3 ${color.bg} border-2 ${color.border}
                    rounded-xl shadow-hard-sm
                    min-w-[100px] sm:min-w-[120px]
                  `}
                >
                  <span className={`text-base sm:text-lg font-black ${color.text}`}>
                    {topic}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Connection indicator - center answer preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-neo-lime" />
            <div className="px-4 py-2 bg-slate-800/80 border-2 border-dashed border-neo-lime/30 rounded-lg">
              <AnimatePresence mode="wait">
                {userAnswer ? (
                  <motion.span
                    key="answer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-lg font-black text-neo-yellow"
                  >
                    {userAnswer}
                  </motion.span>
                ) : (
                  <motion.span
                    key="placeholder"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-lg font-black text-slate-500"
                  >
                    ?
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <Zap className="w-4 h-4 text-neo-lime" />
          </motion.div>
        </motion.div>

        {/* Instruction */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-sm text-slate-400"
        >
          {t('buzz.trio.hint') || 'Find the word that connects all three topics'}
        </motion.p>
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

      {/* Input with character animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative"
      >
        <input
          ref={inputRef}
          type="text"
          value={userAnswer}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('buzz.connectingWord') || 'CONNECTING WORD'}
          className={`
            w-full px-6 py-4 text-2xl font-black text-center text-white
            bg-slate-800 border-3 rounded-xl outline-none
            transition-all duration-200 uppercase tracking-wider
            ${userAnswer
              ? 'border-neo-lime shadow-hard-lg'
              : 'border-slate-600 shadow-hard focus:border-neo-lime focus:shadow-hard-lg'
            }
          `}
        />

        {/* Character count badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: charCount > 0 ? 1 : 0 }}
          className="absolute -top-2 -right-2 px-2 py-1 bg-neo-lime text-neo-black text-xs font-black rounded-full border-2 border-neo-black"
        >
          {charCount}
        </motion.div>

        {/* Sparkle effect when typing */}
        {userAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-5 h-5 text-neo-lime/50" />
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={!userAnswer.trim()}
          className={`
            w-full py-6 text-xl font-black uppercase
            border-3 border-neo-black rounded-xl
            transition-all duration-200
            ${userAnswer.trim()
              ? 'bg-neo-lime text-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5'
              : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-6 h-6 me-2" />
          {t('buzz.submit') || 'SUBMIT'}
        </Button>
      </motion.div>

      {/* Trending Context */}
      {challenge.trendingContext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-slate-500 leading-relaxed"
        >
          {challenge.trendingContext}
        </motion.div>
      )}
    </div>
  );
}
