'use client';

/**
 * GlobalRankBadge — Hero-section badge showing where the player stands
 * against the *global* base, not just match opponents. Drives competence
 * reinforcement (won) or improvement framing (lost). Calibrated to avoid
 * demoralizing new players.
 */

import React from 'react';
import { Globe2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayerPercentile } from '@/hooks/usePlayerPercentile';

const NEW_PLAYER_GAMES_THRESHOLD = 5;
const SOCIAL_PROOF_PLAYERS_TODAY = 18432;

interface Props {
  userId: string | null;
  matchScore: number;
  className?: string;
}

export function GlobalRankBadge({ userId, matchScore, className }: Props) {
  const { t } = useLanguage();
  const { data, isLoading } = usePlayerPercentile(userId);

  if (!userId || isLoading || !data) return null;

  const isNewPlayer = data.totalGames < NEW_PLAYER_GAMES_THRESHOLD;

  if (isNewPlayer) {
    return (
      <div
        data-testid="global-rank-social-proof"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
          'border-neo border-neo-cyan/40 bg-neo-cyan/10 text-neo-cyan',
          'text-xs font-neo-body font-semibold',
          className
        )}
      >
        <Globe2 className="w-3.5 h-3.5" />
        <span>
          {t('globalRank.socialProof', {
            count: SOCIAL_PROOF_PLAYERS_TODAY.toLocaleString(),
          })}
        </span>
      </div>
    );
  }

  const avgScore = data.totalGames > 0 ? data.totalScore / data.totalGames : 0;
  const deltaPct = avgScore > 0 ? Math.round(((matchScore - avgScore) / avgScore) * 100) : 0;
  const beatsAvg = deltaPct > 0;

  return (
    <div
      data-testid="global-rank-badge"
      className={cn(
        'inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full',
        'border-neo border-neo-yellow/40 bg-neo-yellow/10 text-neo-yellow',
        'text-xs font-neo-body font-semibold',
        className
      )}
    >
      <Globe2 className="w-3.5 h-3.5" />
      <span>{t('globalRank.top', { percentile: data.percentile })}</span>
      {data.totalPlayersAbove > 0 ? (
        <span className="text-neo-yellow/70">
          · {t('globalRank.behind', { count: data.totalPlayersAbove.toLocaleString() })}
        </span>
      ) : null}
      {beatsAvg ? (
        <span className="inline-flex items-center gap-1 text-neo-lime">
          <TrendingUp className="w-3 h-3" />
          {t('globalRank.aboveYourNorm', { delta: deltaPct })}
        </span>
      ) : null}
    </div>
  );
}

export default GlobalRankBadge;
