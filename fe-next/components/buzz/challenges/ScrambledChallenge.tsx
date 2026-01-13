'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

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
 */
export default function ScrambledChallenge({
  challenge,
  onAnswer,
  showHint,
}: ScrambledChallengeProps) {
  const { t } = useLanguage();
  const [userAnswer, setUserAnswer] = useState('');

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

  return (
    <div className="space-y-6">
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

        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-4xl font-black text-white mb-2"
        >
          {challenge.prompt}
        </motion.h2>
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

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder={t('buzz.yourAnswer') || 'YOUR ANSWER'}
          autoFocus
          className="w-full px-6 py-4 text-2xl font-black text-center text-white bg-slate-800 border-3 border-neo-black rounded-xl shadow-hard focus:border-neo-orange focus:shadow-hard-lg outline-none transition-all uppercase tracking-wider"
        />
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={!userAnswer.trim()}
          className="w-full py-6 text-xl font-black uppercase bg-neo-orange text-neo-black border-3 border-neo-black rounded-xl shadow-hard hover:shadow-hard-lg disabled:opacity-50"
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
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-slate-500 leading-relaxed"
        >
          {challenge.trendingContext}
        </motion.div>
      )}
    </div>
  );
}
