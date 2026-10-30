'use client';

import React from 'react';
import { usePolledBoard } from '@/hooks/usePolledBoard';
import { Medal } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchDailyLeaderboard, type LeaderboardRow } from '@/lib/connections/dailyClient';

/** Podium colors for the Medal icon — gold / silver / bronze (mirrors ConnectionsLeaderboard). */
const MEDAL_COLORS: Record<number, string> = {
  1: 'text-neo-yellow',
  2: 'text-neo-white/70',
  3: 'text-neo-orange',
};

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

interface ConnectionsDailyTabProps {
  /** YYYY-MM-DD (UTC day) the board is for. */
  puzzleDate: string;
}

/**
 * Connections (Word Bridge) daily board as a tab of TabbedDailyLeaderboard: its
 * own ranking (score, then time), separate from the combined points board.
 */
export default function ConnectionsDailyTab({ puzzleDate }: ConnectionsDailyTabProps) {
  const { t } = useLanguage();
  const board = usePolledBoard(
    async () => {
      // The server identifies the viewer itself (session, or the signed guest cookie).
      const res = await fetchDailyLeaderboard(puzzleDate, { limit: 100 });
      if (!res) throw new Error('Failed to fetch connections leaderboard');
      return res;
    },
    { enabled: !!puzzleDate, key: puzzleDate },
  );
  const rows: LeaderboardRow[] = board.data?.leaderboard ?? [];
  const totalPlayers = board.data?.totalPlayers ?? 0;
  const ownRank = board.data?.ownRank ?? null;
  const { loading, error } = board;

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2" data-testid="connections-daily-tab-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-neo border-2 border-neo-white/10 bg-neo-navy animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6" data-testid="connections-daily-tab-error">
        <p className="text-neo-white/80 font-bold text-sm sm:text-base">
          {t('errors.failedToLoadLeaderboard')}
        </p>
        <button
          type="button"
          onClick={board.reload}
          className="mt-3 px-4 py-2 rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black font-neo-display font-black text-sm shadow-hard-sm active:translate-x-px active:translate-y-px"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p
        className="py-6 text-center font-neo-body text-sm text-neo-white/50"
        data-testid="connections-daily-tab-empty"
      >
        {t('connections.daily.empty')}
      </p>
    );
  }

  return (
    <div data-testid="connections-daily-tab">
      <ol className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const isOwn = ownRank === r.rank_position;
          return (
            <li
              key={r.rank_position}
              data-testid={`connections-row-${r.rank_position}`}
              data-own={isOwn ? 'true' : 'false'}
              className={[
                'flex items-center gap-2 rounded-neo border-2 px-2 py-1.5',
                isOwn ? 'border-neo-cyan bg-neo-cyan/10' : 'border-neo-white/10 bg-neo-navy',
              ].join(' ')}
            >
              <span className="w-7 shrink-0 text-center font-neo-display text-sm font-black text-neo-white/70">
                {MEDAL_COLORS[r.rank_position] ? (
                  <Medal
                    className={`h-4 w-4 ${MEDAL_COLORS[r.rank_position]}`}
                    strokeWidth={2.5}
                    aria-label={`#${r.rank_position}`}
                  />
                ) : (
                  r.rank_position
                )}
              </span>
              {/* Seeded on display_name, not player_id — this endpoint deliberately
                  leaks no identifiers. */}
              <Avatar
                customAvatar={r.custom_avatar}
                userId={r.display_name}
                pixelSize={28}
                disableEffects
              />
              <span className="min-w-0 flex-1 truncate font-neo-body text-sm font-bold text-neo-white">
                {r.display_name}
              </span>
              <span className="shrink-0 font-mono text-xs text-neo-white/50">
                {fmtTime(r.time_taken_seconds)}
              </span>
              <span className="shrink-0 font-neo-display text-sm font-black tabular-nums text-neo-cyan">
                {r.score}
              </span>
            </li>
          );
        })}
      </ol>
      <footer className="mt-3 text-center font-neo-body text-xs text-neo-white/40">
        {t('connections.daily.players', { count: totalPlayers })}
        {ownRank !== null && (
          <span className="ms-2 text-neo-cyan" data-testid="connections-own-rank">
            {t('connections.daily.yourRank', { rank: ownRank })}
          </span>
        )}
      </footer>
    </div>
  );
}
