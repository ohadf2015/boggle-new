'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RotateCcw, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ScoreRevealProps {
  score: number;
  averageScore: number;
  onTryAgain: () => void;
  onContinue: () => void;
}

/**
 * ScoreReveal - Shows player score vs today's average.
 * Step 4 of the FTUE: The Hook (90-120s).
 */
const ScoreReveal: React.FC<ScoreRevealProps> = ({
  score,
  averageScore,
  onTryAgain,
  onContinue,
}) => {
  const { t, dir } = useLanguage();
  const isAboveAverage = score >= averageScore;

  return (
    <motion.div
      data-testid="score-reveal"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full max-w-sm mx-auto"
      dir={dir}
    >
      <div className="bg-neo-cream border-3 border-neo-black rounded-neo p-6 shadow-hard-md text-center">
        {/* Score display */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
          className="mb-4"
        >
          <div className="text-sm font-bold text-neo-black/60 mb-1">
            {t('onboarding.ftue.yourScore', { score: '' })}
          </div>
          <div
            className={cn(
              'text-5xl font-black',
              isAboveAverage ? 'text-neo-lime' : 'text-neo-orange'
            )}
            style={{ WebkitTextStroke: '2px black' }}
          >
            {score}
          </div>
        </motion.div>

        {/* Divider */}
        <div className="w-full h-[3px] bg-neo-black/20 rounded-full mb-4" />

        {/* Average display */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center justify-center gap-2 text-neo-black/70">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-bold">
              {t('onboarding.ftue.averageScore', { average: '' })}
            </span>
          </div>
          <div className="text-3xl font-black text-neo-black mt-1">
            {averageScore}
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onTryAgain}
            className={cn(
              'w-full py-3 bg-neo-yellow border-3 border-neo-black rounded-neo',
              'font-black text-neo-black text-base uppercase',
              'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed',
              'transition-all active:translate-y-[2px]',
              'flex items-center justify-center gap-2'
            )}
          >
            <RotateCcw className="w-5 h-5" />
            {t('onboarding.ftue.tryAgain')}
          </button>
          <button
            onClick={onContinue}
            className={cn(
              'w-full py-2.5 bg-neo-white/50 border-2 border-neo-black/30 rounded-neo',
              'font-bold text-neo-black/70 text-sm',
              'hover:bg-neo-white/80 transition-colors',
              'flex items-center justify-center gap-2'
            )}
          >
            {t('onboarding.ftue.continue', 'Continue')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ScoreReveal;
