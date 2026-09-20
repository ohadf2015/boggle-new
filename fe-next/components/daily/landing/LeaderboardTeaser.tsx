'use client';

import { useEffect, useState } from 'react';
import { Crown, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { DAILY_MODES, type DailyModeId } from '@/lib/dailyModes';
import type { MergedLeaderboardEntry } from '@/lib/daily/mergeDailyLeaderboard';
import type { Language } from '@/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface LeaderboardTeaserProps {
  currentLanguage: Language;
  onViewFull?: () => void;
}

const RANK_STYLES = [
  { text: 'text-neo-lime', medal: '🥇' },
  { text: 'text-slate-300', medal: '🥈' },
  { text: 'text-neo-pink', medal: '🥉' },
];

/* Per-mode dot colour in the breakdown, matching each card's accent on the hub
   so a row reads as "the same four games". Full class strings — Tailwind emits
   nothing for `bg-neo-${accent}`. */
const MODE_DOT: Record<DailyModeId, string> = {
  'word-hunt': 'bg-neo-orange',
  'word-wheel': 'bg-neo-yellow',
  'word-tower': 'bg-neo-cyan',
  connections: 'bg-neo-purple',
};

/**
 * Today's top players across the WHOLE daily challenge.
 *
 * Previously this fetched the Word Hunt and Word Wheel boards and summed them
 * client-side — 2 of the 4 modes the hub shows, so Word Tower and Connections
 * were silently missing and the header had to name its own scope to stay
 * honest. It now reads one server-merged endpoint covering all four, which is
 * also the only way to include Connections: its public board exposes no player
 * identity, so a client cannot join it to anything.
 *
 * Tapping a row opens what that player scored in each mode. Word Tower scores
 * in metres, so its points are shown with the real height beside them.
 */
export function LeaderboardTeaser({ currentLanguage, onViewFull }: LeaderboardTeaserProps) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<MergedLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(
          `/api/daily/leaderboard?date=${today}&lang=${currentLanguage}&limit=3`,
        );
        const json = res.ok ? await res.json() : null;
        if (cancelled) return;
        setEntries(Array.isArray(json?.data) ? json.data : []);
      } catch {
        // Graceful fallback — an empty board, never a crashed hub.
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
      <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-black/30 bg-white/[0.03]">
        <div className="flex items-center gap-1.5 min-w-0">
          <Crown className="w-4 h-4 text-neo-lime shrink-0" />
          <span className="font-neo-display font-black text-white text-xs uppercase tracking-wide truncate">
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
            const style = RANK_STYLES[entry.rank - 1] || { text: 'text-white', medal: '' };
            const isOpen = expanded === entry.rank;
            return (
              <div key={entry.rank} className="border-b border-black/10 last:border-b-0">
                <button
                  type="button"
                  data-testid={`leaderboard-row-${entry.rank}`}
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : entry.rank)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-start',
                    'hover:bg-white/5 transition-colors cursor-pointer',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
                    entry.rank === 1 && 'bg-neo-lime/[0.04]',
                  )}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base leading-none" aria-hidden="true">{style.medal}</span>
                    <div className={cn(
                      'rounded-full border-2 border-black/40 shrink-0 overflow-hidden',
                      entry.rank === 1 && 'ring-2 ring-neo-lime/60',
                    )}>
                      <Avatar
                        size="sm"
                        customAvatar={entry.customAvatar as CustomAvatarConfig | null}
                        userId={String(entry.rank)}
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {entry.name || t('daily.aPlayer')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t('daily.modesPlayedCount', { count: entry.playedModes.length })}
                    </div>
                  </div>

                  <span className={cn('text-base font-black tabular-nums', style.text)}>
                    {entry.total.toLocaleString()}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'w-4 h-4 shrink-0 text-slate-400 transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {isOpen && (
                  <div
                    data-testid={`leaderboard-breakdown-${entry.rank}`}
                    className="px-3 pb-3 pt-1 flex flex-col gap-1.5 bg-black/20"
                  >
                    {DAILY_MODES.map((mode) => {
                      const points = entry.byMode?.[mode.id] ?? 0;
                      const played = entry.playedModes?.includes(mode.id);
                      return (
                        <div key={mode.id} className="flex items-center gap-2 text-[11px]">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', MODE_DOT[mode.id])} aria-hidden="true" />
                          <span className="flex-1 min-w-0 truncate text-slate-300">{t(mode.titleKey)}</span>
                          {played ? (
                            <span className="font-bold tabular-nums text-white">
                              {points.toLocaleString()}
                              {/* Tower scores in metres; show the real unit next to its points. */}
                              {mode.id === 'word-tower' && entry.towerHeightM != null && (
                                <span className="ms-1 font-normal text-slate-400">
                                  ({Math.round(entry.towerHeightM)}m)
                                </span>
                              )}
                            </span>
                          ) : (
                            // A bare 0 reads as "played it and scored nothing".
                            <span data-unplayed="true" className="text-slate-600 tabular-nums">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
