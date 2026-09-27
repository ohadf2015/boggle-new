'use client';

import { memo, useCallback } from 'react';
import { m } from 'framer-motion';
import { Hash, Target, Coins, Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { MascotWithEntrance } from '@/components/ui/Mascot';
import { fireRankConfetti } from '@/utils/confettiUtils';
import type { CoinReward } from '@/components/results/CoinRewardDisplay';

type HeroVariant = 'ranking' | 'highScore' | 'newRecord' | 'completion';

interface CelebrationHeroProps {
  score: number;
  wordCount: number;
  accuracy: number;
  totalWords?: number;
  coinReward: CoinReward | null;
  isAuthenticated: boolean;
  variant: HeroVariant;
  rank?: number;
  message?: string;
  announcement?: string;
  showConfetti?: boolean;
  /** Reduced padding for mobile */
  compact?: boolean;
}

/** Speech bubble messages based on score tier */
const SPEECH_MESSAGES = {
  amazing: ['Pure Talent!', 'Unstoppable!', 'Word Wizard!'],
  great: ['Nice One!', 'Well Played!', 'Sharp Mind!'],
  good: ['Not Bad!', 'Keep Going!', 'Good Try!'],
  low: ['Next Time!', 'Warm Up!', 'Keep Playing!'],
};

function getSpeechMessage(score: number, variant: HeroVariant): string {
  if (variant === 'newRecord' || variant === 'highScore') {
    return SPEECH_MESSAGES.amazing[Math.floor(Math.random() * 3)];
  }
  if (score >= 200) return SPEECH_MESSAGES.amazing[Math.floor(Math.random() * 3)];
  if (score >= 100) return SPEECH_MESSAGES.great[Math.floor(Math.random() * 3)];
  if (score >= 30) return SPEECH_MESSAGES.good[Math.floor(Math.random() * 3)];
  return SPEECH_MESSAGES.low[Math.floor(Math.random() * 3)];
}

function getStyleKey(variant: HeroVariant, rank: number | undefined, score: number): string {
  if (score === 0) return 'zero';
  if (variant === 'highScore' || variant === 'newRecord') return 'winner';
  if (variant === 'ranking' && rank !== undefined && rank <= 3) return 'winner';
  if (variant === 'completion') return 'loser';
  return 'loser';
}

export const CelebrationHero = memo(function CelebrationHero({
  score,
  wordCount,
  accuracy,
  totalWords,
  coinReward,
  variant,
  rank,
  message,
  announcement,
  showConfetti = false,
  compact = false,
}: CelebrationHeroProps) {
  const { t } = useLanguage();

  const styleKey = getStyleKey(variant, rank, score);
  const isWinner = styleKey === 'winner';

  const handleClick = useCallback(() => {
    if (showConfetti && rank) {
      fireRankConfetti(rank);
    }
  }, [showConfetti, rank]);

  const showMascot = score > 0;
  const speechMessage = getSpeechMessage(score, variant);

  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
    >
      <div
        className={cn(
          'relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]',
          // Full-width transparent gradient zone - no border, no shadow
          isWinner
            ? 'bg-linear-to-b from-neo-lime/10 via-transparent to-transparent'
            : styleKey === 'zero'
              ? 'bg-linear-to-b from-white/5 via-transparent to-transparent'
              : 'bg-linear-to-b from-neo-pink/10 via-transparent to-transparent',
        )}
        onClick={handleClick}
      >
        {/* Halftone texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />

        {/* Floating decorations - desktop only */}
        <div className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden">
          <m.div
            className="absolute top-6 left-8 text-neo-lime/30"
            animate={{ y: [0, -8, 0], rotate: [0, 15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-6 h-6" />
          </m.div>
          <m.div
            className="absolute top-12 right-12 text-neo-pink/30"
            animate={{ y: [0, -6, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <Trophy className="w-5 h-5" />
          </m.div>
          <m.div
            className="absolute bottom-8 left-16 text-neo-cyan/20"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            <Sparkles className="w-4 h-4" />
          </m.div>
        </div>

        <div className={cn(
          'relative z-10 text-center',
          compact ? 'px-4 py-6' : 'px-6 py-8 md:py-12',
        )}>
          {/* Rank badge pill */}
          {message && (
            <m.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className={cn(
                'inline-block px-6 py-2 text-xs sm:text-sm font-black uppercase',
                'border-4 border-neo-black rounded-full shadow-hard-lg mb-4',
                isWinner ? 'bg-neo-pink text-neo-white' : 'bg-purple-800 text-neo-white',
              )}
            >
              {message}
            </m.span>
          )}

          {/* Announcement */}
          {announcement && (
            <p className="text-xs font-bold uppercase opacity-70 mb-1 text-white">
              {announcement}
            </p>
          )}

          {/* "FINAL SCORE" label in cyan */}
          <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-neo-cyan mb-2">
            {t('results.finalScore')}
          </p>

          {/* Massive score number */}
          <m.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              'font-neo-display font-black leading-none text-white',
              compact ? 'text-[64px] sm:text-[80px]' : 'text-[80px] sm:text-[120px] md:text-[160px]',
            )}
            style={{
              WebkitTextStroke: '3px rgba(0,0,0,0.8)',
              textShadow: '6px 6px 0px rgba(0,0,0,0.4), 8px 8px 0px rgba(0,0,0,0.15)',
            }}
          >
            {score}
          </m.div>

          {/* Inline stats bar */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
            className={cn(
              'inline-flex items-center justify-center gap-3 sm:gap-4 mt-4',
              'bg-black/40 backdrop-blur-xs border-4 border-neo-black p-3 sm:p-4 rounded-2xl shadow-hard-xl',
            )}
          >
            {/* Words Found - lime icon square */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-neo-lime border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                <Hash className="w-4 h-4 text-neo-black" />
              </div>
              <div className="text-start">
                <span className="text-sm sm:text-base font-black text-white block leading-tight">{wordCount}</span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-white">
                  {t('results.words')}
                </span>
              </div>
            </div>

            {/* Accuracy - pink icon square */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-neo-pink border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div className="text-start">
                <span className="text-sm sm:text-base font-black text-white block leading-tight">
                  {totalWords != null ? `${wordCount}/${totalWords}` : `${accuracy}%`}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-white hidden sm:block">
                  {t('results.accuracy')}
                </span>
              </div>
            </div>

            {/* Coins Earned - amber icon square */}
            {coinReward && coinReward.awarded > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-400 border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                  <Coins className="w-4 h-4 text-neo-black" />
                </div>
                <div className="text-start">
                  <span className="text-sm sm:text-base font-black text-white block leading-tight">
                    +{coinReward.awarded}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-white hidden sm:block">
                    {t('results.coinsEarned')}
                  </span>
                </div>
              </div>
            )}
          </m.div>
        </div>

        {/* Mascot with speech bubble - always show on desktop when score > 0 */}
        {showMascot && (
          <div className={cn(
            'absolute z-20 pointer-events-none',
            compact
              ? 'hidden md:block -bottom-2 -right-2 sm:bottom-2 sm:right-2'
              : 'hidden sm:block -bottom-2 -right-2 sm:bottom-4 sm:right-4',
          )}>
            {/* Cream circle container */}
            <div className="relative">
              <div className={cn(
                'rounded-full bg-neo-cream/90 border-4 border-neo-black shadow-hard-lg flex items-center justify-center',
                compact ? 'w-20 h-20 md:w-28 md:h-28' : 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36',
              )}>
                {isWinner ? (
                  <CelebrationMascotWithEntrance
                    variant="trophy"
                    size={compact ? 'sm' : 'lg'}
                    delay={0.6}
                   
                    clipBorder="none"
                  />
                ) : (
                  <MascotWithEntrance
                    variant="happy"
                    size={compact ? 'sm' : 'lg'}
                    delay={0.6}
                   
                    clipBorder="none"
                  />
                )}
              </div>

              {/* Speech bubble */}
              <m.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn(
                  'absolute -top-3 -left-4 sm:-top-4 sm:-left-6',
                  'bg-neo-cyan border-2 border-neo-black px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg shadow-hard-sm',
                  'transform -rotate-6',
                )}
              >
                <p className="text-neo-black font-black uppercase text-[10px] sm:text-xs whitespace-nowrap">
                  {speechMessage}
                </p>
              </m.div>
            </div>
          </div>
        )}
      </div>
    </m.div>
  );
});
