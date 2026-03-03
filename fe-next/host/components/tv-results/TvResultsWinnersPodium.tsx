'use client';

import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Medal, Award } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { fireRankConfetti } from '../../../utils/confettiUtils';
import { cn } from '../../../lib/utils';
import type { Avatar as AvatarType } from '@/shared/types/game';

interface PodiumPlayer {
  username: string;
  score: number;
  avatar?: AvatarType | null;
  wordCount?: number;
}

interface TvResultsWinnersPodiumProps {
  players: PodiumPlayer[];
  show3rd: boolean;
  show2nd: boolean;
  show1st: boolean;
  showConfetti: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
}

// Podium configurations for each rank
const PODIUM_CONFIG = {
  1: {
    icon: Crown,
    bgGradient: 'from-yellow-400 via-amber-400 to-yellow-500',
    borderColor: 'border-yellow-600',
    shadowColor: 'shadow-[6px_6px_0_rgba(202,138,4,1)]',
    textColor: 'text-yellow-900',
    size: 'large',
    avatarSize: 120,
    scoreSize: 'text-5xl',
    nameSize: 'text-3xl',
    height: 'h-72',
    order: 2, // Center position
  },
  2: {
    icon: Medal,
    bgGradient: 'from-gray-300 via-slate-300 to-gray-400',
    borderColor: 'border-gray-500',
    shadowColor: 'shadow-[5px_5px_0_rgba(107,114,128,1)]',
    textColor: 'text-gray-800',
    size: 'medium',
    avatarSize: 100,
    scoreSize: 'text-4xl',
    nameSize: 'text-2xl',
    height: 'h-60',
    order: 1, // Left position
  },
  3: {
    icon: Award,
    bgGradient: 'from-amber-500 via-orange-500 to-amber-600',
    borderColor: 'border-amber-700',
    shadowColor: 'shadow-[4px_4px_0_rgba(146,64,14,1)]',
    textColor: 'text-amber-100',
    size: 'small',
    avatarSize: 80,
    scoreSize: 'text-3xl',
    nameSize: 'text-2xl',
    height: 'h-52',
    order: 3, // Right position
  },
};

const RANK_LABELS = {
  1: 'champion',
  2: 'runnerUp',
  3: 'bronze',
};

/**
 * TvResultsWinnersPodium - Olympic-style podium for top 3 players
 * Shows 2nd-1st-3rd horizontally with staggered heights
 */
const TvResultsWinnersPodium = memo<TvResultsWinnersPodiumProps>(({
  players,
  show3rd,
  show2nd,
  show1st,
  showConfetti,
  t,
}) => {
  // Fire confetti for 1st place
  useEffect(() => {
    if (showConfetti && players.length > 0) {
      fireRankConfetti(1);
    }
  }, [showConfetti, players.length]);

  // Get player by rank (0-indexed array, 1-indexed rank)
  const getPlayer = (rank: number): PodiumPlayer | null => {
    return players[rank - 1] || null;
  };

  // Determine which players to show
  const visiblePlayers: { rank: number; player: PodiumPlayer; visible: boolean }[] = [];

  if (players.length >= 3) {
    visiblePlayers.push({ rank: 3, player: getPlayer(3)!, visible: show3rd });
  }
  if (players.length >= 2) {
    visiblePlayers.push({ rank: 2, player: getPlayer(2)!, visible: show2nd });
  }
  if (players.length >= 1) {
    visiblePlayers.push({ rank: 1, player: getPlayer(1)!, visible: show1st });
  }

  // Sort by display order (2nd, 1st, 3rd = left, center, right)
  const sortedPlayers = [...visiblePlayers].sort((a, b) => {
    const orderA = PODIUM_CONFIG[a.rank as keyof typeof PODIUM_CONFIG].order;
    const orderB = PODIUM_CONFIG[b.rank as keyof typeof PODIUM_CONFIG].order;
    return orderA - orderB;
  });

  // Handle 2-player case (show them side by side)
  if (players.length === 2) {
    return (
      <div className="flex items-end justify-center gap-8 px-8">
        <AnimatePresence>
          {sortedPlayers.filter(p => p.visible).map(({ rank, player }) => (
            <PodiumCard
              key={rank}
              rank={rank}
              player={player}
              t={t}
              isWinner={rank === 1}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-6 px-8">
      <AnimatePresence>
        {sortedPlayers.filter(p => p.visible).map(({ rank, player }) => (
          <PodiumCard
            key={rank}
            rank={rank}
            player={player}
            t={t}
            isWinner={rank === 1}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

TvResultsWinnersPodium.displayName = 'TvResultsWinnersPodium';

// Individual podium card component
interface PodiumCardProps {
  rank: number;
  player: PodiumPlayer;
  t: (path: string, params?: Record<string, string | number>) => string;
  isWinner?: boolean;
}

const PodiumCard = memo<PodiumCardProps>(({ rank, player, t, isWinner }) => {
  const config = PODIUM_CONFIG[rank as keyof typeof PODIUM_CONFIG];
  const Icon = config.icon;
  const labelKey = RANK_LABELS[rank as keyof typeof RANK_LABELS];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: isWinner ? 0.2 : 0,
      }}
      className={cn(
        'flex flex-col items-center justify-end p-6 rounded-neo border-4 border-neo-black',
        `bg-gradient-to-b ${config.bgGradient}`,
        config.shadowColor,
        config.height,
        isWinner ? 'w-56 z-10' : 'w-48'
      )}
    >
      {/* Rank Badge */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
        className={cn(
          'absolute -top-5 left-1/2 -translate-x-1/2',
          'w-14 h-14 rounded-full border-4 border-neo-black',
          'bg-neo-cream flex items-center justify-center',
          'shadow-hard'
        )}
      >
        <Icon className={cn('w-7 h-7', config.textColor)} />
      </motion.div>

      {/* Rank Label */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.5 }}
        className={cn(
          'font-black uppercase tracking-wide mb-3',
          config.textColor,
          isWinner ? 'text-lg' : 'text-sm'
        )}
      >
        {t(`tvResults.${labelKey}`)}
      </motion.div>

      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.4 }}
        className={cn(
          'relative mb-3',
          isWinner && 'animate-pulse-subtle'
        )}
      >
        <Avatar
          profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
          avatarImage={player.avatar?.avatarImage}
          size={isWinner ? 'xl' : 'lg'}
          className="border-4 border-neo-black shadow-hard"
        />
      </motion.div>

      {/* Username */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.6 }}
        className={cn(
          'font-black uppercase truncate max-w-full text-center mb-2',
          'bg-black/30 px-3 py-1 rounded-neo',
          config.textColor,
          config.nameSize
        )}
        style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
        title={player.username}
      >
        {player.username}
      </motion.p>

      {/* Score */}
      <motion.div
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.7 }}
        className={cn(
          'font-black',
          config.textColor,
          config.scoreSize
        )}
      >
        {player.score}
        <span className="text-sm font-bold ml-1 opacity-70">{t('tvResults.pts')}</span>
      </motion.div>

      {/* Word Count */}
      {player.wordCount !== undefined && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.8 }}
          className={cn('text-sm font-bold opacity-70', config.textColor)}
        >
          {player.wordCount} {t('tvResults.words')}
        </motion.p>
      )}
    </motion.div>
  );
});

PodiumCard.displayName = 'PodiumCard';

export default TvResultsWinnersPodium;
