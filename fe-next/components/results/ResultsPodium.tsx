'use client';

import { Crown, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PlayerScore } from '@/hooks/useResultsData';

interface ResultsPodiumProps {
  /** Top 3 players sorted by rank */
  players: PlayerScore[];
  /** Current player's username (to highlight with "YOU" label) */
  currentUsername?: string;
  /** Whether this is Word Hunt mode (show words found instead of score) */
  isWordHunt?: boolean;
  /** Translation function */
  t: (key: string) => string | undefined;
}

const PODIUM_CONFIG = [
  {
    order: 1,
    place: 2,
    bgClass: 'bg-neo-cyan',
    borderClass: 'border-neo-cyan',
    textClass: 'text-neo-cyan',
    ptOffset: 'pt-8',
    avatarSize: 'w-12 h-12 sm:w-14 sm:h-14',
    badgeSize: 'w-6 h-6 text-[10px]',
    nameSize: 'text-[10px]',
    scoreSize: 'text-[9px]',
    barHeight: 'h-20',
    barText: 'text-2xl sm:text-4xl',
    shadow: 'shadow-hard-sm',
    borderWidth: 'border-2',
  },
  {
    order: 0,
    place: 1,
    bgClass: 'bg-neo-lime',
    borderClass: 'border-neo-lime',
    textClass: 'text-neo-lime',
    ptOffset: '',
    avatarSize: 'w-14 h-14 sm:w-16 sm:h-16',
    badgeSize: '',
    nameSize: 'text-[11px]',
    scoreSize: 'text-[10px]',
    barHeight: 'h-32',
    barText: 'text-3xl sm:text-5xl',
    shadow: 'shadow-hard',
    borderWidth: 'border-2',
  },
  {
    order: 2,
    place: 3,
    bgClass: 'bg-neo-orange',
    borderClass: 'border-neo-orange',
    textClass: 'text-neo-orange',
    ptOffset: 'pt-14',
    avatarSize: 'w-10 h-10 sm:w-12 sm:h-12',
    badgeSize: 'w-5 h-5 text-[9px]',
    nameSize: 'text-[10px]',
    scoreSize: 'text-[9px]',
    barHeight: 'h-12',
    barText: 'text-xl sm:text-3xl',
    shadow: 'shadow-hard-sm',
    borderWidth: 'border-2',
  },
] as const;

// Layout order: 2nd, 1st, 3rd
const LAYOUT_ORDER = [1, 0, 2] as const;

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

function formatScore(score: number): string {
  return score.toLocaleString();
}

export default function ResultsPodium({
  players,
  currentUsername,
  isWordHunt = false,
  t,
}: ResultsPodiumProps) {
  if (!players.length) return null;

  const top3 = players.slice(0, 3);

  return (
    <div className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        <Trophy className="w-3.5 h-3.5 text-white/30" />
        <span className="font-black text-[10px] text-white/30 uppercase tracking-wider">
          {t('results.matchResults') || 'Match Results'}
        </span>
      </div>

      <div className="grid grid-cols-3 items-end gap-1 px-1 max-w-xs mx-auto">
        {LAYOUT_ORDER.map((configIdx, layoutIdx) => {
          const config = PODIUM_CONFIG[configIdx];
          const player = top3[configIdx];

          if (!player) {
            // Empty slot for missing players
            return <div key={`empty-${layoutIdx}`} />;
          }

          const isCurrentUser =
            currentUsername &&
            player.username.toLowerCase() === currentUsername.toLowerCase();
          const displayName = isCurrentUser
            ? (t('results.you') || 'YOU')
            : player.username;
          const avatarEmoji = (player.avatar as any)?.emoji;
          const avatarColor = (player.avatar as any)?.color || '#334155';
          const isFirst = config.place === 1;

          const scoreDisplay = isWordHunt
            ? `${player.wordsFoundCount ?? 0} ${t('results.words') || 'Words'}`
            : formatScore(player.score);

          return (
            <motion.div
              key={player.username}
              className={cn('flex flex-col items-center', config.ptOffset)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
                delay: layoutIdx * 0.15,
              }}
            >
              {/* Avatar */}
              <div className="relative mb-3">
                {isFirst && (
                  <div className="absolute inset-0 rounded-full bg-neo-lime/20 blur-md" />
                )}
                <div
                  className={cn(
                    'relative rounded-full flex items-center justify-center bg-neo-navy',
                    config.avatarSize,
                    isFirst ? 'border-3 border-neo-lime' : cn(config.borderWidth, config.borderClass)
                  )}
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarEmoji ? (
                    <span className={cn(isFirst ? 'text-2xl' : 'text-xl')}>
                      {avatarEmoji}
                    </span>
                  ) : (
                    <span className="font-black text-white text-sm">
                      {getInitials(player.username)}
                    </span>
                  )}
                </div>

                {/* Crown for 1st, badge for 2nd/3rd */}
                {isFirst ? (
                  <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-neo-lime drop-shadow-md"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.6, stiffness: 300, damping: 12 }}
                  >
                    <Crown className="w-5 h-5 fill-neo-lime" />
                  </motion.div>
                ) : (
                  <div
                    className={cn(
                      'absolute -top-1.5 -right-1.5 text-black rounded-full flex items-center justify-center border-2 border-black shadow-sm font-black',
                      config.badgeSize,
                      config.bgClass
                    )}
                  >
                    {config.place}
                  </div>
                )}
              </div>

              {/* Name & Score */}
              <div className="text-center mb-3 min-w-0 px-1">
                <p
                  className={cn(
                    'font-black text-white uppercase truncate',
                    config.nameSize
                  )}
                >
                  {displayName}
                </p>
                <p
                  className={cn(
                    'font-black mt-0.5',
                    config.scoreSize,
                    config.textClass
                  )}
                >
                  {scoreDisplay}
                </p>
              </div>

              {/* Podium bar */}
              <motion.div
                className={cn(
                  'w-full flex items-center justify-center font-neo-display font-black text-black',
                  config.barHeight,
                  config.barText,
                  config.borderWidth,
                  config.shadow,
                  'border-black rounded-t-neo',
                  config.bgClass
                )}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  delay: layoutIdx * 0.15 + 0.2,
                  duration: 0.35,
                  ease: 'easeOut',
                }}
                style={{ transformOrigin: 'bottom' }}
              >
                {config.place}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
