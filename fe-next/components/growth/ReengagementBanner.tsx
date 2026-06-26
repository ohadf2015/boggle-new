'use client';

/**
 * ReengagementBanner - Welcome-back banner for returning lapsed players.
 * Shows personalized message based on days away, bonus rewards, dismiss button.
 * Only renders when comeback bonus is active.
 * Neo-brutalist: border-neo-pink, shadow-hard, Gift/Sparkles icons.
 */

import React, { memo, useState, useCallback } from 'react';
import { Gift, Sparkles, X, Coins, Shield, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ReengagementReward {
  type: 'coins' | 'streak_freeze' | 'premium_trial';
  amount?: number;
  label: string;
}

interface ReengagementBannerProps {
  /** Days since last activity */
  daysAway: number;
  /** Bonus rewards to show */
  rewards: ReengagementReward[];
  /** Whether the comeback bonus is active */
  isActive: boolean;
  /** Callback when user claims the bonus */
  onClaim: () => void;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
}

const REWARD_ICONS: Record<string, React.ReactNode> = {
  coins: <Coins className="w-5 h-5 text-neo-yellow" />,
  streak_freeze: <Shield className="w-5 h-5 text-neo-cyan" />,
  premium_trial: <Star className="w-5 h-5 text-neo-orange" />,
};

function getMessageKey(daysAway: number): string {
  if (daysAway >= 30) return 'reengagement.longTimeNoSee';
  if (daysAway >= 14) return 'reengagement.missedYou';
  if (daysAway >= 7) return 'reengagement.welcomeBack';
  return 'reengagement.goodToSeeYou';
}

export const ReengagementBanner: React.FC<ReengagementBannerProps> = memo(
  function ReengagementBanner({
    daysAway,
    rewards,
    isActive,
    onClaim,
    onDismiss,
  }) {
    const { t } = useLanguage();
    const [dismissed, setDismissed] = useState(false);

    const handleDismiss = useCallback(() => {
      setDismissed(true);
      onDismiss?.();
    }, [onDismiss]);

    const handleClaim = useCallback(() => {
      onClaim();
      setDismissed(true);
    }, [onClaim]);

    if (!isActive || dismissed) return null;

    const messageKey = getMessageKey(daysAway);

    return (
      <div
        data-testid="reengagement-banner"
        role="banner"
        aria-label={t('reengagement.ariaLabel')}
        className={cn(
          'relative w-full border-neo border-neo-pink rounded-neo p-4',
          'bg-linear-to-r from-neo-navy via-neo-pink/10 to-neo-navy',
          'shadow-hard-sm',
          'flex flex-col gap-3'
        )}
      >
        {/* Dismiss button */}
        <button
          type="button"
          data-testid="dismiss-reengagement"
          onClick={handleDismiss}
          className={cn(
            'absolute top-2 inset-e-2 p-1 rounded-neo',
            'text-neo-white hover:text-neo-white',
            'hover:bg-neo-white/10 transition-colors'
          )}
          aria-label={t('reengagement.dismiss')}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6 text-neo-pink" aria-hidden="true" />
          <Sparkles className="w-5 h-5 text-neo-yellow" aria-hidden="true" />
          <h3 className="font-neo-display text-lg text-neo-white">
            {t(messageKey)}
          </h3>
        </div>

        {/* Personalized message */}
        <p className="text-sm text-neo-white">
          {t('reengagement.bonusMessage', { days: String(daysAway) })}
        </p>

        {/* Reward pills */}
        {rewards.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            data-testid="reengagement-rewards"
            role="list"
            aria-label={t('reengagement.rewardsAriaLabel')}
          >
            {rewards.map((reward) => (
              <div
                key={`${reward.type}-${reward.amount ?? 0}`}
                role="listitem"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-neo',
                  'bg-neo-white/5 border border-neo-white/10',
                  'text-sm text-neo-white font-bold'
                )}
              >
                {REWARD_ICONS[reward.type] ?? (
                  <Gift className="w-5 h-5 text-neo-pink" />
                )}
                <span>
                  {reward.amount != null && `${reward.amount} `}
                  {reward.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Claim button */}
        <button
          type="button"
          data-testid="claim-bonus-btn"
          onClick={handleClaim}
          className={cn(
            'w-full py-2.5 rounded-neo font-bold text-base',
            'bg-neo-pink text-neo-white border-neo shadow-hard-sm',
            'hover:shadow-hard-pressed active:translate-y-0.5',
            'flex items-center justify-center gap-2'
          )}
        >
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          {t('reengagement.claimBonus')}
        </button>
      </div>
    );
  }
);

export default ReengagementBanner;
