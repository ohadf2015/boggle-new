'use client';

import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import type { Language } from '@/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  huntScore: number;
  wheelScore: number;
  playerId: string | null;
  customAvatar: CustomAvatarConfig | null;
  seed: string;
}

interface LeaderboardTeaserProps {
  currentLanguage: Language;
  onViewFull?: () => void;
}

interface RawLeaderboardRow {
  player_id?: string | null;
  guest_fingerprint?: string | null;
  display_name?: string;
  score?: number;
  efficiency_score?: number;
  custom_avatar?: CustomAvatarConfig | null;
}

const RANK_STYLES = [
  { text: 'text-neo-lime', bg: 'bg-neo-lime/20', border: 'border-neo-lime/40', medal: '🥇' },
  { text: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10', medal: '🥈' },
  { text: 'text-neo-pink', bg: 'bg-neo-pink/10', border: 'border-neo-pink/30', medal: '🥉' },
];

type Kind = 'hunt' | 'wheel';

/**
 * Merge word-hunt + word-wheel leaderboard rows by player_id or guest fingerprint,
 * summing scores, preserving avatar data, and returning the top 3.
 */
function mergeLeaderboards(
  wordHunt: RawLeaderboardRow[],
  wordWheel: RawLeaderboardRow[]
): LeaderboardEntry[] {
  const map = new Map<string, Omit<LeaderboardEntry, 'rank'>>();

  const ingest = (row: RawLeaderboardRow, kind: Kind) => {
    const key = row.player_id ? `u:${row.player_id}` : row.guest_fingerprint ? `g:${row.guest_fingerprint}` : null;
    if (!key) return;
    const rowScore = kind === 'hunt' ? (row.efficiency_score ?? row.score ?? 0) : (row.score ?? 0);
    const existing = map.get(key);
    if (existing) {
      existing.score += rowScore;
      if (kind === 'hunt') existing.huntScore += rowScore;
      else existing.wheelScore += rowScore;
      if (row.display_name && existing.name === 'Player') existing.name = row.display_name;
      existing.customAvatar = existing.customAvatar ?? row.custom_avatar ?? null;
    } else {
      map.set(key, {
        name: row.display_name || 'Player',
        score: rowScore,
        huntScore: kind === 'hunt' ? rowScore : 0,
        wheelScore: kind === 'wheel' ? rowScore : 0,
        playerId: row.player_id ?? null,
        customAvatar: row.custom_avatar ?? null,
        seed: key,
      });
    }
  };

  for (const row of wordHunt) ingest(row, 'hunt');
  for (const row of wordWheel) ingest(row, 'wheel');

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((p, i) => ({ rank: i + 1, ...p }));
}

/**
 * Mini top-3 unified daily leaderboard teaser.
 * Fetches word-hunt + word-wheel leaderboards, sums scores per player.
 */
export function LeaderboardTeaser({ currentLanguage, onViewFull }: LeaderboardTeaserProps) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const [huntResult, wheelResult] = await Promise.allSettled([
          fetch(`/api/daily-challenge/word-hunt/leaderboard/${today}/${currentLanguage}?limit=50`).then(r => r.ok ? r.json() : null),
          fetch(`/api/daily-challenge/word-wheel/leaderboard/${today}/${currentLanguage}?limit=50`).then(r => r.ok ? r.json() : null),
        ]);

        if (cancelled) return;

        const huntData: RawLeaderboardRow[] = huntResult.status === 'fulfilled' && huntResult.value?.data ? huntResult.value.data : [];
        const wheelData: RawLeaderboardRow[] = wheelResult.status === 'fulfilled' && wheelResult.value?.data ? wheelResult.value.data : [];

        setEntries(mergeLeaderboards(huntData, wheelData));
      } catch {
        // Graceful fallback - show nothing
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [currentLanguage]);

  return (
    <div
      className="bg-neo-navy/95 border-3 border-black shadow-hard rounded-xl overflow-hidden w-full"
      data-testid="leaderboard-teaser"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-black/30 bg-white/[0.03]">
        <div className="flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-neo-lime" />
          <span className="font-neo-display font-black text-white text-xs uppercase tracking-wide">
            {t('daily.todaysTopPlayers')}
          </span>
        </div>
        {onViewFull && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewFull(); }}
            className="text-[10px] font-bold text-neo-cyan hover:text-neo-lime transition-colors underline underline-offset-2"
          >
            {t('daily.fullStandings')}
          </button>
        )}
      </div>

      {/* Entries */}
      <div className="flex flex-col">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="flex items-center gap-3 px-3 py-3 border-b border-black/10 last:border-b-0">
              <div className="w-6 h-6 rounded-full skeleton" />
              <div className="w-24 h-3.5 skeleton rounded flex-1" />
              <div className="w-12 h-3.5 skeleton rounded" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="px-3 py-5 text-center text-xs text-slate-500">
            {t('daily.beFirstToPlay')}
          </div>
        ) : (
          entries.map((entry) => {
            const style = RANK_STYLES[entry.rank - 1] || { text: 'text-white', bg: '', border: '', medal: '' };
            return (
              <div
                key={entry.rank}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5',
                  'border-b border-black/10 last:border-b-0',
                  'hover:bg-white/5 transition-colors',
                  entry.rank === 1 && 'bg-neo-lime/[0.04]'
                )}
              >
                {/* Medal + Avatar */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-base leading-none" aria-hidden="true">{style.medal}</span>
                  <div className={cn(
                    'rounded-full border-2 border-black/40 shrink-0 overflow-hidden',
                    entry.rank === 1 && 'ring-2 ring-neo-lime/60'
                  )}>
                    <Avatar
                      size="sm"
                      customAvatar={entry.customAvatar}
                      userId={entry.playerId ?? entry.seed}
                    />
                  </div>
                </div>

                {/* Name + per-challenge breakdown */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {entry.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                    <span className="text-neo-pink">{entry.huntScore.toLocaleString()}</span>
                    <span className="mx-1 opacity-40">+</span>
                    <span className="text-neo-cyan">{entry.wheelScore.toLocaleString()}</span>
                  </div>
                </div>

                {/* Accumulated score */}
                <span className={cn('text-base font-black tabular-nums', style.text)}>
                  {entry.score.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
