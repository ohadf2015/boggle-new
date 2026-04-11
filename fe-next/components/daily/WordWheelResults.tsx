'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { WordWheelGameResult } from './WordWheelGame';

interface WordWheelResultsProps {
  result: WordWheelGameResult;
  puzzleNumber: number;
  hasPlayedWordHunt: boolean;
}

function getResultTier(score: number): { key: string; color: string } {
  if (score >= 50) return { key: 'wordWheel.excellent', color: 'text-neo-lime' };
  if (score >= 30) return { key: 'wordWheel.great', color: 'text-neo-cyan' };
  if (score >= 15) return { key: 'wordWheel.good', color: 'text-neo-purple' };
  return { key: 'wordWheel.tryAgain', color: 'text-neo-pink' };
}

const WordWheelResults: React.FC<WordWheelResultsProps> = ({
  result,
  puzzleNumber,
  hasPlayedWordHunt,
}) => {
  const { t, language, dir } = useLanguage();
  const tier = getResultTier(result.score);
  const isRTL = dir === 'rtl';

  return (
    <motion.div
      className="flex flex-col items-center gap-6 w-full max-w-md mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Title */}
      <div className="text-center">
        <h2 className="font-neo-display font-black text-2xl text-neo-white mb-1">
          {t('wordWheel.results.title')}
        </h2>
        <span className="text-neo-cream/60 text-sm">#{puzzleNumber}</span>
      </div>

      {/* Score circle */}
      <motion.div
        className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-3 border-neo-black bg-neo-navy-light shadow-hard-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
      >
        <Trophy className={cn('w-6 h-6 mb-1', tier.color)} />
        <span className={cn('font-neo-display font-black text-3xl', tier.color)}>
          {result.score}
        </span>
        <span className="text-neo-cream/50 text-xs">{t('wordWheel.scoreLabel')}</span>
      </motion.div>

      {/* Tier message */}
      <p className={cn('font-neo-display font-bold text-lg', tier.color)}>
        {t(tier.key)}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="flex flex-col items-center p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard">
          <span className="text-neo-lime font-black text-xl">{result.wordsFound.length}</span>
          <span className="text-neo-cream/60 text-xs">{t('wordWheel.results.wordsFound')}</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard">
          <span className="text-neo-cyan font-black text-xl">
            {Math.floor(result.timeSeconds / 60)}:{(result.timeSeconds % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-neo-cream/60 text-xs">{t('wordWheel.results.time')}</span>
        </div>
      </div>

      {/* Words found list */}
      {result.wordsFound.length > 0 && (
        <div className="w-full">
          <h3 className="text-neo-cream/70 text-xs font-bold uppercase mb-2">
            {t('wordWheel.foundWords')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.wordsFound.map((word) => (
              <span
                key={word}
                className="px-2 py-0.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-cream text-xs font-semibold shadow-hard-xs"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA: Play Word Hunt if not done */}
      {!hasPlayedWordHunt && (
        <Link
          href={`/${language}/daily/word-hunt`}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black',
            'bg-neo-lime text-neo-black font-neo-display font-black shadow-hard-lg',
            'hover:bg-neo-lime-light transition-colors',
            isRTL ? 'active:-translate-x-px active:translate-y-px' : 'active:translate-x-px active:translate-y-px',
            'active:shadow-hard-pressed'
          )}
        >
          <Star className="w-5 h-5" />
          {t('wordWheel.results.playWordHunt')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </motion.div>
  );
};

export default WordWheelResults;
