'use client';

import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
}

interface LeaderboardTeaserProps {
  currentLanguage: Language;
  onViewFull?: () => void;
}

const RANK_COLORS = ['text-neo-yellow', 'text-slate-300', 'text-neo-orange'];

/**
 * Mini top-3 daily leaderboard teaser.
 * Fetches from /api/daily-leaderboard and shows skeleton while loading.
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
        const res = await fetch(`/api/daily-challenge/leaderboard/${today}/${currentLanguage}?limit=3`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.data && Array.isArray(data.data)) {
            setEntries(data.data.slice(0, 3).map((e: { display_name?: string; score?: number }, i: number) => ({
              rank: i + 1,
              name: e.display_name || 'Player',
              score: e.score || 0,
            })));
          }
        }
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
      className="bg-slate-900 border-4 border-black shadow-hard rounded-2xl overflow-hidden w-full"
      data-testid="leaderboard-teaser"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black/30">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-neo-yellow" />
          <span className="font-black text-white text-sm uppercase tracking-wide">
            {t('daily.todaysTopPlayers')}
          </span>
        </div>
        {onViewFull && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewFull(); }}
            className="text-xs font-bold text-neo-cyan hover:text-neo-lime transition-colors underline underline-offset-2"
          >
            {t('daily.fullStandings')}
          </button>
        )}
      </div>

      {/* Entries */}
      <div className="divide-y-2 divide-black/20">
        {loading ? (
          // Skeleton rows
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-6 h-6 rounded-full skeleton" />
              <div className="flex-1 h-4 skeleton rounded" />
              <div className="w-12 h-4 skeleton rounded" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            {t('daily.samePuzzle')}
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              {/* Rank */}
              <span className={cn(
                'w-6 text-center font-black text-lg',
                RANK_COLORS[entry.rank - 1] || 'text-white'
              )}>
                {entry.rank}
              </span>

              {/* Avatar circle with initial */}
              <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-black/30 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {entry.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Name */}
              <span className="flex-1 text-sm font-bold text-white truncate">
                {entry.name}
              </span>

              {/* Score */}
              <span className="text-sm font-black text-neo-lime tabular-nums">
                {entry.score.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
