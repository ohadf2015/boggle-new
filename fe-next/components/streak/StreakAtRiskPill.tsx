'use client';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { StreakFlame } from './StreakFlame';
import styles from './StreakFlame.module.css';

interface StreakAtRiskPillProps {
  days: number;
  /** `light` sits on a bright card, where an orange pill would vanish. */
  tone?: 'dark' | 'light';
  className?: string;
}

/** "Play today to keep your N-day streak": a small pulsing warning, never louder than the Play button. */
export function StreakAtRiskPill({ days, tone = 'dark', className }: StreakAtRiskPillProps) {
  const { t } = useLanguage();
  return (
    <span
      data-testid="streak-at-risk"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-neo-black py-0.5 pe-3 ps-1.5 font-neo-display text-xs font-bold shadow-hard-sm md:text-sm',
        tone === 'light' ? 'bg-neo-black text-neo-yellow' : 'bg-neo-orange text-neo-black',
        styles.pulse,
        className,
      )}
    >
      <StreakFlame days={days} size={20} mood="worried" animated={false} />
      {t('dailyStreak.flame.atRisk', { n: days })}
    </span>
  );
}

export default StreakAtRiskPill;
