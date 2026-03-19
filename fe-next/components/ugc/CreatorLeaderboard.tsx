'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ugc/boards/creators/top');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        if (!cancelled) setCreators(json.creators ?? []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { creators, loading, error };
}

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function RankBadge({ rank }: { rank: number }) {
  const medal = RANK_MEDALS[rank];
  return (
    <span className="flex flex-col items-center gap-0">
      {medal && <span className="text-lg leading-none" aria-hidden>{medal}</span>}
      <span className="font-bold text-neo-white/60 text-xs">#{rank}</span>
    </span>
  );
}

function RatingStars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neo-white/40 text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5 text-sm font-semibold text-neo-yellow">
      <Star className="w-3 h-3 fill-neo-yellow" aria-hidden />
      {value}
    </span>
  );
}

function CreatorSpotlight({ creator }: { creator: CreatorRow }) {
  const { t } = useLanguage();
  return (
    <div
      data-testid="creator-spotlight"
      className={cn(
        'border-neo border-neo-yellow bg-neo-navy rounded-neo p-4 mb-4',
        'shadow-hard flex items-center gap-4'
      )}
    >
      <Crown className="w-8 h-8 text-neo-yellow flex-shrink-0" aria-hidden />
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar
          customAvatar={creator.avatar_config}

          size="lg"
        />
        <div className="min-w-0">
          <p className="text-neo-yellow font-bold text-xs uppercase tracking-wider mb-0.5">
            {t('ugc.creator.leaderboard.spotlight')}
          </p>
          <p className="font-neo-display text-neo-white font-bold text-lg truncate">
            {creator.display_name}
          </p>
          <p className="text-neo-white/60 text-xs">
            {creator.boards_created} {t('ugc.creator.leaderboard.boards')}
            {' · '}
            {creator.total_plays.toLocaleString()} {t('ugc.creator.leaderboard.plays')}
          </p>
        </div>
      </div>
      <RatingStars value={creator.avg_rating} />
    </div>
  );
}

function CreatorTableRow({ creator, rank }: { creator: CreatorRow; rank: number }) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/community?creator=${creator.creator_id}`}
      className={cn(
        'grid grid-cols-12 gap-2 px-3 py-2 items-center transition-colors',
        'hover:bg-neo-white/5 border-b border-neo-white/10 last:border-b-0',
        rank % 2 === 0 ? 'bg-neo-navy/80' : 'bg-neo-navy'
      )}
      aria-label={`${creator.display_name} — ${t('ugc.creator.leaderboard.rank')} ${rank}`}
    >
      <div className="col-span-1 text-center">
        <RankBadge rank={rank} />
      </div>
      <div className="col-span-5 flex items-center gap-2 min-w-0">
        <Avatar
          customAvatar={creator.avatar_config}

          size="sm"
        />
        <span className="font-medium text-neo-white text-sm truncate">
          {creator.display_name}
        </span>
      </div>
      <div className="col-span-2 text-right text-neo-white/70 text-sm">
        {creator.boards_created}
      </div>
      <div className="col-span-2 text-right text-neo-white/70 text-sm">
        {creator.total_plays.toLocaleString()}
      </div>
      <div className="col-span-2 text-right">
        <RatingStars value={creator.avg_rating} />
      </div>
    </Link>
  );
}

export default function CreatorLeaderboard() {
  const { t } = useLanguage();
  const { creators, loading } = useTopCreators();

  return (
    <div className="space-y-4">
      <h2 className="font-neo-display text-neo-white font-bold text-2xl">
        {t('ugc.creator.leaderboard.title')}
      </h2>

      {loading && (
        <p className="text-neo-white/60 text-center py-8">{t('common.loading')}</p>
      )}

      {!loading && creators.length === 0 && (
        <p className="text-neo-white/60 text-center py-8">
          {t('ugc.creator.leaderboard.empty')}
        </p>
      )}

      {!loading && creators.length > 0 && (
        <>
          <CreatorSpotlight creator={creators[0]} />

          {/* Table */}
          <div className={cn('border-neo border-neo-white/20 rounded-neo overflow-hidden')}>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-neo-white/5 text-neo-white/50 text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-1 text-center">{t('ugc.creator.leaderboard.rank')}</div>
              <div className="col-span-5">{t('ugc.creator.leaderboard.creator')}</div>
              <div className="col-span-2 text-right">{t('ugc.creator.leaderboard.boards')}</div>
              <div className="col-span-2 text-right">{t('ugc.creator.leaderboard.plays')}</div>
              <div className="col-span-2 text-right">{t('ugc.creator.leaderboard.rating')}</div>
            </div>
            {creators.map((creator, i) => (
              <CreatorTableRow key={creator.creator_id} creator={creator} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
