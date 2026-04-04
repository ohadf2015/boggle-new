'use client';

/**
 * WotdReveal — Word of the Day reveal card shown on the results screen.
 * Celebratory style if player found the word, muted style if missed.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Eye, Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
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
  const { playWordRevealSound } = useSoundEffects();
  const { word, stats, loading } = useWordOfTheDay(language);

  // Play reveal sound after mount (delayed to sync with entrance animation)
  useEffect(() => {
    if (!word || loading) return;
    const timer = setTimeout(() => playWordRevealSound(), 500);
    return () => clearTimeout(timer);
  }, [word, loading, playWordRevealSound]);

  const normalizedPlayerWords = playerWords.map(w => w.toLowerCase().trim());
  const found = word ? normalizedPlayerWords.includes(word.toLowerCase()) : false;
  const percent = stats.foundPercent;

  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!word) return;
    const emoji = found ? '\u{2728}' : '\u{1F440}';
    const status = found ? t('wotd.found') : t('wotd.missed');
    const shareText = [
      `${emoji} ${t('wotd.title')} — ${status}`,
      `"${word.toUpperCase()}"`,
      found ? t('wotd.foundPercent').replace('{{percent}}', String(percent)) : '',
      '',
      'lexiclash.live/word-of-the-day',
    ].filter(Boolean).join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: `https://lexiclash.live/${language}/word-of-the-day` });
        return;
      } catch { /* cancelled, fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silently fail */ }
  }, [found, word, percent, t, language]);

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
          <p className="text-sm text-neo-white/70 mb-3">
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
          <p className="text-xs text-white/30 mb-3">
            {t('wotd.missedHint')}
          </p>
        </>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        className={cn(
          'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-neo text-xs font-bold uppercase tracking-wider',
          'border-2 border-neo-black transition-all',
          found
            ? 'bg-neo-yellow/20 text-neo-yellow hover:bg-neo-yellow/30'
            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70',
        )}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
        {copied ? t('common.copied') : t('share.emojiCard.share')}
      </button>
    </motion.div>
  );
}
