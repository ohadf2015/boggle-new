'use client';

import React, { memo, useMemo } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Crown } from 'lucide-react';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface PodiumEntry {
  player_id: string;
  display_name?: string;
  username?: string;
  avatar_image?: string;
  avatar_config?: CustomAvatarConfig | null;
  total_score?: number;
}

interface LeaderboardPodiumProps {
  /** Ranked entries, index 0 = 1st place. Only the first three are used. */
  entries: PodiumEntry[];
  language: string;
  currentUserId?: string;
  className?: string;
}

/** Per-rank visual identity. BLACK ink on every fill — accent colours are
 *  invisible under white text (neo contrast rule). */
const RANK_STYLE: Record<1 | 2 | 3, { pedestal: string; medal: string; ring: string; pedH: string; score: string }> = {
  1: { pedestal: 'bg-neo-yellow', medal: 'bg-neo-yellow', ring: 'ring-neo-yellow', pedH: 'h-20 sm:h-24', score: 'text-neo-yellow' },
  2: { pedestal: 'bg-slate-300', medal: 'bg-slate-300', ring: 'ring-slate-300', pedH: 'h-14 sm:h-16', score: 'text-neo-cream' },
  3: { pedestal: 'bg-neo-orange', medal: 'bg-neo-orange', ring: 'ring-neo-orange', pedH: 'h-10 sm:h-12', score: 'text-neo-orange' },
};

/**
 * LeaderboardPodium — celebratory top-three treatment for the global leaderboard.
 * Champion centered and raised (2nd · 1st · 3rd), gold/silver/bronze pedestals in
 * neo-brutalist hard-shadow blocks. Competitive clarity: rank carries icon + label
 * + height, never colour alone. The current user's step gets a cyan ring + "YOU".
 */
const LeaderboardPodium = memo<LeaderboardPodiumProps>(({ entries, language, currentUserId, className }) => {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const visual = useMemo(() => {
    const ranked = entries
      .slice(0, 3)
      .map((entry, i) => ({ entry, rank: (i + 1) as 1 | 2 | 3 }));
    // Visual order: silver · gold · bronze (champion centered).
    return [1, 0, 2].map((i) => ranked[i]).filter(Boolean) as { entry: PodiumEntry; rank: 1 | 2 | 3 }[];
  }, [entries]);

  if (visual.length === 0) return null;

  return (
    <div
      className={cn('flex items-end justify-center gap-2 sm:gap-3', className)}
      aria-label={t('leaderboard.topThree')}
    >
      {visual.map(({ entry, rank }, idx) => {
        const style = RANK_STYLE[rank];
        const isYou = !!currentUserId && entry.player_id === currentUserId;
        const name = entry.display_name || entry.username || '—';
        const isChampion = rank === 1;

        return (
          <m.div
            key={entry.player_id}
            data-testid="podium-step"
            data-rank={rank}
            data-you={isYou ? 'true' : 'false'}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { delay: idx * 0.08, ease: [0.22, 1, 0.36, 1], duration: 0.45 }}
            className={cn(
              'flex flex-col items-center w-[28%] max-w-[120px] min-w-0',
              isChampion && '-mt-2',
            )}
          >
            {/* Crown for the champion */}
            <Crown
              className={cn('w-5 h-5 mb-0.5 text-neo-yellow', !isChampion && 'invisible')}
              fill="currentColor"
              aria-hidden={!isChampion}
            />

            <Link
              href={`/${language}/player/${encodeURIComponent(entry.player_id)}`}
              aria-label={name}
              className="flex flex-col items-center w-full min-w-0 rounded-neo transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
            >
              {/* Avatar with rank-coloured ring; cyan ring + YOU chip for current user.
                  `isolate` bounds the champion glow to this box so it never escapes
                  to cover the page and swallow clicks. */}
              <div className="relative isolate">
                {/* Static golden glow behind champion avatar — bounded & non-interactive */}
                {isChampion && (
                  <div
                    data-testid="podium-champion-glow"
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-neo-yellow/25 blur-xl"
                  />
                )}
                <div
                  className={cn(
                    'rounded-full ring-3 ring-offset-2 ring-offset-neo-navy',
                    isYou ? 'ring-neo-cyan' : style.ring,
                  )}
                >
                  <Avatar
                    customAvatar={entry.avatar_config ?? undefined}
                    avatarImage={entry.avatar_image ?? undefined}
                    userId={entry.player_id}
                    size={isChampion ? 'lg' : 'md'}
                    tierMarker
                    disableEffects
                  />
                </div>
                {isYou && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-md bg-neo-cyan text-neo-navy text-[9px] font-bold uppercase tracking-wide shadow-hard-sm">
                    {t('mp.rivals.you')}
                  </span>
                )}
              </div>

              {/* Name */}
              <span className={cn('mt-2 w-full truncate text-center font-bold text-xs sm:text-sm', isYou ? 'text-neo-cyan' : 'text-white')}>
                {name}
              </span>

              {/* Score */}
              <span className={cn('font-mono tabular-nums font-black text-sm sm:text-base leading-none', style.score)}>
                {safeToLocaleString(entry.total_score ?? 0, language)}
              </span>
            </Link>

            {/* Pedestal block — rank number in BLACK ink on the medal fill */}
            <div
              className={cn(
                'mt-2 w-full rounded-t-neo border-3 border-neo-black shadow-hard',
                'flex items-start justify-center pt-1.5',
                style.pedestal,
                style.pedH,
              )}
            >
              <span className="font-neo-display font-black text-2xl sm:text-3xl text-neo-black leading-none">
                {rank}
              </span>
            </div>
          </m.div>
        );
      })}
    </div>
  );
});

LeaderboardPodium.displayName = 'LeaderboardPodium';

export default LeaderboardPodium;