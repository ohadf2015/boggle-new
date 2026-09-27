'use client';

/**
 * PlayerRecapCard - Shareable weekly/monthly recap card.
 * Shows key stats, improvement badge, tab switcher, and share button.
 * Neo-brutalist: border-neo-pink, shadow-hard, BarChart3 icon.
 */

import React, { memo, useState, useCallback } from 'react';
import { BarChart3, Share2, Trophy, Flame, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayerRecap } from '@/hooks/usePlayerRecap';
import { cn } from '@/lib/utils';
import type { RecapPeriod, PlayerRecap } from '@/shared/types/growth';

function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2">
      {icon && <span aria-hidden="true">{icon}</span>}
      <span className="text-lg font-bold text-neo-white font-neo-display">
        {value}
      </span>
      <span className="text-xs text-neo-white">{label}</span>
    </div>
  );
}

function ImprovementBadge({ percent }: { percent: number }) {
  const { t } = useLanguage();
  if (percent === 0) return null;

  const isPositive = percent > 0;
  return (
    <span
      data-testid="improvement-badge"
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-neo text-xs font-bold',
        isPositive
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      )}
    >
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      {isPositive ? '+' : ''}
      {percent}% {t('recap.vsLast')}
    </span>
  );
}

export const PlayerRecapCard: React.FC = memo(function PlayerRecapCard() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<RecapPeriod>('weekly');
  const { weeklyRecap, monthlyRecap, loading } = usePlayerRecap();
  const recap = period === 'weekly' ? weeklyRecap : monthlyRecap;
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!recap) return;

    const text = [
      t('recap.shareTitle'),
      `${t('recap.games')}: ${recap.totalGames}`,
      `${t('recap.words')}: ${recap.totalWords}`,
      recap.longestWord
        ? `${t('recap.longestWord')}: ${recap.longestWord}`
        : null,
      `${t('recap.bestScore')}: ${recap.bestScore}`,
      `${t('recap.streak')}: ${recap.streakDays}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }, [recap, t]);

  if (loading) return null;
  if (!recap) return null;

  return (
    <div
      data-testid="player-recap-card"
      role="region"
      aria-label={t('recap.ariaLabel')}
      className={cn(
        'border-neo border-neo-pink rounded-neo p-4',
        'bg-neo-navy shadow-hard-sm',
        'flex flex-col gap-3'
      )}
    >
      {/* Header + share */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-neo-pink" aria-hidden="true" />
          <h3 className="font-neo-display text-lg text-neo-white">
            {t('recap.title')}
          </h3>
        </div>
        <button
          type="button"
          data-testid="share-recap-btn"
          onClick={handleShare}
          className={cn(
            'p-2 rounded-neo border border-neo-white/20',
            'hover:bg-neo-white/10 active:translate-y-0.5',
            'transition-colors'
          )}
          aria-label={t('recap.shareAriaLabel')}
        >
          <Share2
            className={cn('w-4 h-4', copied ? 'text-green-400' : 'text-neo-white')}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 p-0.5 rounded-neo bg-neo-white/5" role="tablist">
        {(['weekly', 'monthly'] as RecapPeriod[]).map((p) => (
          <button
            type="button"
            key={p}
            role="tab"
            aria-selected={period === p}
            data-testid={`recap-tab-${p}`}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex-1 py-1.5 text-sm font-bold rounded-neo transition-colors',
              period === p
                ? 'bg-neo-pink text-neo-white shadow-hard-sm'
                : 'text-neo-white hover:text-neo-white'
            )}
          >
            {t(`recap.${p}`)}
          </button>
        ))}
      </div>

      {/* Improvement badge */}
      <div className="flex justify-center">
        <ImprovementBadge percent={recap.improvementPercent} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1">
        <StatItem
          label={t('recap.games')}
          value={recap.totalGames}
          icon={<Trophy className="w-4 h-4 text-neo-yellow" />}
        />
        <StatItem
          label={t('recap.words')}
          value={recap.totalWords}
        />
        <StatItem
          label={t('recap.streak')}
          value={recap.streakDays}
          icon={<Flame className="w-4 h-4 text-neo-orange" />}
        />
      </div>

      {/* Highlight stats */}
      <div className="flex flex-col gap-1 px-2">
        {recap.longestWord && (
          <div className="flex justify-between text-sm">
            <span className="text-neo-white">{t('recap.longestWord')}</span>
            <span className="font-bold text-neo-white uppercase">
              {recap.longestWord}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-neo-white">{t('recap.bestScore')}</span>
          <span className="font-bold text-neo-yellow">
            {recap.bestScore.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neo-white">{t('recap.bestCombo')}</span>
          <span className="font-bold text-neo-orange">
            {recap.bestCombo}x
          </span>
        </div>
      </div>
    </div>
  );
});

export default PlayerRecapCard;
