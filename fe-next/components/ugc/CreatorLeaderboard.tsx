'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Star, Crown, Trophy, TrendingUp, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface CreatorRow {
  creator_id: string;
  display_name: string;
  avatar_config: CustomAvatarConfig | null;
  boards_created: number;
  total_plays: number;
  avg_rating: number | null;
}

function useTopCreators() {
  const { data: creators = [], isLoading: loading, error } = useQuery<CreatorRow[], Error>({
    queryKey: ['ugc', 'top-creators'],
    queryFn: async () => {
      const res = await fetch('/api/ugc/boards/creators/top');
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      return json.creators ?? [];
    },
    staleTime: 5 * 60_000,
  });

  return { creators, loading, error: error?.message ?? null };
}

const RANK_STYLES: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: 'bg-neo-yellow/15 border-neo-yellow/40', text: 'text-neo-yellow', icon: '👑' },
  2: { bg: 'bg-gray-300/10 border-gray-400/30', text: 'text-gray-300', icon: '🥈' },
  3: { bg: 'bg-amber-700/15 border-amber-600/30', text: 'text-amber-500', icon: '🥉' },
};

function RatingStars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neo-white text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5 text-sm font-bold text-neo-yellow">
      <Star className="w-3.5 h-3.5 fill-neo-yellow" aria-hidden />
      {value}
    </span>
  );
}

/* ── Champion spotlight — dramatic #1 showcase ── */
function ChampionSpotlight({ creator }: { creator: CreatorRow }) {
  const { t } = useLanguage();
  return (
    <AdaptiveMotion.div
      data-testid="creator-spotlight"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-neo p-5 mb-6',
        'border-3 border-neo-yellow/40 shadow-hard',
        'bg-linear-to-br from-neo-yellow/8 via-neo-navy to-neo-pink/5'
      )}
    >
      {/* Decorative corner glow */}
      <div className="absolute -top-8 -inset-e-8 w-24 h-24 bg-neo-yellow/10 blur-2xl rounded-full pointer-events-none" />

      <div className="flex items-center gap-4 relative">
        {/* Crown + Avatar */}
        <div className="relative shrink-0">
          <Avatar
            customAvatar={creator.avatar_config}
            size="lg"
          />
          <span className="absolute -top-2 -inset-e-2 text-xl" aria-hidden>👑</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-neo-yellow font-bold text-[10px] uppercase tracking-[0.15em] mb-0.5">
            {t('ugc.creator.leaderboard.spotlight')}
          </p>
          <p className="font-neo-display text-neo-white font-bold text-xl truncate">
            {creator.display_name}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-neo-white font-neo-body">
            <span className="flex items-center gap-1">
              <LayoutGrid className="w-3 h-3" />
              {creator.boards_created} {t('ugc.creator.leaderboard.boards')}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {creator.total_plays.toLocaleString()} {t('ugc.creator.leaderboard.plays')}
            </span>
          </div>
        </div>

        {/* Rating badge */}
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <RatingStars value={creator.avg_rating} />
          <span className="text-[9px] text-neo-white uppercase font-bold">
            {t('ugc.creator.leaderboard.rating')}
          </span>
        </div>
      </div>
    </AdaptiveMotion.div>
  );
}

/* ── Creator row — clean card-style row ── */
function CreatorRow_({ creator, rank }: { creator: CreatorRow; rank: number }) {
  const { t } = useLanguage();
  const style = RANK_STYLES[rank];
  const isTopThree = rank <= 3;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * rank, type: 'spring', stiffness: 350, damping: 24 }}
    >
      <Link
        href={`/community?creator=${creator.creator_id}`}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 transition-all duration-100',
          'hover:bg-neo-white/5 rounded-neo group',
          isTopThree && style
            ? cn('border', style.bg)
            : 'border border-transparent'
        )}
        aria-label={`${creator.display_name} — ${t('ugc.creator.leaderboard.rank')} ${rank}`}
      >
        {/* Rank */}
        <div className="w-8 flex flex-col items-center shrink-0">
          {isTopThree ? (
            <span className="text-lg leading-none" aria-hidden>{RANK_STYLES[rank]?.icon}</span>
          ) : (
            <span className="font-bold text-neo-white text-sm">#{rank}</span>
          )}
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Avatar
            customAvatar={creator.avatar_config}
            size="sm"
          />
          <span className={cn(
            'font-neo-body font-bold text-sm truncate',
            isTopThree ? 'text-neo-white' : 'text-neo-white'
          )}>
            {creator.display_name}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 shrink-0 text-xs text-neo-white">
          <span className="hidden sm:flex items-center gap-1 min-w-12 justify-end">
            <LayoutGrid className="w-3 h-3" />
            {creator.boards_created}
          </span>
          <span className="flex items-center gap-1 min-w-14 justify-end">
            <TrendingUp className="w-3 h-3" />
            {creator.total_plays.toLocaleString()}
          </span>
          <span className="min-w-12 flex justify-end">
            <RatingStars value={creator.avg_rating} />
          </span>
        </div>
      </Link>
    </AdaptiveMotion.div>
  );
}

export default function CreatorLeaderboard() {
  const { t } = useLanguage();
  const { creators, loading } = useTopCreators();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-5 h-5 text-neo-yellow" />
        <h2 className="font-neo-display text-neo-white font-bold text-xl">
          {t('ugc.creator.leaderboard.title')}
        </h2>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-14 rounded-neo bg-neo-white/3 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && creators.length === 0 && (
        <div className="text-center py-16">
          <Crown className="w-12 h-12 text-neo-white mx-auto mb-3" />
          <p className="text-neo-white font-neo-body text-sm">
            {t('ugc.creator.leaderboard.empty')}
          </p>
        </div>
      )}

      {/* Content */}
      {!loading && creators.length > 0 && (
        <>
          {/* #1 gets the spotlight */}
          <ChampionSpotlight creator={creators[0]} />

          {/* Table header */}
          <div className="flex items-center gap-3 px-3 py-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-neo-white">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">{t('ugc.creator.leaderboard.creator')}</div>
            <div className="hidden sm:block min-w-12 text-end">{t('ugc.creator.leaderboard.boards')}</div>
            <div className="min-w-14 text-end">{t('ugc.creator.leaderboard.plays')}</div>
            <div className="min-w-12 text-end">{t('ugc.creator.leaderboard.rating')}</div>
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {creators.map((creator, i) => (
              <CreatorRow_ key={creator.creator_id} creator={creator} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
