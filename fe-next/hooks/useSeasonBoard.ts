'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePolledBoard } from '@/hooks/usePolledBoard';
import { getCurrentSeasonDynamic } from '@/lib/seasons';
import { mergeSeasonRows } from '@/components/daily/leaderboardRows';
import type { DailySeasonSummary, LeaderboardScope, SeasonParticipant } from '@/components/daily/leaderboardTypes';

/** Client-side fallback when /seasons is unreachable: the season the calendar says we are in. */
function fallbackSeasons(): { seasons: DailySeasonSummary[]; currentSeasonId: number } {
  const s = getCurrentSeasonDynamic();
  return {
    currentSeasonId: s.id,
    seasons: [{
      id: s.id,
      name: s.name,
      theme: s.theme,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      status: 'active',
      isCurrent: true,
    }],
  };
}

/** Season list + the selected season's board; nothing loads until the tab opens. */
export function useSeasonBoard(opts: { active: boolean; fetchLanguage: string; scope: LeaderboardScope }) {
  const { active, fetchLanguage, scope } = opts;
  const [seasons, setSeasons] = useState<DailySeasonSummary[] | null>(null);
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  useEffect(() => {
    if (!active || seasons !== null) return;
    let cancelled = false;
    const apply = (list: DailySeasonSummary[], current: number) => {
      if (cancelled) return;
      setSeasons(list);
      setCurrentSeasonId(current);
      setSelectedSeasonId((prev) => prev ?? current);
    };
    fetch('/api/daily-challenge/seasons')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch seasons');
        const json = await res.json() as { seasons?: DailySeasonSummary[]; currentSeasonId?: number };
        const list = Array.isArray(json.seasons) && json.seasons.length > 0 ? json.seasons : fallbackSeasons().seasons;
        apply(list, typeof json.currentSeasonId === 'number' ? json.currentSeasonId : (list.find(s => s.isCurrent)?.id ?? list[0].id));
      })
      .catch(() => {
        const fb = fallbackSeasons();
        apply(fb.seasons, fb.currentSeasonId);
      });
    return () => { cancelled = true; };
  }, [active, seasons]);

  const board = usePolledBoard<SeasonParticipant[]>(
    async (signal) => {
      const qs = `?season=${selectedSeasonId}&limit=100`;
      const get = (mode: string) =>
        fetch(`/api/daily-challenge/${mode}/season-leaderboard/${fetchLanguage}${qs}`, { cache: 'no-store', signal })
          .then(async (r) => (r.ok ? ((await r.json()) as { data?: SeasonParticipant[] }).data ?? [] : null));
      const [hunt, wheel] = await Promise.all([
        scope !== 'word-wheel' ? get('word-hunt') : [],
        scope !== 'word-hunt' ? get('word-wheel') : [],
      ]);
      if (hunt === null && wheel === null) throw new Error('Failed to fetch season leaderboard');
      return mergeSeasonRows(hunt ?? [], wheel ?? []);
    },
    { enabled: active && selectedSeasonId !== null, key: `${selectedSeasonId}|${fetchLanguage}|${scope}`, intervalMs: 5 * 60_000 },
  );

  const rows = useMemo(() => board.data ?? [], [board.data]);

  return {
    seasons,
    currentSeasonId,
    selectedSeasonId,
    setSelectedSeasonId,
    rows,
    // The list itself is still on its way when the tab first opens.
    loading: active && (seasons === null || board.loading),
    error: board.error,
    reload: board.reload,
  };
}
