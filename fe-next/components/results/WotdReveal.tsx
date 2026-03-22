'use client';

/**
 * WotdReveal — Word of the Day reveal card shown on the results screen.
 * Celebratory style if player found the word, muted style if missed.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordOfTheDay } from '@/hooks/useWordOfTheDay';

interface WotdRevealProps {
  /** Words the player found during the game */
  playerWords: string[];
  /** Optional className override */
  className?: string;
}

/**
 * Post-game Word of the Day reveal card.
 * Shows celebratory styling if the player found the WOTD,
 * or muted styling with the reveal if they missed it.
 */
export function WotdReveal({ playerWords, className }: WotdRevealProps) {
  const { t, language } = useLanguage();
  const { word, stats, loading } = useWordOfTheDay(language);

  if (loading) {
    return (
      <div
        data-testid="wotd-reveal-loading"
        className={cn(
          'rounded-neo border-neo border-black/30 bg-neo-navy/50 p-4 animate-pulse',
          className
        )}
      >
        <div className="h-5 bg-white/10 rounded w-2/3 mx-auto" />
      </div>
    );
  }

  if (!word) return null;

  const normalizedPlayerWords = playerWords.map(w => w.toLowerCase().trim());
  const found = normalizedPlayerWords.includes(word.toLowerCase());
  const percent = stats.foundPercent;

  return (
    <motion.div
      data-testid="wotd-reveal"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className={cn(
        'rounded-neo border-neo p-4 text-center',
        found
          ? 'border-neo-yellow bg-gradient-to-br from-neo-navy to-neo-navy/80 shadow-hard'
          : 'border-white/20 bg-neo-navy/60',
        className
      )}
    >
      {found ? (
        <>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-neo-yellow" />
            <span className="text-sm font-neo-display font-bold text-neo-yellow uppercase tracking-wide">
              {t('wotd.found')}
            </span>
            <Sparkles className="w-5 h-5 text-neo-yellow" />
          </div>
          <p
            data-testid="wotd-word"
            className="text-2xl font-neo-display font-bold text-neo-white mb-1 uppercase tracking-widest"
          >
            {word}
          </p>
          <p className="text-sm text-neo-white/70">
            {t('wotd.foundPercent').replace('{{percent}}', String(percent))}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-white/50" />
            <span className="text-sm font-neo-display font-bold text-white/60 uppercase tracking-wide">
              {t('wotd.missed')}
            </span>
          </div>
          <p
            data-testid="wotd-word"
            className="text-2xl font-neo-display font-bold text-white/40 mb-1 uppercase tracking-widest"
          >
            {word}
          </p>
          <p className="text-xs text-white/30">
            {t('wotd.missedHint')}
          </p>
        </>
      )}
    </motion.div>
  );
}
