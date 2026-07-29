'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Flame, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreakMilestone } from '@/lib/adventure/adventureStreak';

interface StreakMilestoneCelebrationProps {
  milestone: StreakMilestone | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function StreakMilestoneCelebration({ milestone, t }: StreakMilestoneCelebrationProps) {
  if (!milestone) return null;

  return (
    <AdaptiveMotion.div
      data-testid="streak-milestone"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className={cn(
        'relative overflow-hidden border-2 rounded-neo p-4',
        'bg-linear-to-r from-neo-orange/20 via-neo-red/10 to-neo-orange/20',
        'border-neo-orange/40',
      )}
    >
      <div className="flex items-center gap-3">
        <Flame className="w-6 h-6 text-neo-orange shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-black text-sm text-neo-orange uppercase tracking-wider">
            {t(milestone.titleKey)}
          </div>
          <div className="text-neo-white text-xs mt-0.5">
            {milestone.days} {t('adventure.streak.days')}
          </div>
        </div>
        <div className="flex items-center gap-1 text-neo-lime font-black text-sm">
          <Coins className="w-4 h-4" />
          +{milestone.rewardGold}
        </div>
      </div>
    </AdaptiveMotion.div>
  );
}
