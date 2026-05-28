'use client';

import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DailyChallengeRow } from '@/lib/supabase/education/types';

interface DailyChallengeCardProps {
  challenge: DailyChallengeRow;
  onClaim: (id: string) => void;
}

export function DailyChallengeCard({ challenge, onClaim }: DailyChallengeCardProps) {
  const { t } = useLanguage();

  const tierColors: Record<'easy' | 'medium' | 'hard', string> = {
    easy: 'bg-neo-lime text-neo-black',
    medium: 'bg-neo-cyan text-neo-black',
    hard: 'bg-neo-pink text-white',
  };

  const progress = challenge.target_value > 0
    ? (challenge.current_value / challenge.target_value) * 100
    : 0;

  const isCompleted = challenge.completed;
  const isClaimed = challenge.claimed;
  const canClaim = isCompleted && !isClaimed;

  return (
    <div
      className="bg-neo-navy border-neo border-3 rounded-neo shadow-hard p-4"
      data-testid="daily-challenge-card"
    >
      {/* Tier Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`${tierColors[challenge.challenge_tier as 'easy' | 'medium' | 'hard']} text-xs font-black px-2 py-1 rounded uppercase border-neo border-neo-black`}
          data-testid="tier-badge"
        >
          {t(`challenges.${challenge.challenge_tier}`)}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="font-neo-display text-lg text-white mb-1" data-testid="challenge-title">
        {t(challenge.title)}
      </h3>
      <p className="text-sm text-neo-white mb-3" data-testid="challenge-description">
        {t(challenge.description, { target: challenge.target_value })}
      </p>

      {/* Progress Bar */}
      <div className="relative h-6 bg-neo-navy-light border border-neo-black rounded-full overflow-hidden mb-3" data-testid="progress-bar">
        <m.div
          className="absolute inset-y-0 left-0 bg-neo-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
          data-testid="progress-fill"
        />
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
          {challenge.current_value} / {challenge.target_value}
        </div>
      </div>

      {/* Rewards */}
      <div className="flex items-center gap-3 mb-3 text-sm">
        <span className="text-neo-lime">{t('education.challenges.xpReward', { amount: challenge.xp_reward })}</span>
        {challenge.bonus_reward?.coins && (
          <span className="text-neo-pink">{t('education.challenges.coinReward', { amount: challenge.bonus_reward.coins })}</span>
        )}
      </div>

      {/* Claim Button */}
      {canClaim && (
        <button
          onClick={() => onClaim(challenge.id)}
          className="w-full bg-neo-lime text-black font-bold py-2 px-4 rounded-neo border-neo border-3 shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-transform"
          data-testid="claim-button"
        >
          {t('challenges.claim')}
        </button>
      )}

      {/* Claimed State */}
      {isClaimed && (
        <div className="text-center text-neo-lime font-bold" data-testid="claimed-badge">
          <Check className="w-4 h-4 inline" /> {t('challenges.claimed')}
        </div>
      )}
    </div>
  );
}
