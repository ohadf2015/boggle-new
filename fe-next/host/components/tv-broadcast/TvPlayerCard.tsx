'use client';

import { memo, useRef, useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Flame, Crown, Medal, Award, WifiOff, Clock, ArrowUp, ArrowDown, Heart, Skull } from 'lucide-react';
import Image from 'next/image';
import Avatar from '../../../components/Avatar';
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import { cn } from '../../../lib/utils';

// Illustrated rank badge images
const RANK_BADGE_IMAGES: Record<number, string> = {
  1: '/images/tv-broadcast/rank-crown-gold.png',
  2: '/images/tv-broadcast/rank-medal-silver.png',
  3: '/images/tv-broadcast/rank-award-bronze.png',
};

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
  leaderScore?: number;
  gameMode?: string | null;
  lives?: number;
  isEliminated?: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
}

// Rank badge configurations
const RANK_CONFIGS = {
  1: {
    icon: Crown,
    bgColor: 'bg-linear-to-r from-yellow-400 to-amber-500',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-600',
    shadowColor: 'shadow-[4px_4px_0_rgba(202,138,4,1)]',
  },
  2: {
    icon: Medal,
    bgColor: 'bg-linear-to-r from-gray-300 to-gray-400',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-500',
    shadowColor: 'shadow-[4px_4px_0_rgba(107,114,128,1)]',
  },
  3: {
    icon: Award,
    bgColor: 'bg-linear-to-r from-amber-600 to-amber-700',
    textColor: 'text-amber-100',
    borderColor: 'border-amber-800',
    shadowColor: 'shadow-[4px_4px_0_rgba(146,64,14,1)]',
  },
};

// Score bar colors by rank
const SCORE_BAR_COLORS: Record<number, string> = {
  1: 'bg-neo-yellow',
  2: 'bg-gray-300',
  3: 'bg-amber-600',
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
  leaderScore = 0,
  gameMode,
  lives,
  isEliminated = false,
  t,
}) => {
  const rankConfig = RANK_CONFIGS[rank as keyof typeof RANK_CONFIGS];
  const isTopThree = rank <= 3;

  // Score bar
  const barPercentage = leaderScore > 0 ? Math.round((score / leaderScore) * 100) : 0;
  const barColor = SCORE_BAR_COLORS[rank] || 'bg-neo-cyan/30';

  const isAway = disconnected || presenceStatus === 'afk' || presenceStatus === 'idle';

  // Track previous score for flash effect
  const prevScoreRef = useRef(score);
  const isFirstRender = useRef(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // Track score delta for badge
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);

  // Track previous rank for rank change arrows
  const prevRankRef = useRef(rank);
  const [rankChange, setRankChange] = useState<'up' | 'down' | null>(null);

  // Score change flash + delta
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return undefined;
    }

    if (score !== prevScoreRef.current) {
      const delta = score - prevScoreRef.current;
      setIsFlashing(true);
      if (delta > 0) setScoreDelta(delta);
      const flashTimer = setTimeout(() => setIsFlashing(false), 600);
      const deltaTimer = setTimeout(() => setScoreDelta(null), 2500);
      prevScoreRef.current = score;
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(deltaTimer);
      };
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
    <m.div
      layout
      layoutId={`player-${username}`}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black transition-colors overflow-hidden',
        isEliminated && 'opacity-50',
        isTopThree && !isEliminated
          ? `${rankConfig?.bgColor} ${rankConfig?.shadowColor}`
          : isTopThree && isEliminated
            ? 'bg-gray-400 shadow-hard-sm'
            : 'bg-neo-cream shadow-hard-sm hover:shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5',
        isFlashing && !isEliminated && 'ring-2 ring-neo-yellow'
      )}
    >
      {/* Rank Badge + Change Arrow */}
      <div className="relative">
        <div
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-neo border-2 border-neo-black font-black text-lg relative overflow-hidden',
            isTopThree ? 'bg-neo-black text-neo-cream' : 'bg-neo-white text-neo-black'
          )}
        >
          {isTopThree && RANK_BADGE_IMAGES[rank] ? (
            <Image
              src={RANK_BADGE_IMAGES[rank]}
              alt={`Rank ${rank}`}
              fill
              className="object-contain p-0.5"
              sizes="40px"
            />
          ) : isTopThree && rankConfig?.icon ? (
            <rankConfig.icon className="w-5 h-5" />
          ) : (
            `#${rank}`
          )}
        </div>

        {/* Rank change arrow */}
        <AnimatePresence>
          {rankChange && (
            <m.div
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
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar

          avatarImage={avatar?.avatarImage}
          customAvatar={avatar?.customAvatar ?? undefined}
          size="lg"
          className={cn(
            "border-2 border-neo-black",
            isAway && !isBot && "opacity-50"
          )}
          mode="multiplayer"
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
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              'font-black text-lg uppercase truncate',
              isEliminated && 'line-through',
              isTopThree ? rankConfig?.textColor : 'text-neo-black'
            )}
          >
            {username}
          </p>
          {isEliminated && (
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-neo-red text-neo-cream text-[10px] font-black uppercase border border-neo-black">
              <Skull className="w-3 h-3" />
              {t('tvBroadcast.eliminated')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-bold',
              isTopThree ? `${rankConfig?.textColor} opacity-80` : 'text-neo-black/60'
            )}
          >
            {wordCount} {t('tvResults.words')}
          </p>
          {gameMode === 'word-hunt' && lives != null && !isEliminated && (
            <span className="flex items-center gap-0.5 text-neo-red text-sm font-bold">
              <Heart className="w-3.5 h-3.5 fill-neo-red" />
              {lives}
            </span>
          )}
        </div>
      </div>

      {/* Combo Indicator */}
      {comboLevel > 0 && (
        <div className="relative">
          {/* Combo glow aura for high combos */}
          {comboLevel >= 5 && (
            <m.div
              className="absolute -inset-3 pointer-events-none"
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 1, repeat: Infinity }}
              aria-hidden="true"
            >
              <Image
                src="/images/tv-broadcast/fx-combo-glow.png"
                alt=""
                width={60}
                height={60}
                className="opacity-80"
              />
            </m.div>
          )}
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className={cn(
              'relative flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black',
              comboLevel >= 10
                ? 'bg-linear-to-r from-neo-red to-neo-pink text-neo-cream'
                : comboLevel >= 5
                ? 'bg-neo-orange text-neo-black'
                : 'bg-neo-yellow text-neo-black'
            )}
          >
            <Flame className="w-4 h-4" />
            <span className="font-black text-sm">{comboLevel}x</span>
          </m.div>
        </div>
      )}

      {/* Score Delta Badge + Score */}
      <div className="text-end flex items-center gap-2">
        <AnimatePresence>
          {scoreDelta !== null && (
            <m.div
              data-testid="score-delta"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-1.5 py-0.5 rounded-neo border-2 border-neo-black bg-green-400 text-neo-black font-black text-sm"
            >
              +{scoreDelta}
            </m.div>
          )}
        </AnimatePresence>
        <div>
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
      </div>

      {/* Score Bar */}
      <m.div
        data-testid="score-bar"
        className={cn('absolute bottom-0 left-0 h-1 rounded-b-neo', barColor)}
        animate={{ width: `${barPercentage}%` }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      />
    </m.div>
  );
});

TvPlayerCard.displayName = 'TvPlayerCard';

export default TvPlayerCard;
