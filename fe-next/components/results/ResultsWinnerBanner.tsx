import React, { useEffect, useCallback, useRef, useState, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Crown, Medal, Hand } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { fireRankConfetti } from '@/utils/confettiUtils';
import Avatar from '../Avatar';
import { MascotWithEntrance, MascotVariant } from '@/components/ui/Mascot';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import type { PlayerResult } from '@/types/components';

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
    emoji?: string;
    color?: string;
    profilePictureUrl?: string | null;
    avatarImage?: string;
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
  textClass: string; // Main text color for contrast against bgClass
  iconBgClass: string;
  iconTextClass: string;
  messageBgClass: string;
  messageTextClass: string;
  nameShadowColor: string;
  trophyShadowColor: string;
}> = {
  1: {
    bgClass: 'bg-gradient-to-br from-tier-gold via-yellow-300 to-tier-gold',
    textClass: 'text-neo-black', // Dark text on light gold background
    iconBgClass: 'bg-neo-cream',
    iconTextClass: 'text-tier-gold',
    messageBgClass: 'bg-neo-pink',
    messageTextClass: 'text-neo-cream',
    nameShadowColor: 'var(--neo-cyan)',
    trophyShadowColor: 'var(--neo-pink)',
  },
  2: {
    bgClass: 'bg-neo-navy',
    textClass: 'text-white', // Light text on dark navy background
    iconBgClass: 'bg-slate-100',
    iconTextClass: 'text-slate-400',
    messageBgClass: 'bg-slate-600',
    messageTextClass: 'text-white',
    nameShadowColor: 'var(--neo-cyan)',
    trophyShadowColor: '#94a3b8',
  },
  3: {
    bgClass: 'bg-gradient-to-br from-neo-pink via-orange-400 to-neo-pink',
    textClass: 'text-neo-black', // Dark text on light pink/orange background
    iconBgClass: 'bg-orange-100',
    iconTextClass: 'text-neo-pink',
    messageBgClass: 'bg-amber-700',
    messageTextClass: 'text-white',
    nameShadowColor: 'var(--neo-cyan)',
    trophyShadowColor: '#ea580c',
  },
  // 4+ place: Purple encouraging banner for non-winners
  4: {
    bgClass: 'bg-gradient-to-br from-neo-pink via-purple-500 to-neo-pink',
    textClass: 'text-white', // Light text on dark purple background
    iconBgClass: 'bg-purple-100',
    iconTextClass: 'text-neo-pink',
    messageBgClass: 'bg-purple-700',
    messageTextClass: 'text-white',
    nameShadowColor: 'var(--neo-cyan)',
    trophyShadowColor: '#a855f7',
  },
};

