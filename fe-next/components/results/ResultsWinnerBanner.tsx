import React, { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Crown, Trophy, Medal, Hand } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { fireRankConfetti } from '@/utils/confettiUtils';
import Avatar from '../Avatar';
import { MascotWithEntrance, MascotVariant } from '@/components/ui/Mascot';
import type { PlayerResult } from '@/types/components';

// Winner data - includes username, score, and optional avatar
interface WinnerData {
  username: string;
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
  // Single player mode support
  variant?: 'ranking' | 'highScore' | 'newRecord' | 'completion';
  customMessage?: string; // Override the rank message
  customAnnouncement?: string; // Override the announcement text
  showConfetti?: boolean; // Control confetti independently (default: true for top 3)
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
    bgClass: 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500',
    textClass: 'text-neo-black', // Dark text on light amber background
    iconBgClass: 'bg-neo-cream',
    iconTextClass: 'text-amber-500',
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

const ResultsWinnerBanner: React.FC<ResultsWinnerBannerProps> = ({
  winner,
  isCurrentUserWinner,
  rank = 1,
  variant = 'ranking',
  customMessage,
  customAnnouncement,
  showConfetti: showConfettiProp,
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
      return t('results.noPoints') || 'No Points';
    }

    // Handle single player variants
    if (variant === 'highScore') return t('singlePlayer.newHighScore') || 'New High Score!';
    if (variant === 'newRecord') return t('challenge.allTimeRecord') || 'All-Time Record!';
    if (variant === 'completion') return t('singlePlayer.gameOver') || 'Game Over';

    // Multiplayer ranking
    if (rank === 1) return t('results.youWon');
    if (rank === 2) return t('results.secondPlace') || '2nd Place!';
    if (rank === 3) return t('results.thirdPlace') || '3rd Place!';
    return t('results.betterLuckNextTime') || 'Better luck next time!';
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
    if (variant === 'highScore') return t('singlePlayer.beatYourRecord') || 'You beat your record!';
    if (variant === 'newRecord') return t('challenge.firstRecord') || 'First Record Set!';
    if (variant === 'completion') return t('singlePlayer.practiceComplete') || 'Practice Complete';

    // Multiplayer ranking - More placement-focused
    if (rank === 1) return t('results.winnerAnnouncement');
    if (rank === 2) return t('results.silverMedalist') || 'Silver Medalist';
    if (rank === 3) return t('results.bronzeMedalist') || 'Bronze Medalist';
    // For 4th+ place, show placement explicitly
    return t('results.yourPlace', { rank }) || `You finished ${getOrdinalSuffix(rank)}`;
  };

  if (!winner) return null;

  // Select the appropriate icon for this rank
  const RankIcon = rank === 1 ? Crown : rank <= 3 ? Medal : Hand;

  // Select mascot based on rank/outcome (adds personality to results)
  const getMascotVariant = (): MascotVariant => {
    // Zero score - oops face
    if (winner && winner.score === 0) return 'oops';

    // Single player variants
    if (variant === 'highScore' || variant === 'newRecord') return 'victory';
    if (variant === 'completion') return 'happy';

    // Multiplayer ranking
    if (rank === 1) return 'victory'; // Crown celebration
    if (rank === 2) return 'celebrating'; // Silver happiness
    if (rank === 3) return 'excited'; // Bronze excitement
    return 'encouraging'; // Non-podium encouragement
  };

  const mascotVariant = getMascotVariant();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-4 sm:mb-6 md:mb-8 relative w-full"
    >
      {/* Neo-Brutalist Main Container - Clickable for confetti */}
      <div
        className={`relative ${styles.bgClass} border-4 border-neo-black rounded-neo-lg shadow-hard-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]`}
        style={{ transform: 'rotate(-1deg)' }}
        onClick={handleConfetti}
      >
        {/* Comic-style halftone texture pattern - subtle for winner banner */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        />

        {/* Content - Compact layout */}
        <div className="relative z-10 p-3 sm:p-4 md:p-5 text-center">
          {/* Compact horizontal layout: Icon + Content */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Animated Icon + Placement Badge - Smaller */}
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
              className="flex-shrink-0 relative"
            >
              <div className={`${styles.iconBgClass} border-3 border-neo-black rounded-neo p-2 shadow-hard inline-block`}>
                <RankIcon
                  className={`text-2xl sm:text-3xl md:text-4xl ${styles.iconTextClass}`}
                  style={{
                    filter: 'drop-shadow(2px 2px 0px rgb(var(--neo-black)))',
                  }}
                />
              </div>
              {/* Prominent Placement Badge - Only for multiplayer ranking */}
              {variant === 'ranking' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className="absolute -top-2 -right-2 bg-neo-black text-neo-cream border-3 border-neo-cream rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-hard-lg"
                >
                  <span className="text-lg sm:text-xl font-black">
                    {getOrdinalSuffix(rank)}
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Center content: Avatar + Name + Message */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2 sm:gap-3"
            >
              {/* Winner Avatar - Smaller */}
              {winner.avatar && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className="border-3 border-neo-black rounded-full shadow-hard-sm bg-neo-cream p-0.5 flex-shrink-0"
                >
                  <Avatar
                    profilePictureUrl={winner.avatar.profilePictureUrl ?? undefined}
                    avatarImage={winner.avatar.avatarImage}
                    size="lg"
                  />
                </motion.div>
              )}
              <div className="text-left">
                {/* Rank Message - Always shown for current player's banner */}
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.45, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className={`inline-block ${styles.messageBgClass} ${styles.messageTextClass} text-xs sm:text-sm font-black uppercase px-2 py-0.5 border-2 border-neo-black rounded-neo shadow-hard-sm mb-1`}
                >
                  {getRankMessage()}
                </motion.span>
                {/* Username - Smaller */}
                <h1
                  className={`text-xl sm:text-2xl md:text-3xl font-black ${styles.textClass} uppercase leading-tight`}
                  style={{
                    textShadow: `2px 2px 0px ${styles.nameShadowColor}`,
                  }}
                >
                  {winner.username}
                </h1>
                {/* Announcement Text - Smaller */}
                <p className={`text-xs sm:text-sm font-bold ${styles.textClass} opacity-80 uppercase`}>
                  {getAnnouncementText()}
                </p>
              </div>
            </motion.div>

            {/* Score Badge - Compact */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <Trophy
                className={`text-xl sm:text-2xl ${styles.textClass} hidden sm:block`}
                style={{ filter: `drop-shadow(1px 1px 0px ${styles.trophyShadowColor})` }}
              />
              <div className="bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo px-3 py-1.5 sm:px-4 sm:py-2 shadow-hard">
                <p className="text-lg sm:text-xl md:text-2xl font-black text-neo-black">
                  {winner.score} <span className="text-xs sm:text-sm">{t('results.points')}</span>
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Mascot - Positioned at corner with animation */}
        <div className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-0 z-20 pointer-events-none">
          <MascotWithEntrance
            variant={mascotVariant}
            size="sm"
            delay={0.6}
            className="drop-shadow-lg"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsWinnerBanner;
