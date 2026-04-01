'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WeeklyQuestRow } from '@/lib/supabase/education/types';

interface WeeklyChallengeCardProps {
  quest: WeeklyQuestRow;
  onClaim: (id: string) => void;
}

export function WeeklyChallengeCard({ quest, onClaim }: WeeklyChallengeCardProps) {
  const { t } = useLanguage();

  const requirementKey = quest.requirements && typeof quest.requirements === 'object'
    ? Object.keys(quest.requirements as Record<string, unknown>)[0]
    : null;
  const progress = requirementKey
    ? ((quest.current_progress as any)?.[requirementKey] / (quest.requirements as any)[requirementKey]) * 100
    : 0;

  const canClaim = quest.completed && !quest.claimed;

  return (
    <div
      className="bg-neo-navy bg-opacity-80 border-neo-cyan border-3 rounded-neo shadow-hard p-4"
      style={{ backgroundColor: 'rgba(26, 26, 46, 0.9)', borderColor: 'var(--neo-cyan)' }}
      data-testid="weekly-challenge-card"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-neo-cyan text-xs font-bold px-2 py-1 rounded uppercase">
          {t('challenges.weekly.title')}
        </span>
      </div>

      <h3 className="font-neo-display text-lg text-white mb-1">{t(quest.title)}</h3>
      <p className="text-sm text-neo-white/60 mb-3">
        {t(quest.description).replace('{target}', String(requirementKey ? (quest.requirements as any)?.[requirementKey] || 0 : 0))}
      </p>

      <div className="relative h-6 bg-neo-navy rounded-full overflow-hidden mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 bg-neo-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
          {requirementKey ? (quest.current_progress as any)?.[requirementKey] || 0 : 0} / {requirementKey ? (quest.requirements as any)?.[requirementKey] || 0 : 0}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 text-sm">
        <span className="text-neo-lime">+{quest.xp_reward} XP</span>
        {quest.bonus_rewards?.coins && (
          <span className="text-neo-orange">+{quest.bonus_rewards.coins} coins</span>
        )}
      </div>

      {canClaim && (
        <button
          onClick={() => onClaim(quest.id)}
          className="w-full bg-neo-lime text-black font-bold py-2 px-4 rounded-neo border-neo border-3 shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-transform"
          data-testid="claim-button"
        >
          {t('challenges.claim')}
        </button>
      )}

      {quest.claimed && (
        <div className="text-center text-green-400 font-bold">
          ✓ {t('challenges.claimed')}
        </div>
      )}
    </div>
  );
}
