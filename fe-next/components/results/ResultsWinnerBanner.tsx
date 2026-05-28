import React, { useEffect, useCallback, useRef, useState, memo } from 'react';
import { m, useMotionValue, useTransform, animate } from 'framer-motion';
import { Crown, Medal, Hand } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { fireEquippedVictoryEffect } from '@/utils/victoryEffects';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '../Avatar';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { MascotWithEntrance, MascotVariant } from '@/components/ui/Mascot';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import type { PlayerResult } from '@/types/components';
import { formatRankOrdinal } from '@/utils/formatRankOrdinal';

/** Animated score counter that counts up from 0 */
const ScoreCounter: React.FC<{ target: number; className?: string }> = ({ target, className }) => {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, target, {
      type: 'spring',
      stiffness: 80,
      damping: 15,
      mass: 0.5,
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [target, motionVal, rounded]);

  return <span className={className}>{display}</span>;
};

// Winner data - includes username, score, and optional avatar
interface WinnerData {
  username: string | undefined;
  score: number;
  avatar?: {
    customAvatar?: CustomAvatarConfig | null;
  };
}

interface ResultsWinnerBannerProps {
  winner: WinnerData | PlayerResult | null;
  isCurrentUserWinner: boolean;
  rank?: number; // 1 = 1st place (default), 2 = 2nd place, 3 = 3rd place
  totalPlayers?: number; // Total number of players in the game (for "X of Y" display)
  // Single player mode support
  variant?: 'ranking' | 'highScore' | 'newRecord' | 'completion';
  customMessage?: string; // Override the rank message
  customAnnouncement?: string; // Override the announcement text
  showConfetti?: boolean; // Control confetti independently (default: true for top 3)
  /** Compact mode - reduced height for mobile above-fold (default: false) */
  compact?: boolean;
}

// Styling configuration for each rank
const RANK_STYLES: Record<number, {
  bgClass: string;
  textClass: string;
  iconBgClass: string;
  iconTextClass: string;
  messageBgClass: string;
  messageTextClass: string;
  nameShadowColor: string;
  trophyShadowColor: string;
  accentColor: string;
  glowColor: string;
}> = {
  1: {
    bgClass: 'bg-linear-to-br from-tier-gold via-yellow-300 to-tier-gold',
    textClass: 'text-neo-black',
    iconBgClass: 'bg-neo-cream',
    iconTextClass: 'text-tier-gold',
    messageBgClass: 'bg-neo-pink',
    messageTextClass: 'text-neo-white',
    nameShadowColor: 'var(--neo-cyan)',
    trophyShadowColor: 'var(--neo-pink)',
    accentColor: '#FFD700',
    glowColor: 'rgba(255,215,0,0.25)',
  },
  2: {
    bgClass: 'bg-neo-navy',
    textClass: 'text-white',
    iconBgClass: 'bg-slate-100',
    iconTextClass: 'text-slate-400',
    messageBgClass: 'bg-slate-600',
    messageTextClass: 'text-white',
    nameShadowColor: 'var(--neo-cyan)',
    trophyShadowColor: '#94a3b8',
    accentColor: '#00FFFF',
    glowColor: 'rgba(0,255,255,0.2)',
  },
  3: {
    bgClass: 'bg-linear-to-br from-amber-700 via-orange-600 to-amber-700',
    textClass: 'text-neo-white',
    iconBgClass: 'bg-amber-100',
    iconTextClass: 'text-amber-700',
    messageBgClass: 'bg-amber-900',
    messageTextClass: 'text-white',
    nameShadowColor: 'rgba(0,0,0,0.3)',
    trophyShadowColor: '#CD7F32',
    accentColor: '#CD7F32',
    glowColor: 'rgba(205,127,50,0.2)',
  },
  4: {
    bgClass: 'bg-linear-to-br from-neo-pink via-purple-500 to-neo-pink',
    textClass: 'text-white',
    iconBgClass: 'bg-purple-100',
    iconTextClass: 'text-neo-pink',
    messageBgClass: 'bg-purple-700',
    messageTextClass: 'text-white',
    nameShadowColor: 'var(--neo-cyan)',
    trophyShadowColor: '#a855f7',
    accentColor: '#A855F7',
    glowColor: 'rgba(168,85,247,0.2)',
  },
};

