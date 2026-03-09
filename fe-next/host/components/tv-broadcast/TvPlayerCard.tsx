'use client';

import { memo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Crown, Medal, Award, WifiOff, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import { cn } from '../../../lib/utils';

interface TvPlayerCardProps {
  username: string;
  avatar?: AvatarType | null;
  score: number;
  wordCount: number;
  rank: number;
  comboLevel?: number;
  isHost?: boolean;
  isBot?: boolean;
  presenceStatus?: PresenceStatus;
  disconnected?: boolean;
  index: number;
  t: (path: string, params?: Record<string, string | number>) => string;
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
 * Shows avatar, name, score, combo level, rank, and animated transitions
 */
const TvPlayerCard = memo<TvPlayerCardProps>(({
  username,
  avatar,
  score,
  wordCount,
  rank,
  comboLevel = 0,
  isHost = false,
  isBot = false,
  presenceStatus = 'active',
  disconnected = false,
  index: _index,
  t,
}) => {
  const rankConfig = RANK_CONFIGS[rank as keyof typeof RANK_CONFIGS];
  const isTopThree = rank <= 3;
  const isAway = disconnected || presenceStatus === 'afk' || presenceStatus === 'idle';

  // Track previous score for flash effect
  const prevScoreRef = useRef(score);
  const isFirstRender = useRef(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // Track previous rank for rank change arrows
  const prevRankRef = useRef(rank);
  const [rankChange, setRankChange] = useState<'up' | 'down' | null>(null);

  // Score change flash
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return undefined;
    }

    if (score !== prevScoreRef.current) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 600);
      prevScoreRef.current = score;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [score]);

  // Rank change detection
  useEffect(() => {
    if (prevRankRef.current === rank) return;

    const direction = rank < prevRankRef.current ? 'up' : 'down';
    setRankChange(direction);
    prevRankRef.current = rank;

    const timer = setTimeout(() => setRankChange(null), 3000);
    return () => clearTimeout(timer);
  }, [rank]);

  return (
    <motion.div
      layout
      layoutId={`player-${username}`}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black transition-colors',
        isTopThree
          ? `${rankConfig?.bgColor} ${rankConfig?.shadowColor}`
          : 'bg-neo-cream shadow-hard-sm hover:shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5',
        isFlashing && 'ring-2 ring-neo-yellow'
      )}
    >
      {/* Rank Badge + Change Arrow */}
      <div className="relative">
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

        {/* Rank change arrow */}
        <AnimatePresence>
          {rankChange && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={cn(
                'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center border border-neo-black',
                rankChange === 'up' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              )}
              aria-label={rankChange === 'up' ? t('tvBroadcast.rankUp') : t('tvBroadcast.rankDown')}
            >
              {rankChange === 'up' ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar
          profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
          avatarImage={avatar?.avatarImage}
          size="lg"
          className={cn(
            "border-2 border-neo-black",
            isAway && !isBot && "opacity-50"
          )}
        />
        {isHost && !isAway && (
          <div
            className="absolute -top-1 -right-1 bg-neo-purple text-neo-cream text-[10px] font-bold px-1 rounded border border-neo-black"
            aria-label={t('tvBroadcast.hostBadge')}
          >
            {t('tvBroadcast.host')}
          </div>
        )}
        {disconnected && !isBot && (
          <div
            className="absolute -top-1 -right-1 bg-neo-red text-neo-cream p-1 rounded-full border border-neo-black"
            aria-label={t('common.playerDisconnected')}
            title={t('common.playerDisconnected')}
          >
            <WifiOff className="w-3 h-3" />
          </div>
        )}
        {!disconnected && presenceStatus === 'afk' && !isBot && (
          <div
            className="absolute -top-1 -right-1 bg-neo-orange text-neo-black p-1 rounded-full border border-neo-black"
            aria-label={t('common.playerAFK')}
            title={t('common.playerAFK')}
          >
            <Clock className="w-3 h-3" />
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
          {wordCount} {t('tvResults.words')}
        </p>
      </div>

      {/* Combo Indicator */}
      {comboLevel > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
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

      {/* Score — uses AnimatedCounter for spring-based counting */}
      <div className="text-right">
        <AnimatedCounter
          value={score}
          className={cn(
            'font-black text-2xl',
            isTopThree ? rankConfig?.textColor : 'text-neo-black'
          )}
          size="xl"
          formatValue={(v) => Math.round(v).toLocaleString()}
        />
        <p
          className={cn(
            'text-xs font-bold uppercase',
            isTopThree ? `${rankConfig?.textColor} opacity-70` : 'text-neo-black/50'
          )}
        >
          {t('tvResults.pts')}
        </p>
      </div>
    </motion.div>
  );
});

TvPlayerCard.displayName = 'TvPlayerCard';

export default TvPlayerCard;
