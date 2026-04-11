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

const RANK_STYLES = [
  { text: 'text-neo-lime', bg: 'bg-neo-lime/20', border: 'border-neo-lime/40', medal: '🥇' },
  { text: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10', medal: '🥈' },
  { text: 'text-neo-pink', bg: 'bg-neo-pink/10', border: 'border-neo-pink/30', medal: '🥉' },
];

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
      className="bg-slate-900/95 border-3 border-black shadow-hard rounded-xl overflow-hidden w-full"
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
            <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-black/10 last:border-b-0">
              <div className="w-6 h-6 rounded-full skeleton" />
              <div className="w-24 h-3.5 skeleton rounded flex-1" />
              <div className="w-12 h-3.5 skeleton rounded" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="px-3 py-5 text-center text-xs text-slate-500">
            {t('daily.samePuzzle')}
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
                    'w-7 h-7 rounded-full border-2 border-black/30 flex items-center justify-center',
                    style.bg
                  )}>
                    <span className={cn('text-[11px] font-black', style.text)}>
                      {entry.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <span className="text-sm font-bold text-white truncate flex-1 min-w-0">
                  {entry.name}
                </span>

                {/* Score */}
                <span className={cn('text-sm font-black tabular-nums', style.text)}>
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
