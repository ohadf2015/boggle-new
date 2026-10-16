'use client';

import { memo, useEffect, useState } from 'react';
import { m, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { Crown, Medal, Award } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { fireRankConfetti } from '../../../utils/confettiUtils';
import { useTallScreen } from './useTallScreen';
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

// The name plate is always black so the name reads on any fill.
const PODIUM_CONFIG = {
  1: {
    icon: Crown,
    fill: 'bg-neo-yellow',
    nameColor: 'text-neo-yellow',
    width: 'w-[clamp(15rem,36%,27rem)]',
    nameSize: 'text-[clamp(1.2rem,3vh,2.6rem)]',
    scoreSize: 'text-[clamp(2.2rem,5.6vh,4.25rem)]',
    plinth: 'clamp(2rem, calc(14vh - 4rem), 6rem)',
    order: 2,
  },
  2: {
    icon: Medal,
    fill: 'bg-neo-cyan',
    nameColor: 'text-neo-cyan',
    width: 'w-[clamp(12rem,30%,21rem)]',
    nameSize: 'text-[clamp(1rem,2.4vh,1.9rem)]',
    scoreSize: 'text-[clamp(1.8rem,4.2vh,3.1rem)]',
    plinth: 'clamp(1.5rem, calc(9vh - 2.5rem), 4rem)',
    order: 1,
  },
  3: {
    icon: Award,
    fill: 'bg-neo-orange',
    nameColor: 'text-neo-orange',
    width: 'w-[clamp(12rem,29%,21rem)]',
    nameSize: 'text-[clamp(1rem,2.4vh,1.9rem)]',
    scoreSize: 'text-[clamp(1.6rem,3.8vh,2.8rem)]',
    plinth: 'clamp(1.5rem, calc(5vh - 1rem), 2.5rem)',
    order: 3,
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
  const reducedMotion = useReducedMotion();
  const tall = useTallScreen();

  useEffect(() => {
    if (showConfetti && players.length > 0 && !reducedMotion) {
      fireRankConfetti(1);
    }
  }, [showConfetti, players.length, reducedMotion]);

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

  return (
    <div data-testid="tv-results-podium" className="flex h-full items-end justify-center gap-[clamp(0.75rem,1.5vw,2.25rem)] pt-7">
      <AnimatePresence>
        {sortedPlayers.filter(p => p.visible).map(({ rank, player }) => (
          <PodiumCard key={rank} rank={rank} player={player} t={t} isWinner={rank === 1} tall={tall} />
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
  tall: boolean;
}

// Rank-specific spring configs: escalating energy builds tension
const RANK_SPRINGS = {
  3: { stiffness: 200, damping: 22 },   // Gentle entrance
  2: { stiffness: 280, damping: 18 },   // More energy
  1: { stiffness: 400, damping: 12 },   // Bouncy winner reveal
};

// Rank-specific entrance delays (3rd → 2nd → 1st builds suspense)
const RANK_DELAYS = { 3: 0, 2: 0.15, 1: 0.35 };

/** Animated score that counts up from 0 */
const PodiumScoreCounter: React.FC<{ target: number; delay: number; className?: string }> = ({ target, delay, className }) => {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Handles are hoisted so the effect's own cleanup can release them. A
    // cleanup returned from the setTimeout callback would be discarded, leaving
    // the animation and subscription live after unmount.
    let controls: { stop: () => void } | null = null;
    let unsub: (() => void) | null = null;
    const timeout = setTimeout(() => {
      controls = animate(motionVal, target, {
        duration: 1.4,
        ease: [0.16, 1, 0.3, 1],
      });
      unsub = rounded.on('change', (v) => setDisplay(v));
    }, delay * 1000);
    return () => {
      clearTimeout(timeout);
      controls?.stop();
      unsub?.();
    };
  }, [target, delay, motionVal, rounded]);

  return <span className={className}>{display}</span>;
};

const PodiumCard = memo<PodiumCardProps>(({ rank, player, t, isWinner, tall }) => {
  const config = PODIUM_CONFIG[rank as keyof typeof PODIUM_CONFIG];
  const Icon = config.icon;
  const labelKey = RANK_LABELS[rank as keyof typeof RANK_LABELS];
  const spring = RANK_SPRINGS[rank as keyof typeof RANK_SPRINGS] || RANK_SPRINGS[3];
  const baseDelay = RANK_DELAYS[rank as keyof typeof RANK_DELAYS] || 0;
  const avatarSize = isWinner ? (tall ? '2xl' : 'lg') : (tall ? 'xl' : 'lg');

  return (
    <m.div
      data-testid={`podium-card-${rank}`}
      initial={{ y: 60 }}
      animate={{ y: 0 }}
      exit={{ y: 60 }}
      transition={{ type: 'spring', ...spring, delay: baseDelay }}
      className={cn('relative flex flex-col', config.width, isWinner && 'z-10')}
    >
      <div
        className={cn(
          'relative flex flex-col items-center gap-2 rounded-neo border-4 border-neo-black px-3 pb-3 pt-8',
          isWinner ? 'shadow-hard-xl' : 'shadow-hard-lg',
          config.fill
        )}
      >
        <m.div
          initial={{ scale: 0, rotate: -360 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: baseDelay + 0.3, type: 'spring', stiffness: isWinner ? 500 : 400, damping: isWinner ? 10 : 15 }}
          className="absolute -top-7 left-1/2 -ml-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-neo-black bg-neo-cream shadow-hard"
        >
          <Icon className="h-7 w-7 text-neo-black" />
        </m.div>

        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: isWinner ? 500 : 400, damping: isWinner ? 8 : 18, delay: baseDelay + 0.35 }}
        >
          <Avatar
            avatarImage={player.avatar?.avatarImage}
            customAvatar={player.avatar?.customAvatar}
            size={avatarSize}
            className="border-4 border-neo-black shadow-hard"
          />
        </m.div>

        <m.p
          data-testid={`podium-name-${rank}`}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', ...spring, delay: baseDelay + 0.45 }}
          className={cn(
            'w-full rounded-neo border-3 border-neo-black bg-neo-black px-2 py-1.5 text-center',
            'font-neo-display font-black uppercase leading-[1.05] text-balance [overflow-wrap:anywhere]',
            config.nameColor,
            config.nameSize
          )}
        >
          {player.username}
        </m.p>

        <m.div
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: isWinner ? 10 : 20, delay: baseDelay + 0.55 }}
          className="flex flex-wrap items-baseline justify-center gap-x-2 text-neo-black"
        >
          <span className={cn('font-neo-display font-black leading-none', config.scoreSize)}>
            <PodiumScoreCounter target={player.score} delay={baseDelay + 0.6} />
          </span>
          <span className="text-base font-black uppercase text-neo-black/70">{t('tvResults.pts')}</span>
          {player.wordCount !== undefined && (
            <span className="text-base font-bold text-neo-black/70">
              · {player.wordCount} {t('tvResults.words')}
            </span>
          )}
        </m.div>
      </div>

      <div
        className={cn(
          'mx-3 flex shrink-0 items-center justify-center border-4 border-t-0 border-neo-black bg-neo-navy-elevated',
        )}
        style={{ height: config.plinth }}
      >
        <span className="font-neo-display text-[clamp(0.85rem,1.8vh,1.25rem)] font-black uppercase tracking-wide text-neo-cream">
          {t(`tvResults.${labelKey}`)}
        </span>
      </div>
    </m.div>
  );
});

PodiumCard.displayName = 'PodiumCard';

export default TvResultsWinnersPodium;
