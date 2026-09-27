'use client';

import { memo, useEffect, useState } from 'react';
import { m, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
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
    nameSize: 'text-2xl',
    height: 'min-h-[320px]',
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
    nameSize: 'text-xl',
    height: 'min-h-[270px]',
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
    nameSize: 'text-lg',
    height: 'min-h-[230px]',
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

const PodiumCard = memo<PodiumCardProps>(({ rank, player, t, isWinner }) => {
  const config = PODIUM_CONFIG[rank as keyof typeof PODIUM_CONFIG];
  const Icon = config.icon;
  const labelKey = RANK_LABELS[rank as keyof typeof RANK_LABELS];
  const spring = RANK_SPRINGS[rank as keyof typeof RANK_SPRINGS] || RANK_SPRINGS[3];
  const baseDelay = RANK_DELAYS[rank as keyof typeof RANK_DELAYS] || 0;

  return (
    <m.div
      className={cn(
        'relative flex flex-col items-center',
        isWinner ? 'w-56 z-10' : 'w-48'
      )}
    >
      {/* Podium base rises up first */}
      <m.div
        initial={{ clipPath: 'inset(100% 0 0 0)' }}
        animate={{ clipPath: 'inset(0% 0 0 0)' }}
        transition={{ duration: 0.6, delay: baseDelay, ease: [0.33, 1, 0.68, 1] }}
        className={cn(
          'w-full rounded-neo border-4 border-neo-black',
          `bg-linear-to-b ${config.bgGradient}`,
          config.shadowColor,
          config.height,
        )}
      >
        {/* Player card content appears after podium rise */}
        <m.div
          initial={{ y: 40, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{
            type: 'spring',
            ...spring,
            delay: baseDelay + 0.4,
          }}
          className="flex flex-col items-center justify-end pt-8 pb-4 px-4 h-full"
        >
          {/* Rank Badge — spins in with escalating bounce */}
          <m.div
            initial={{ scale: 0, rotate: -360 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: baseDelay + 0.6,
              type: 'spring',
              stiffness: isWinner ? 500 : 400,
              damping: isWinner ? 10 : 15,
            }}
            className={cn(
              'absolute -top-5 left-1/2 -translate-x-1/2',
              'w-14 h-14 rounded-full border-4 border-neo-black',
              'bg-neo-cream flex items-center justify-center',
              'shadow-hard'
            )}
          >
            <Icon className={cn('w-7 h-7', config.textColor)} />
          </m.div>

          {/* Rank Label */}
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, delay: baseDelay + 0.7 }}
            className={cn(
              'font-black uppercase tracking-wide mb-2',
              config.textColor,
              isWinner ? 'text-lg' : 'text-sm'
            )}
          >
            {t(`tvResults.${labelKey}`)}
          </m.div>

          {/* Avatar — bouncy pop */}
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: isWinner ? 500 : 400,
              damping: isWinner ? 8 : 18,
              delay: baseDelay + 0.55,
            }}
            className="relative mb-2"
          >
            <Avatar

              avatarImage={player.avatar?.avatarImage}
              customAvatar={player.avatar?.customAvatar}
              size={isWinner ? 'xl' : 'lg'}
              className="border-4 border-neo-black shadow-hard"
            />
          </m.div>

          {/* Username */}
          <m.p
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: baseDelay + 0.75 }}
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
          </m.p>

          {/* Score — counts up from 0 with elastic overshoot */}
          <m.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: isWinner ? 10 : 20,
              delay: baseDelay + 0.85,
            }}
            className={cn(
              'font-black',
              config.textColor,
              config.scoreSize
            )}
          >
            <PodiumScoreCounter target={player.score} delay={baseDelay + 0.9} />
            <span className="text-sm font-bold ms-1 opacity-70">{t('tvResults.pts')}</span>
          </m.div>

          {/* Word Count */}
          {player.wordCount !== undefined && (
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: baseDelay + 1.1 }}
              className={cn('text-sm font-bold opacity-70', config.textColor)}
            >
              {player.wordCount} {t('tvResults.words')}
            </m.p>
          )}
        </m.div>
      </m.div>

      {/* Winner glow pulse ring */}
      {isWinner && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 1.2 }}
          className="absolute inset-0 -m-2 rounded-neo pointer-events-none"
          style={{
            animation: 'winner-glow-pulse 2s ease-in-out infinite',
            boxShadow: '0 0 40px rgba(255,225,53,0.4)',
          }}
        />
      )}
      <style>{`
        @keyframes winner-glow-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(255,225,53,0.3); }
          50% { box-shadow: 0 0 60px rgba(255,225,53,0.6), 0 0 100px rgba(255,107,53,0.2); }
        }
      `}</style>
    </m.div>
  );
});

PodiumCard.displayName = 'PodiumCard';

export default TvResultsWinnersPodium;
