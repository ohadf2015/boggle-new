'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Trophy, Users, Target, TrendingUp, Crown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import Avatar from '@/components/Avatar';

interface CustomChallengeStatsProps {
  puzzleCode: string;
  onClose?: () => void;
}

interface StatsData {
  puzzleCode: string;
  creatorDisplayName: string;
  targetWord: string;
  language: string;
  createdAt: string;
  creatorEfficiencyScore: number;
  totalAttempts: number;
  totalSolved: number;
  solveRate: number;
  avgAttemptsSolved: number | null;
  avgEfficiencyScore: number | null;
  maxEfficiencyScore: number | null;
  attemptDistribution: Record<string, number>;
  beatCreatorCount: number;
}

interface LeaderboardEntry {
  rank_position: number;
  user_id?: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_config?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  solved: boolean;
  attempts_used: number;
  efficiency_score: number;
  completed_at: string;
}

export const CustomChallengeStats: React.FC<CustomChallengeStatsProps> = ({ puzzleCode, onClose }) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch stats and leaderboard in parallel
        const [statsRes, leaderboardRes] = await Promise.all([
          fetch(`/api/custom-puzzle/${puzzleCode}/stats`),
          fetch(`/api/custom-puzzle/${puzzleCode}/leaderboard?limit=10`),
        ]);

        if (!statsRes.ok || !leaderboardRes.ok) {
          throw new Error('Failed to fetch challenge data');
        }

        const statsData = await statsRes.json();
        const leaderboardData = await leaderboardRes.json();

        setStats(statsData.stats);
        setLeaderboard(leaderboardData.data || []);
      } catch (err) {
        console.error('Error fetching challenge stats:', err);
        setError('Failed to load challenge statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [puzzleCode]);

  const handleShare = () => {
    const url = `${window.location.origin}/${stats?.language || 'en'}/custom/${puzzleCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
    // Could add toast notification here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <PageLoader size="md" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-bold">{error || 'Failed to load stats'}</p>
        {onClose && (
          <Button onClick={onClose} className="mt-4">
            {t('daily.close')}
          </Button>
        )}
      </div>
    );
  }

  const maxAttempts = Math.max(...Object.values(stats.attemptDistribution));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-br from-neo-lime to-neo-orange p-6 rounded-xl border-neo-thick border-neo-black shadow-hard-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-black mb-2">
              {t('daily.challengeStats')}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-neo-black/10 px-3 py-1 rounded-lg font-mono text-sm font-bold">
                {puzzleCode}
              </span>
              <span className="text-sm font-bold text-neo-black/80">
                {t('daily.targetWord')}: {stats.targetWord}
              </span>
            </div>
          </div>
          <Button
            onClick={handleShare}
            className="bg-neo-white hover:bg-neo-cyan border-neo-thick border-neo-black shadow-hard-sm"
          >
            <Share2 className="w-4 h-4 me-2" />
            {t('daily.shareButton')}
          </Button>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
          className="bg-neo-white border-neo-thick border-neo-black rounded-xl p-4 shadow-hard-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-neo-cyan" strokeWidth={2.5} />
            <span className="text-sm font-bold uppercase text-slate-600">{t('daily.totalPlayers')}</span>
          </div>
          <div className="text-3xl font-black text-neo-black">{stats.totalAttempts}</div>
        </m.div>

        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
          className="bg-neo-white border-neo-thick border-neo-black rounded-xl p-4 shadow-hard-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-neo-green" strokeWidth={2.5} />
            <span className="text-sm font-bold uppercase text-slate-600">{t('daily.solved')}</span>
          </div>
          <div className="text-3xl font-black text-neo-black">{stats.totalSolved}</div>
        </m.div>

        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
          className="bg-neo-white border-neo-thick border-neo-black rounded-xl p-4 shadow-hard-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-neo-orange" strokeWidth={2.5} />
            <span className="text-sm font-bold uppercase text-slate-600">{t('daily.solveRate')}</span>
          </div>
          <div className="text-3xl font-black text-neo-black">{stats.solveRate.toFixed(0)}%</div>
        </m.div>

        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
          className="bg-neo-white border-neo-thick border-neo-black rounded-xl p-4 shadow-hard-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-neo-pink" strokeWidth={2.5} />
            <span className="text-sm font-bold uppercase text-slate-600">{t('daily.beatCreator')}</span>
          </div>
          <div className="text-3xl font-black text-neo-black">{stats.beatCreatorCount}</div>
        </m.div>
      </div>

      {/* Attempt Distribution */}
      {stats.totalSolved > 0 && (
        <div className="bg-neo-white border-neo-thick border-neo-black rounded-xl p-6 shadow-hard-sm">
          <h3 className="text-xl font-black uppercase mb-4 text-neo-black">
            {t('daily.attemptDistribution')}
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.attemptDistribution)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([attempts, count]) => {
                const percentage = maxAttempts > 0 ? (count / maxAttempts) * 100 : 0;
                return count > 0 ? (
                  <div key={attempts} className="flex items-center gap-3">
                    <span className="text-sm font-bold w-16 text-slate-600">
                      {attempts} {t('daily.attempts')}
                    </span>
                    <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden border-2 border-neo-black">
                      <m.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 * parseInt(attempts) }}
                        className="h-full bg-linear-to-r from-neo-cyan to-neo-pink flex items-center justify-end pe-2"
                      >
                        <span className="text-xs font-black text-neo-white">{count}</span>
                      </m.div>
                    </div>
                  </div>
                ) : null;
              })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-neo-white border-neo-thick border-neo-black rounded-xl p-6 shadow-hard-sm">
          <h3 className="text-xl font-black uppercase mb-4 text-neo-black flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-600" strokeWidth={2.5} />
            {t('daily.topPerformers')}
          </h3>
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => (
              <m.div
                key={`lb-${entry.user_id ?? idx}`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 380, damping: 26 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border-2 border-slate-200"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neo-black text-neo-white font-black text-sm">
                  {entry.rank_position}
                </div>
                <Avatar customAvatar={entry.avatar_config} userId={entry.user_id} size="lg" />
                <div className="flex-1">
                  <div className="font-bold text-neo-black">{entry.display_name}</div>
                  <div className="text-xs text-slate-600">
                    {entry.attempts_used} {t('daily.attempts')} • {Math.round(entry.efficiency_score)} {t('daily.points')}
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {onClose && (
        <div className="flex justify-center pt-4">
          <Button onClick={onClose} variant="ghost">
            {t('daily.close')}
          </Button>
        </div>
      )}
    </div>
  );
};
