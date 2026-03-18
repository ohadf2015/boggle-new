/**
 * WeeklyChallengePanel — Leaderboard + Play CTA for the weekly seeded challenge.
 *
 * Fetches leaderboard from /api/adventure/weekly-challenge on mount.
 * Shows countdown to reset, top 50 scores, and player's rank if they've played.
 */

'use client';

import { memo, useEffect, useState, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Trophy, X, Clock, ChevronRight, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getTimeUntilReset, type WeeklyLeaderboardEntry } from '@/lib/adventure/weeklyChallenge';

interface WeeklyChallengePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPlay?: () => void;
}

function formatCountdown(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

const RANK_ICONS = [Crown, Medal, Medal]; // 1st, 2nd, 3rd
const RANK_COLORS = ['text-neo-yellow', 'text-neo-white/80', 'text-neo-orange'];

const WeeklyChallengePanel = memo<WeeklyChallengePanelProps>(({
  isOpen,
  onClose,
  onPlay,
}) => {
  const { t } = useLanguageSafe();
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekId, setWeekId] = useState('');

  const resetMs = useMemo(() => getTimeUntilReset(), []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/adventure/weekly-challenge')
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard ?? []);
        setWeekId(data.weekId ?? '');
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AdaptiveAnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <AdaptiveMotion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full max-w-lg mx-4 max-h-[85dvh] overflow-y-auto',
            'bg-neo-navy border-4 border-neo-black',
            'rounded-neo shadow-hard-lg p-6'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-neo-yellow" />
              <h2 className="text-xl font-black text-neo-white uppercase">
                {t('adventure.weeklyChallenge.title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-neo hover:bg-neo-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-neo-white/60" />
            </button>
          </div>

          {/* Description + Reset Timer */}
          <p className="text-sm text-neo-white/60 mb-3">
            {t('adventure.weeklyChallenge.description')}
          </p>
          <div className="flex items-center gap-2 mb-4 text-xs text-neo-white/40">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('adventure.weeklyChallenge.resetsIn')}: {formatCountdown(resetMs)}</span>
            {weekId && <span className="ms-auto font-mono opacity-50">{weekId}</span>}
          </div>

          {/* Play Button */}
          {onPlay && (
            <AdaptiveMotion.button
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={onPlay}
              className={cn(
                'w-full py-3 px-4 mb-5',
                'flex items-center justify-center gap-2',
                'bg-neo-yellow text-neo-black',
                'font-black text-lg uppercase',
                'border-3 border-neo-black rounded-neo shadow-hard',
                'hover:-translate-y-0.5 hover:shadow-hard-lg',
                'active:translate-y-0.5 active:shadow-hard-pressed',
                'transition-all duration-150'
              )}
            >
              {t('adventure.weeklyChallenge.play')}
              <ChevronRight className="w-5 h-5" />
            </AdaptiveMotion.button>
          )}

          {/* Leaderboard */}
          <h3 className="text-sm font-bold text-neo-white/60 uppercase mb-3">
            {t('adventure.weeklyChallenge.leaderboard')}
          </h3>

          {loading ? (
            <div className="py-8 text-center text-neo-white/30 text-sm">...</div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 text-center text-neo-white/30 text-sm">
              {t('adventure.weeklyChallenge.noScoresYet')}
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((entry, i) => {
                const RankIcon = i < 3 ? RANK_ICONS[i] : null;
                const rankColor = i < 3 ? RANK_COLORS[i] : 'text-neo-white/50';
                return (
                  <div
                    key={`${entry.rank}-${entry.playerName}`}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-neo',
                      i < 3 ? 'bg-neo-yellow/5 border border-neo-yellow/20' : 'bg-neo-white/3'
                    )}
                  >
                    {/* Rank */}
                    <div className={cn('w-8 text-center font-black', rankColor)}>
                      {RankIcon ? <RankIcon className="w-5 h-5 mx-auto" /> : <span>{entry.rank}</span>}
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neo-white truncate">{entry.playerName}</p>
                      <p className="text-xs text-neo-white/40">
                        {entry.wordsFound} words · {entry.longestWord}
                      </p>
                    </div>

                    {/* Score */}
                    <span className={cn(
                      'text-lg font-black tabular-nums',
                      i === 0 ? 'text-neo-yellow' : 'text-neo-white'
                    )}>
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </AdaptiveMotion.div>
      </div>
    </AdaptiveAnimatePresence>
  );
});

WeeklyChallengePanel.displayName = 'WeeklyChallengePanel';

export default WeeklyChallengePanel;
