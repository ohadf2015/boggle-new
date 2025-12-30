'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Crown, Medal, Award } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import type { Avatar as AvatarType } from '@/shared/types/game';
import { cn } from '../../../lib/utils';

interface TvPlayerCardProps {
  username: string;
  avatar?: AvatarType | null;
  score: number;
  wordCount: number;
  rank: number;
  comboLevel?: number;
  isHost?: boolean;
  index: number;
}

// Rank badge configurations
const RANK_CONFIGS = {
  1: {
    icon: Crown,
    bgColor: 'bg-gradient-to-r from-yellow-400 to-amber-500',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-600',
    shadowColor: 'shadow-[4px_4px_0_rgba(202,138,4,1)]',
  },
  2: {
    icon: Medal,
    bgColor: 'bg-gradient-to-r from-gray-300 to-gray-400',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-500',
    shadowColor: 'shadow-[4px_4px_0_rgba(107,114,128,1)]',
  },
  3: {
    icon: Award,
    bgColor: 'bg-gradient-to-r from-amber-600 to-amber-700',
    textColor: 'text-amber-100',
    borderColor: 'border-amber-800',
    shadowColor: 'shadow-[4px_4px_0_rgba(146,64,14,1)]',
  },
};

/**
 * TvPlayerCard - Individual player card for TV broadcast leaderboard
 * Shows avatar, name, score, combo level, and rank
 */
const TvPlayerCard = memo<TvPlayerCardProps>(({
  username,
  avatar,
  score,
  wordCount,
  rank,
  comboLevel = 0,
  isHost = false,
  index,
}) => {
  const rankConfig = RANK_CONFIGS[rank as keyof typeof RANK_CONFIGS];
  const isTopThree = rank <= 3;

  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black transition-all',
        isTopThree
          ? `${rankConfig?.bgColor} ${rankConfig?.shadowColor}`
          : 'bg-neo-cream shadow-hard-sm hover:shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5'
      )}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-neo border-2 border-neo-black font-black text-lg',
          isTopThree ? 'bg-neo-black text-neo-cream' : 'bg-neo-white text-neo-black'
        )}
      >
        {isTopThree && rankConfig?.icon ? (
          <rankConfig.icon className="w-5 h-5" />
        ) : (
          `#${rank}`
        )}
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar
          avatarEmoji={avatar?.emoji}
          avatarImage={avatar?.avatarImage}
          avatarColor={avatar?.color}
          profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
          size="lg"
          className="border-2 border-neo-black"
        />
        {isHost && (
          <div className="absolute -top-1 -right-1 bg-neo-purple text-neo-cream text-[10px] font-bold px-1 rounded border border-neo-black">
            HOST
          </div>
        )}
      </div>

      {/* Name & Word Count */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-black text-lg uppercase truncate',
            isTopThree ? rankConfig?.textColor : 'text-neo-black'
          )}
        >
          {username}
        </p>
        <p
          className={cn(
            'text-sm font-bold',
            isTopThree ? `${rankConfig?.textColor} opacity-80` : 'text-neo-black/60'
          )}
        >
          {wordCount} words
        </p>
      </div>

      {/* Combo Indicator */}
      {comboLevel > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black',
            comboLevel >= 10
              ? 'bg-gradient-to-r from-neo-red to-neo-pink text-neo-cream'
              : comboLevel >= 5
              ? 'bg-neo-orange text-neo-black'
              : 'bg-neo-yellow text-neo-black'
          )}
        >
          <Flame className="w-4 h-4" />
          <span className="font-black text-sm">{comboLevel}x</span>
        </motion.div>
      )}

      {/* Score */}
      <div className="text-right">
        <motion.p
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className={cn(
            'font-black text-2xl',
            isTopThree ? rankConfig?.textColor : 'text-neo-black'
          )}
        >
          {score}
        </motion.p>
        <p
          className={cn(
            'text-xs font-bold uppercase',
            isTopThree ? `${rankConfig?.textColor} opacity-70` : 'text-neo-black/50'
          )}
        >
          pts
        </p>
      </div>
    </motion.div>
  );
});

TvPlayerCard.displayName = 'TvPlayerCard';

export default TvPlayerCard;