const ResultsWinnerBanner = memo<ResultsWinnerBannerProps>(({
  winner,
  isCurrentUserWinner,
  rank = 1,
  totalPlayers,
  variant = 'ranking',
  customMessage,
  customAnnouncement,
  showConfetti: showConfettiProp,
  compact = false,
}) => {
  const { t } = useLanguage();

  // Determine if confetti should fire
  const shouldShowConfetti = showConfettiProp ?? (variant === 'ranking' ? rank <= 3 : variant !== 'completion');

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
      fireRankConfetti(rank);
    }
  }, [rank, shouldShowConfetti]);

  // Fire confetti on mount - using refs to prevent cleanup issues when deps change
  // IMPORTANT: Set ref INSIDE callback so confetti can retry if cleanup runs before timeout
  // Uses 'light' intensity for automatic triggers to avoid overwhelming the user
  useEffect(() => {
    if (winner && shouldShowConfetti && !hasFiredConfettiRef.current) {
      confettiTimeoutRef.current = setTimeout(() => {
        hasFiredConfettiRef.current = true;
        fireRankConfetti(rank, 'light');
        confettiTimeoutRef.current = null;
      }, 400);
    }
  }, [winner, shouldShowConfetti, rank]);

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

  // Get ordinal suffix for rank display (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

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
      return t('results.yourPlace', { place: rank, total: totalPlayers }) || `You finished ${getOrdinalSuffix(rank)}`;
    }
    // Fallback if totalPlayers not provided
    return `You finished ${getOrdinalSuffix(rank)}`;
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="mb-3 sm:mb-4 relative w-full"
    >
      {/* Neo-Brutalist Main Container - Clickable for confetti */}
      <div
        className={`relative ${styles.bgClass} border-4 border-neo-black rounded-neo-lg shadow-hard-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] -rotate-1`}
        onClick={handleConfetti}
      >
        {/* Comic-style halftone texture pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle,rgb(var(--neo-black))_1px,transparent_1px)] bg-[length:12px_12px]"
        />

        {/* Shimmer sweep effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 2.5, delay: 0.8, ease: 'easeInOut' }}
        />

        {/* Content - Two-row centered layout */}
        <div className={`relative z-10 ${compact ? 'px-3 py-2.5 sm:px-4 sm:py-3' : 'px-4 py-3 sm:px-5 sm:py-4'}`}>
          {/* Row 1: Rank badge + Avatar + Name + Rank message */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            {/* Rank placement badge */}
            {variant === 'ranking' && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: -3 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ scale: 1.1, rotate: 0, transition: { duration: 0.2 } }}
                className="flex-shrink-0"
              >
                <div className={`
                  relative ${styles.iconBgClass} border-3 border-neo-black rounded-neo shadow-hard
                  flex items-center justify-center
                  ${compact ? 'w-11 h-11' : 'w-14 h-14 sm:w-16 sm:h-16'}
                `}>
                  <RankIcon
                    className={`${styles.iconTextClass} ${compact ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'}`}
                  />
                  {/* Rank number overlay */}
                  <span className={`
                    absolute -bottom-1.5 -end-1.5 bg-neo-black text-neo-cream border-2 border-neo-cream
                    rounded-full font-black flex items-center justify-center shadow-hard-sm
                    ${compact ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs sm:w-9 sm:h-9 sm:text-sm'}
                  `}>
                    {getOrdinalSuffix(rank)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Avatar */}
            {winner.avatar && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="flex-shrink-0"
              >
                <div className={`
                  border-3 border-neo-black rounded-full shadow-hard-sm bg-neo-cream p-0.5
                  ${compact ? '' : 'sm:p-1'}
                `}>
                  <Avatar
                    profilePictureUrl={winner.avatar.profilePictureUrl ?? undefined}
                    avatarImage={winner.avatar.avatarImage}
                    size={compact ? 'md' : 'lg'}
                  />
                </div>
              </motion.div>
            )}

            {/* Name + Message column */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 26 }}
              className="text-start min-w-0"
            >
              {/* Rank message pill */}
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                className={`inline-block ${styles.messageBgClass} ${styles.messageTextClass} text-[10px] sm:text-xs font-black uppercase px-1.5 py-0.5 border-2 border-neo-black rounded-neo shadow-hard-sm mb-0.5`}
              >
                {getRankMessage()}
              </motion.span>
              {/* Username */}
              <h1
                className={`font-black ${styles.textClass} uppercase leading-none truncate ${compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'}`}
                style={{ textShadow: `2px 2px 0px ${styles.nameShadowColor}` }}
              >
                {winner.username}
              </h1>
              {/* Announcement */}
              <p className={`text-[10px] sm:text-xs font-bold ${styles.textClass} opacity-70 uppercase mt-0.5`}>
                {getAnnouncementText()}
              </p>
            </motion.div>

            {/* Score Badge - Prominent with count-up */}
            <motion.div
              initial={{ scale: 0, rotate: 5 }}
              animate={{ scale: 1, rotate: 2 }}
              transition={{ delay: 0.5, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ scale: 1.08, rotate: 0, transition: { duration: 0.15 } }}
              className="flex-shrink-0 ms-auto"
            >
              <div className={`
                bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard
                flex flex-col items-center justify-center
                ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2 sm:px-4 sm:py-2.5'}
              `}>
                <ScoreCounter
                  target={winner.score}
                  className={`font-black text-neo-black leading-none ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl'}`}
                />
                <span className={`font-bold text-neo-black/60 uppercase ${compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'}`}>
                  {t('results.points')}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Winner pulse ring - visible for 1st place */}
        {rank === 1 && variant === 'ranking' && (
          <>
            <div
              className="absolute inset-0 rounded-neo-lg pointer-events-none"
              style={{ animation: 'banner-pulse-ring 2s ease-in-out 1s infinite' }}
            />
            <style>{`
              @keyframes banner-pulse-ring {
                0%, 100% { box-shadow: inset 0 0 0 0 rgba(255,225,53,0), 0 0 20px rgba(255,225,53,0.15); }
                50% { box-shadow: inset 0 0 20px rgba(255,225,53,0.15), 0 0 40px rgba(255,225,53,0.3); }
              }
            `}</style>
          </>
        )}

        {/* Mascot - Hidden in compact mode */}
        {!compact && (
          <div className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-0 z-20 pointer-events-none">
            {(rank <= 3 || variant === 'highScore' || variant === 'newRecord') && winner?.score !== 0 ? (
              <CelebrationMascotWithEntrance
                variant="trophy"
                size="sm"
                delay={0.6}
                className="drop-shadow-lg"
              />
            ) : (
              <MascotWithEntrance
                variant={mascotVariant}
                size="sm"
                delay={0.6}
                className="drop-shadow-lg"
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

ResultsWinnerBanner.displayName = 'ResultsWinnerBanner';

export default ResultsWinnerBanner;
