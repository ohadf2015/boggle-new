'use client';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';
import { EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import { tierColor } from '@/lib/tierColors';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface PastSeason {
  season_id: number;
  name: string;
  start_date: string;
  end_date: string;
  entry_count: number;
}

interface SeasonRow {
  player_id: string;
  username: string | null;
  display_name: string | null;
  total_score: number;
  games_played: number;
  games_won: number;
  ranked_mmr: number;
  rank_position: number;
  peak_tier: string;
  /** Live avatar, joined from `profiles` by the RPC — archived rows carry no avatar of their own. */
  avatar_config: CustomAvatarConfig | null;
}

export const PastSeasonsLeaderboard: React.FC = () => {
  const { t } = useLanguage();
  const [seasons, setSeasons] = useState<PastSeason[] | null>(null);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [rows, setRows] = useState<SeasonRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.rpc('list_past_seasons').then(({ data, error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      const list = (data ?? []) as PastSeason[];
      setSeasons(list);
      if (list.length > 0) setActiveSeason(list[0].season_id);
    });
  }, []);

  useEffect(() => {
    if (!supabase || activeSeason == null) return;
    setRows(null);
    supabase
      .rpc('get_past_season_leaderboard', { p_season_id: activeSeason, p_limit: 50 })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        setRows((data ?? []) as SeasonRow[]);
      });
  }, [activeSeason]);

  if (error) {
    return (
      <EnhancedEmptyState
        icon="sparkles"
        title={t('common.error')}
        description={error}
      />
    );
  }

  if (seasons === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="md" />
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <EnhancedEmptyState
        icon="sparkles"
        title={t('season.pastSeasons')}
        description={t('season.noPastSeasons')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {seasons.map((s) => (
          <button
            type="button"
            key={s.season_id}
            onClick={() => setActiveSeason(s.season_id)}
            className={cn(
              'px-3 py-1.5 text-xs font-neo-display rounded-neo border-neo border-black transition-all',
              activeSeason === s.season_id
                ? 'bg-neo-pink text-black shadow-hard'
                : 'bg-neo-navy-light text-neo-white hover:bg-neo-navy'
            )}
          >
            {s.name} <span className="opacity-70">· {s.entry_count}</span>
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="flex justify-center py-12"><Loader size="sm" /></div>
      ) : (
        <div className="rounded-xl overflow-hidden border-neo border-black bg-neo-navy-light divide-y divide-black/30">
          {rows.map((row) => {
            const color = tierColor(row.peak_tier);
            return (
              <div key={row.player_id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                <div className="col-span-1 text-center font-neo-display text-neo-white">
                  {row.rank_position === 1 ? '🥇' : row.rank_position === 2 ? '🥈' : row.rank_position === 3 ? '🥉' : `#${row.rank_position}`}
                </div>
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <Avatar
                    customAvatar={row.avatar_config}
                    userId={row.player_id}
                    size="sm"
                    disableEffects
                  />
                  <span className="truncate font-neo-body text-sm text-neo-white">
                    {row.display_name || row.username || '—'}
                  </span>
                </div>
                <div className="col-span-3 text-right font-neo-display text-sm text-neo-white">
                  {row.total_score.toLocaleString()}
                </div>
                <div className="col-span-3 text-right">
                  {row.peak_tier ? (
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-neo-display rounded-neo border-neo bg-neo-navy',
                      color.text, color.border
                    )}>
                      <Trophy className="inline w-3 h-3 me-1" aria-hidden="true" />
                      {row.peak_tier}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
