'use client';

import { memo, useRef, useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Flame, Crown, Medal, Award, WifiOff, Clock, ArrowUp, ArrowDown, Heart, Skull } from 'lucide-react';
import Image from 'next/image';
import Avatar from '../../../components/Avatar';
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import { cn } from '../../../lib/utils';
import { teamFillClass } from '@/lib/education/teamColors';

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
  /**
   * Team battle: which side this student is on, 0-based. Null in a free-for-all
   * and for anyone the round's deal has not met yet.
   */
  teamId?: number | null;
  t: (path: string, params?: Record<string, string | number>) => string;
}

// Rank badge configurations
const RANK_CONFIGS = {
  1: { icon: Crown, bgColor: 'bg-neo-yellow', textColor: 'text-neo-black' },
  2: { icon: Medal, bgColor: 'bg-neo-cyan', textColor: 'text-neo-black' },
  3: { icon: Award, bgColor: 'bg-neo-pink', textColor: 'text-neo-black' },
};

// Score bar colors by rank: a medal row already carries its colour, so its bar is a dark track.
const SCORE_BAR_COLORS: Record<number, string> = {
  1: 'bg-neo-black/30',
  2: 'bg-neo-black/30',
  3: 'bg-neo-black/30',
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
  teamId = null,
  t,
}) => {
  const rankConfig = RANK_CONFIGS[rank as keyof typeof RANK_CONFIGS];
  const isTopThree = rank <= 3;

  // Score bar
  const barPercentage = leaderScore > 0 ? Math.round((score / leaderScore) * 100) : 0;
  const barColor = SCORE_BAR_COLORS[rank] || 'bg-neo-cyan';

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
        'relative flex items-center gap-3 p-3 2xl:gap-4 2xl:p-4 rounded-neo border-3 border-neo-black transition-colors overflow-hidden',
        isEliminated && 'opacity-50',
        isTopThree && !isEliminated
          ? `${rankConfig?.bgColor} shadow-hard`
          : isTopThree && isEliminated
            ? 'bg-neo-navy shadow-hard-sm'
            : 'bg-neo-navy shadow-hard-sm',
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
                rankChange === 'up' ? 'bg-neo-lime text-neo-black' : 'bg-neo-red text-neo-cream'
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
              'font-neo-display font-black text-lg 2xl:text-2xl uppercase truncate',
              isEliminated && 'line-through',
              isTopThree ? rankConfig?.textColor : 'text-neo-cream'
            )}
          >
            {username}
          </p>
          {teamId != null && (
            // The number, not just the colour: a projector two rows of desks
            // away loses hue before it loses a digit, and one student in the
            // room will be colour-blind.
            <span
              data-testid={`tv-player-team-${teamId}`}
              aria-label={t('education.results.teamBattle.teamName', { number: teamId + 1 })}
              className={cn(
                'shrink-0 w-6 h-6 grid place-items-center rounded-neo border-2 border-neo-black',
                'font-black text-xs text-neo-black',
                teamFillClass(teamId)
              )}
            >
              {teamId + 1}
            </span>
          )}
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
              'text-sm 2xl:text-base font-bold',
              isTopThree ? `${rankConfig?.textColor} opacity-80` : 'text-neo-cream/60'
            )}
          >
            {wordCount} {t('tvResults.words')}
          </p>
          {gameMode === 'word-hunt' && lives != null && !isEliminated && (
            <span className="flex items-center gap-0.5 text-neo-red text-sm font-bold">
              <Heart className="w-3.5 h-3.5 fill-neo-red" />
              {Math.round(lives)}
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
                ? 'bg-neo-red text-neo-cream'
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
      <div className="relative text-end flex items-center gap-2">
        <AnimatePresence>
          {scoreDelta !== null && (
            <m.div
              data-testid="score-delta"
              initial={{ y: 8, scale: 0.85, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.35 }}
              className="pointer-events-none absolute -top-3 end-full me-1 whitespace-nowrap max-md:hidden px-1.5 py-0.5 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-black text-sm 2xl:text-lg shadow-hard-sm"
            >
              +{scoreDelta}
            </m.div>
          )}
        </AnimatePresence>
        <div>
          <AnimatedCounter
            value={score}
            className={cn(
              'font-neo-display font-black text-2xl 2xl:text-4xl tabular-nums',
              isTopThree ? rankConfig?.textColor : 'text-neo-cream'
            )}
            size="xl"
            formatValue={(v) => Math.round(v).toLocaleString()}
          />
          <p
            className={cn(
              'text-xs font-bold uppercase',
              isTopThree ? `${rankConfig?.textColor} opacity-70` : 'text-neo-cream/50'
            )}
          >
            {t('tvResults.pts')}
          </p>
        </div>
      </div>

      {/* Score Bar — scaleX, not width: this re-animates on every score update for
          every player card on screen, and animating width forces a full layout pass
          per frame. origin-left keeps it growing from the left exactly as before. */}
      <m.div
        data-testid="score-bar"
        className={cn('absolute bottom-0 left-0 h-1.5 w-full origin-left rounded-b-neo', barColor)}
        animate={{ scaleX: barPercentage / 100 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      />
    </m.div>
  );
});

TvPlayerCard.displayName = 'TvPlayerCard';

export default TvPlayerCard;
