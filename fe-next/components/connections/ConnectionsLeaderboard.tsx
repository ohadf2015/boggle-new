'use client';

import { Flame, Trophy, Medal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';

interface ConnectionsLeaderboardProps {
  rows: LeaderboardRow[];
  /** The caller's 1-based rank, or null if they haven't played. */
  ownRank: number | null;
  totalPlayers: number;
  /** The caller's current daily streak (for the header badge). */
  streak: number;
  loading: boolean;
}

/** Podium colors for the Medal icon — gold / silver / bronze. */
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

/** Daily leaderboard panel — top-N rows, own-row highlight, streak badge. */
export default function ConnectionsLeaderboard({
  rows,
  ownRank,
  totalPlayers,
  streak,
  loading,
}: ConnectionsLeaderboardProps) {
  const { t } = useLanguage();

  return (
    <section className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-4 shadow-hard">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-neo-display text-lg font-black text-neo-white">
          <Trophy className="h-5 w-5 text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />
          {t('connections.daily.leaderboard')}
        </h2>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-neo border-neo border-neo-orange/60 bg-neo-orange/10 px-2 py-0.5 text-sm font-bold text-neo-orange">
            <Flame className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {streak}
          </span>
        )}
      </header>

      {loading ? (
        <p className="py-6 text-center font-neo-body text-sm text-neo-white/50">{t('connections.daily.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center font-neo-body text-sm text-neo-white/50">{t('connections.daily.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const isOwn = ownRank === r.rank_position;
            return (
              <li
                key={r.rank_position}
                data-testid={`leaderboard-row-${r.rank_position}`}
                data-own={isOwn ? 'true' : 'false'}
                className={[
                  'flex items-center gap-2 rounded-neo border-2 px-2 py-1.5',
                  isOwn ? 'border-neo-cyan bg-neo-cyan/10' : 'border-neo-white/10 bg-neo-navy',
                ].join(' ')}
              >
                <span className="w-7 shrink-0 text-center font-neo-display text-sm font-black text-neo-white/70">
                  {MEDAL_COLORS[r.rank_position] ? (
                    <Medal className={`h-4 w-4 ${MEDAL_COLORS[r.rank_position]}`} strokeWidth={2.5} aria-label={`#${r.rank_position}`} />
                  ) : (
                    r.rank_position
                  )}
                </span>
                {/* Seeded on display_name, not player_id — this endpoint deliberately leaks no identifiers. */}
                <Avatar
                  customAvatar={r.custom_avatar}
                  userId={r.display_name}
                  pixelSize={28}
                  disableEffects
                />
                <span className="min-w-0 flex-1 truncate font-neo-body text-sm font-bold text-neo-white">
                  {r.display_name}
                </span>
                <span className="shrink-0 font-mono text-xs text-neo-white/50">{fmtTime(r.time_taken_seconds)}</span>
                <span className="shrink-0 font-neo-display text-sm font-black tabular-nums text-neo-cyan">{r.score}</span>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="mt-3 text-center font-neo-body text-xs text-neo-white/40">
        {t('connections.daily.players', { count: totalPlayers })}
        {ownRank != null && ` · ${t('connections.daily.yourRank', { rank: ownRank })}`}
      </footer>
    </section>
  );
}
