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
      className="bg-slate-900 border-3 border-black shadow-hard rounded-xl overflow-hidden w-full"
      data-testid="leaderboard-teaser"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black/30">
        <div className="flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-neo-yellow" />
          <span className="font-black text-white text-xs uppercase tracking-wide">
            {t('daily.todaysTopPlayers')}
          </span>
        </div>
        {onViewFull && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewFull(); }}
            className="text-[10px] font-bold text-neo-cyan hover:text-neo-lime transition-colors underline underline-offset-2"
          >
            {t('daily.fullStandings')}
          </button>
        )}
      </div>

      {/* Entries - horizontal on mobile, vertical on sm+ */}
      <div className="flex flex-row sm:flex-col divide-x-2 sm:divide-x-0 sm:divide-y-2 divide-black/20">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 px-3 py-2.5 sm:flex-row sm:gap-3 sm:px-4 sm:py-2.5">
              <div className="w-6 h-6 rounded-full skeleton" />
              <div className="w-16 h-3 skeleton rounded sm:flex-1 sm:h-4" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="flex-1 px-3 py-4 text-center text-xs text-slate-500">
            {t('daily.samePuzzle')}
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.rank}
              className="flex-1 flex flex-col items-center gap-0.5 px-2 py-2.5 sm:flex-row sm:gap-3 sm:px-4 sm:py-2.5 hover:bg-white/5 transition-colors"
            >
              {/* Rank + Avatar */}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'font-black text-sm',
                  RANK_COLORS[entry.rank - 1] || 'text-white'
                )}>
                  {entry.rank}
                </span>
                <div className="w-6 h-6 rounded-full bg-white/10 border border-black/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {entry.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Name */}
              <span className="text-[11px] sm:text-sm font-bold text-white truncate max-w-[80px] sm:max-w-none sm:flex-1">
                {entry.name}
              </span>

              {/* Score */}
              <span className="text-[11px] sm:text-sm font-black text-neo-lime tabular-nums">
                {entry.score.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
