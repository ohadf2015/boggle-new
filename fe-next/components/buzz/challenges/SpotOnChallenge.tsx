'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface SpotOnChallengeProps {
  challenge: {
    prompt: string;
    answer: string;
    hint?: string;
    trendingContext?: string;
    options?: string[];
  };
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

/**
 * SpotOnChallenge - Multiple choice definition matching
 * User selects the correct word from options based on the prompt
 */
export default function SpotOnChallenge({
  challenge,
  onAnswer,
  showHint,
}: SpotOnChallengeProps) {
  const { t } = useLanguage();

  const handleOptionClick = useCallback(
    (option: string) => {
      onAnswer(option);
    },
    [onAnswer]
  );

  const options = challenge.options || [];

  // Defensive check: If no options provided, show error state
  if (options.length === 0) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-black text-neo-red">
          {t('buzz.error.noOptions')}
        </h2>
        <p className="text-slate-400">
          {challenge.prompt}
        </p>
        <Button
          onClick={() => onAnswer('')}
          variant="outline"
          className="mt-4"
        >
          {t('buzz.skip')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Challenge Title */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-3xl font-black text-white mb-2 leading-relaxed"
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
            {t('buzz.hint')}
          </div>
          <p className="text-white text-sm">{challenge.hint}</p>
        </motion.div>
      )}

      {/* Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {options.map((option, index) => (
          <motion.div
            key={option}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Button
              onClick={() => handleOptionClick(option)}
              variant="outline"
              className="w-full py-6 text-lg font-bold bg-slate-800 border-2 border-slate-600 hover:border-neo-cyan hover:bg-slate-700 transition-all text-left"
            >
              <span className="flex items-center justify-between w-full">
                <span>{option}</span>
                <span className="text-sm text-slate-500">
                  {String.fromCharCode(65 + index)}
                </span>
              </span>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* Trending Context */}
      {challenge.trendingContext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-slate-500 leading-relaxed"
        >
          {challenge.trendingContext}
        </motion.div>
      )}
    </div>
  );
}