const ResultsWinnerBanner = memo<ResultsWinnerBannerProps>(({
  winner,
  rank = 1,
  totalPlayers,
  variant = 'ranking',
  customMessage,
  customAnnouncement,
  showConfetti: showConfettiProp,
  compact = false,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const equippedEffect = useEquippedCosmetic('victoryEffect');

  // Determine if confetti should fire (skip in reduced-motion)
  const shouldShowConfetti = !reducedMotion && (showConfettiProp ?? (variant === 'ranking' ? rank <= 3 : variant !== 'completion'));

  // Normalize rank for styling (4+ all use the same style)
  // For non-ranking variants, use rank 1 style for victories/records
  const styleRank = variant === 'ranking'
    ? (rank <= 3 ? rank : 4)
    : (variant === 'completion' ? 4 : 1);

  // Track if confetti has already been fired to prevent duplicate firings
  const hasFiredConfettiRef = useRef(false);
  const confettiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the confetti function for this rank
  const handleConfetti = useCallback(() => {
    if (shouldShowConfetti) {
      fireEquippedVictoryEffect(rank, equippedEffect);
    }
  }, [rank, shouldShowConfetti, equippedEffect]);

  // Fire confetti on mount - using refs to prevent cleanup issues when deps change
  // IMPORTANT: Set ref INSIDE callback so confetti can retry if cleanup runs before timeout
  // Uses 'light' intensity for automatic triggers to avoid overwhelming the user
  useEffect(() => {
    if (winner && shouldShowConfetti && !hasFiredConfettiRef.current) {
      confettiTimeoutRef.current = setTimeout(() => {
        hasFiredConfettiRef.current = true;
        fireEquippedVictoryEffect(rank, equippedEffect);
        confettiTimeoutRef.current = null;
      }, 400);
    }
  }, [winner, shouldShowConfetti, rank, equippedEffect]);

  // Separate cleanup effect - only runs on unmount
  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  // Get styles for this rank (4+ use the same purple style)
  const styles = RANK_STYLES[styleRank] || RANK_STYLES[4];

  // Get the appropriate message for this rank/variant
  const getRankMessage = () => {
    if (customMessage) return customMessage;

    // Handle zero score - special case
    if (winner && winner.score === 0) {
      return t('results.noPoints');
    }

    // Handle single player variants
    if (variant === 'highScore') return t('singlePlayer.newHighScore');
    if (variant === 'newRecord') return t('challenge.allTimeRecord');
    if (variant === 'completion') return t('singlePlayer.gameOver');

    // Multiplayer ranking
    if (rank === 1) return t('results.youWon');
    if (rank === 2) return t('results.secondPlace');
    if (rank === 3) return t('results.thirdPlace');
    return t('results.betterLuckNextTime');
  };

  // Ordinal formatting delegated to i18n utility

  // Get the appropriate announcement text
  const getAnnouncementText = () => {
    if (customAnnouncement) return customAnnouncement;

    // Handle single player variants
    if (variant === 'highScore') return t('singlePlayer.beatYourRecord');
    if (variant === 'newRecord') return t('challenge.firstRecord');
    if (variant === 'completion') return t('singlePlayer.practiceComplete');

    // Multiplayer ranking - More placement-focused
    if (rank === 1) return t('results.winnerAnnouncement');
    if (rank === 2) return t('results.silverMedalist');
    if (rank === 3) return t('results.bronzeMedalist');
    // For 4th+ place, show placement explicitly (e.g., "5 of 8")
    if (totalPlayers) {
      return t('results.yourPlace', { place: rank, total: totalPlayers });
    }
    // Fallback if totalPlayers not provided
    return t('results.yourPlaceSimple', { place: rank });
  };

  if (!winner) return null;

  // Select the appropriate icon for this rank
  const RankIcon = rank === 1 ? Crown : rank <= 3 ? Medal : Hand;

  // Select mascot based on rank/outcome (adds personality to results)
  const getMascotVariant = (): MascotVariant => {
    // Zero score - oops face
    if (winner && winner.score === 0) return 'oops';

    // Single player variants
    if (variant === 'highScore' || variant === 'newRecord') return 'happy';
    if (variant === 'completion') return 'thinking';

    // Multiplayer ranking — podium uses CelebrationMascot (not this function)
    if (rank === 1) return 'happy';
    if (rank === 2) return 'happy';
    if (rank === 3) return 'happy';

    // Non-podium: last place gets crying (only in games with > 2 players)
    if (totalPlayers && totalPlayers > 2 && rank === totalPlayers) return 'crying';

    // Non-podium with score → encouraging
    return 'encouraging';
  };

  const mascotVariant = getMascotVariant();

  return (
    <m.div
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.88, y: 30, rotate: -2 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      className="mb-3 sm:mb-4 relative w-full"
    >
      {/* Neo-Brutalist Main Container */}
      <div
        className={`relative ${styles.bgClass} border-4 border-neo-black rounded-neo-lg shadow-hard-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] -rotate-1`}
        onClick={handleConfetti}
      >
        {/* Ghost rank number — dramatic backdrop */}
        {variant === 'ranking' && (
          <m.div
            className="absolute -top-3 -inset-s-2 sm:-top-5 sm:-inset-s-3 pointer-events-none select-none"
            initial={reducedMotion ? { opacity: 0.08 } : { opacity: 0, scale: 2.5, rotate: -20 }}
            animate={{ opacity: 0.08, scale: 1, rotate: -12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          >
            <span className={`font-neo-display leading-none ${compact ? 'text-[100px]' : 'text-[120px] sm:text-[160px]'} ${styles.textClass}`}>
              {rank}
            </span>
          </m.div>
        )}

        {/* Radial spotlight from top center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% -20%, ${styles.glowColor} 0%, transparent 70%)`,
          }}
        />

        {/* Animated accent border glow for top 3 */}
        {rank <= 3 && variant === 'ranking' && !reducedMotion && (
          <m.div
            className="absolute inset-0 rounded-neo-lg pointer-events-none z-2"
            animate={{
              boxShadow: [
                `inset 0 0 0px transparent, 0 0 0px transparent`,
                `inset 0 0 30px ${styles.glowColor}, 0 0 20px ${styles.glowColor}`,
                `inset 0 0 0px transparent, 0 0 0px transparent`,
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Comic-style halftone texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle,rgb(var(--neo-black))_1px,transparent_1px)] bg-size-[12px_12px]" />

        {/* Diagonal accent stripes */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgb(var(--neo-black)) 10px, rgb(var(--neo-black)) 12px)',
          }}
        />

        {/* Shimmer sweep */}
        {!reducedMotion && (
          <m.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.2) 52%, transparent 70%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2, delay: 0.5, ease: 'easeInOut' }}
          />
        )}

        {/* Content — Two-row layout: identity row + score hero */}
        <div className={`relative z-10 ${compact ? 'px-3 py-3 sm:px-4 sm:py-3.5' : 'px-4 py-4 sm:px-5 sm:py-5'}`}>
          {/* Row 1: Rank badge + Avatar + Name + Message */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Rank placement badge */}
            {variant === 'ranking' && (
              <m.div
                initial={reducedMotion ? undefined : { scale: 0, rotate: -30, y: -20 }}
                animate={{ scale: 1, rotate: -3, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 12 }}
                whileHover={{ scale: 1.15, rotate: 3, transition: { duration: 0.15 } }}
                className="shrink-0"
              >
                <div className={`
                  relative ${styles.iconBgClass} border-3 border-neo-black rounded-neo shadow-hard
                  flex items-center justify-center
                  ${compact ? 'w-11 h-11' : 'w-14 h-14 sm:w-16 sm:h-16'}
                `}>
                  <RankIcon
                    className={`${styles.iconTextClass} ${compact ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'}`}
                  />
                  <span className={`
                    absolute -bottom-2 -inset-e-2 bg-neo-black text-neo-white border-2 border-neo-cream
                    rounded-neo font-black flex items-center justify-center shadow-hard-sm leading-none
                    ${compact ? 'px-1.5 py-0.5 min-w-[28px] text-[11px]' : 'px-2 py-1 min-w-[32px] text-xs sm:min-w-[36px] sm:text-sm'}
                  `}>
                    {formatRankOrdinal(rank, t)}
                  </span>
                </div>
              </m.div>
            )}

            {/* Avatar */}
            {winner.avatar && (
              <m.div
                initial={reducedMotion ? undefined : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="shrink-0"
              >
                <div className={`
                  border-3 border-neo-black rounded-full shadow-hard-sm bg-neo-cream p-0.5
                  ${compact ? '' : 'sm:p-1'}
                `}>
                  <Avatar
                    customAvatar={winner.avatar.customAvatar}
                    userId={winner.username}
                    size={compact ? 'lg' : 'xl'}
                  />
                </div>
              </m.div>
            )}

            {/* Name + Message */}
            <m.div
              initial={reducedMotion ? undefined : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 26 }}
              className="text-start min-w-0 flex-1"
            >
              <m.span
                initial={reducedMotion ? undefined : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                className={`inline-block ${styles.messageBgClass} ${styles.messageTextClass} text-[10px] sm:text-xs font-black uppercase px-1.5 py-0.5 border-2 border-neo-black rounded-neo shadow-hard-sm mb-0.5`}
              >
                {getRankMessage()}
              </m.span>
              <h1
                className={`font-black ${styles.textClass} uppercase leading-none truncate ${compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'}`}
                style={{ textShadow: `2px 2px 0px ${styles.nameShadowColor}` }}
              >
                {winner.username}
              </h1>
              <p className={`text-[10px] sm:text-xs font-bold ${styles.textClass} opacity-70 uppercase mt-0.5`}>
                {getAnnouncementText()}
              </p>
            </m.div>
          </div>

          {/* Row 2: Score — the HERO moment, centered and large */}
          <m.div
            initial={reducedMotion ? undefined : { scale: 0.7, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 250, damping: 14 }}
            className={`flex justify-center ${compact ? 'mt-2' : 'mt-3 sm:mt-4'}`}
          >
            <m.div
              whileHover={{ scale: 1.04, rotate: 0, transition: { duration: 0.15 } }}
              className={`
                bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard-lg
                flex flex-col items-center justify-center relative overflow-hidden
                ${compact ? 'px-6 py-2' : 'px-8 py-3 sm:px-12 sm:py-4'}
              `}
            >
              {/* Score shimmer */}
              {!reducedMotion && (
                <m.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(110deg, transparent 30%, rgba(0,0,0,0.06) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                  transition={{ duration: 2, delay: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 }}
                />
              )}
              <span className={`font-bold text-neo-black/50 uppercase tracking-widest ${compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'}`}>
                {t('results.points')}
              </span>
              <m.div
                initial={{ scale: 1 }}
                animate={!reducedMotion ? { scale: [1, 1.15, 1] } : undefined}
                transition={{ delay: 1.5, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <ScoreCounter
                  target={winner.score}
                  className={`font-black text-neo-black leading-none ${compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl md:text-6xl'}`}
                />
              </m.div>
            </m.div>
          </m.div>
        </div>

        {/* Mascot */}
        <div className={`absolute z-20 pointer-events-none ${compact ? '-bottom-1 -right-1 scale-75 origin-bottom-right' : '-bottom-2 -right-2 sm:bottom-0 sm:right-0'}`}>
            {(rank <= 3 || variant === 'highScore' || variant === 'newRecord') && winner?.score !== 0 ? (
              <CelebrationMascotWithEntrance
                variant="trophy"
                size="sm"
                delay={0.6}
                className="drop-shadow-lg"
               
                clipBorder="none"
              />
            ) : (
              <MascotWithEntrance
                variant={mascotVariant}
                size="sm"
                delay={0.6}
                className="drop-shadow-lg"
               
                clipBorder="none"
              />
            )}
        </div>
      </div>
    </m.div>
  );
});

ResultsWinnerBanner.displayName = 'ResultsWinnerBanner';

export default ResultsWinnerBanner;
