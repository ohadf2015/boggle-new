'use client';

import { CountUp } from '@/components/education/motion';
import { SpringProgress } from '@/components/motion/SpringProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import type { XpProgress } from '@/backend/modules/xpManager';

/** XP row: the number counts up and the bar springs to the new fill. */
export function ProfileXpBar({ xp, level }: { xp: XpProgress; level: number }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-neo-body text-xs font-bold tabular-nums text-neo-cream/80 sm:text-sm">
          <CountUp to={xp.xpInCurrentLevel} /> / {xp.xpNeededForNextLevel} XP
        </span>
        {!xp.isMaxLevel ? (
          <span className="font-neo-body text-xs font-bold tabular-nums text-neo-cream/80 sm:text-sm">
            {t('education.xp.nextLevel')}: {level + 1}
          </span>
        ) : (
          <span className="font-neo-display text-xs font-bold text-neo-pink sm:text-sm">{t('education.xp.maxLevel')}</span>
        )}
      </div>
      <SpringProgress
        value={xp.isMaxLevel ? 1 : xp.xpInCurrentLevel}
        max={xp.isMaxLevel ? 1 : xp.xpNeededForNextLevel}
        label={t('common.aria.levelProgress')}
        tone="cyan"
        animateOnMount
        className="border-neo-cream/40 bg-neo-navy"
      />
    </div>
  );
}
