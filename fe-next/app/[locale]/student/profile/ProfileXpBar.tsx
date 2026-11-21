'use client';

import { m } from 'framer-motion';
import { CountUp, useReducedMotionSafe } from '@/components/education/motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { XpProgress } from '@/backend/modules/xpManager';

/** XP row: the number counts up and the bar fills with a small overshoot, transform only. */
export function ProfileXpBar({ xp, level }: { xp: XpProgress; level: number }) {
  const { t } = useLanguage();
  const reduced = useReducedMotionSafe();
  const pct = Math.max(0, Math.min(100, xp.progressPercent)) / 100;
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
      <div
        className="h-4 overflow-hidden rounded-neo border-2 border-neo-cream/40 bg-neo-navy"
        role="progressbar"
        aria-label={t('common.aria.levelProgress')}
        aria-valuenow={xp.progressPercent}
        aria-valuemax={100}
      >
        <m.div
          data-testid="profile-xp-fill"
          className="h-full w-full origin-left rounded-neo bg-neo-cyan rtl:origin-right"
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 13, delay: 0.15 }}
        />
      </div>
    </div>
  );
}
