'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Lock } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';
import { GLOBAL_LEADERBOARD_TIERS } from '@/lib/ranked/leaderboardTiers';
import { cosmeticsUnlockedAtTier } from '@/lib/cosmetics';

interface TierRoadmapProps {
  totalScore: number;
  currentTierId: string;
}

/**
 * The full rank ladder — every tier in order, its score threshold, whether it's
 * reached / current / locked, and the cosmetics it unlocks. Lets a player see
 * "how do I get to Diamond and what's waiting there" instead of guessing.
 */
export function TierRoadmap({ totalScore, currentTierId }: TierRoadmapProps) {
  const { t } = useLanguage();
  const score = Math.max(0, totalScore);

  return (
    <ol className="flex flex-col gap-2" aria-label={t('cosmetics.rank.ladderLabel')}>
      {GLOBAL_LEADERBOARD_TIERS.map((tier) => {
        const achieved = score >= tier.minScore;
        const isCurrent = tier.id === currentTierId;
        const cosmetics = cosmeticsUnlockedAtTier(tier.id);

        return (
          <li
            key={tier.id}
            className={`rounded-neo border-neo p-2.5 transition-colors ${
              isCurrent
                ? 'bg-neo-navy shadow-hard-sm'
                : achieved
                  ? 'bg-neo-navy-light/60'
                  : 'bg-neo-navy-light/30'
            }`}
            style={isCurrent ? { borderColor: tier.color } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <div className={achieved ? '' : 'opacity-50 grayscale'}>
                <TierBadge tier={tier} size="md" animated={isCurrent} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-neo-display font-bold text-sm" style={{ color: tier.color }}>
                    {t(`rank.tier.${tier.id}`)}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-neo-cyan px-1.5 py-0.5 text-[9px] font-bold text-black">
                      {t('cosmetics.rank.current')}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-neo-white/60 tabular-nums font-neo-body">
                  {t('cosmetics.rank.threshold', { score: tier.minScore.toLocaleString() })}
                </span>
              </div>
              <span className="shrink-0">
                {achieved ? (
                  <Check className="h-4 w-4 text-neo-lime" aria-label={t('cosmetics.rank.reached')} />
                ) : (
                  <Lock className="h-4 w-4 text-neo-white/40" aria-label={t('cosmetics.locked')} />
                )}
              </span>
            </div>

            {cosmetics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 ps-[42px]">
                {cosmetics.map((c) => (
                  <span
                    key={c.id}
                    className={`rounded-neo border px-1.5 py-0.5 text-[10px] font-neo-body ${
                      achieved
                        ? 'border-neo-lime/50 text-neo-lime'
                        : 'border-neo-white/20 text-neo-white/50'
                    }`}
                  >
                    {t(c.name)}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default TierRoadmap;
