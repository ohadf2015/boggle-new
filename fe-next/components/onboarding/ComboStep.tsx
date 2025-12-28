'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * ComboStep - Explains the combo system with visual examples
 * Shows how finding words quickly builds combos for bigger scores
 */
const ComboStep: React.FC = () => {
  const { t } = useLanguage();

  const examples = [
    {
      word: 'CAT',
      score: 3,
      combo: 1,
      color: 'bg-neo-yellow',
      delay: 0.2,
    },
    {
      word: 'DOG',
      score: 6,
      combo: 2,
      color: 'bg-neo-orange',
      delay: 0.6,
    },
    {
      word: 'BIRD',
      score: 12,
      combo: 3,
      color: 'bg-neo-pink',
      delay: 1.0,
    },
  ];

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-1"
      >
        <div className="flex items-center justify-center gap-2">
          <Flame className="text-2xl text-neo-orange" />
          <h2 className="text-xl sm:text-2xl font-black text-neo-black uppercase">
            {t('onboarding.combo.title')}
          </h2>
          <Flame className="text-2xl text-neo-orange" />
        </div>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.combo.subtitle')}
        </p>
      </motion.div>

      {/* Explanation card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-neo-cream border-3 border-neo-black rounded-neo p-2.5 sm:p-4 shadow-hard-md max-w-md"
      >
        <p className="text-center text-xs sm:text-sm text-neo-black leading-relaxed">
          {t('onboarding.combo.explanation')}
        </p>
      </motion.div>

      {/* Example sequence */}
      <div className="space-y-2 w-full max-w-sm">
        {examples.map((example, index) => (
          <motion.div
            key={index}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: example.delay }}
            className={`${example.color} border-3 border-neo-black rounded-neo p-2.5 sm:p-3 shadow-hard-sm`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black text-lg sm:text-xl text-neo-black">
                  {example.word}
                </div>
                <div className="text-[10px] sm:text-xs text-neo-black/70">
                  {t('onboarding.combo.example' + (index + 1))}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-xl sm:text-2xl text-neo-black">
                  {example.score}
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Flame className="text-neo-black/70 text-sm" />
                  <span className="text-xs font-bold text-neo-black">
                    {example.combo}x
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tip card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="bg-gradient-to-r from-neo-pink to-neo-orange border-3 border-neo-black rounded-neo p-2.5 sm:p-3 shadow-hard-md max-w-md"
      >
        <p className="text-center font-bold text-xs sm:text-sm text-neo-black">
          💡 {t('onboarding.combo.tip')}
        </p>
      </motion.div>
    </div>
  );
};

export default ComboStep;
