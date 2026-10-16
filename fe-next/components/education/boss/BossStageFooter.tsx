'use client';

import { memo } from 'react';
import { Zap, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatClock } from './useLiveMs';
import styles from './boss.module.css';

const TIER_AT = [0, 3, 6, 10];

export const BossStageFooter = memo(function BossStageFooter({ remainingTime, comboCount, multiplier }: {
  remainingTime: number;
  comboCount: number;
  multiplier: number;
}) {
  const { t } = useLanguage();
  const lo = TIER_AT[multiplier - 1] ?? 0;
  const hi = TIER_AT[multiplier] ?? lo;
  const filled = multiplier >= 4 ? 5 : Math.round(((comboCount - lo) / Math.max(1, hi - lo)) * 5);
  const low = remainingTime <= 10;
  return (
    <div className="flex items-end justify-center gap-[1.6cqw]">
      <div
        data-testid="boss-timer"
        className={cn('flex size-[8.5cqw] flex-col items-center justify-center rounded-full border-[0.3cqw] border-neo-black bg-neo-navy-light shadow-hard-xl', low && 'border-neo-red')}
      >
        <span dir="ltr" className={cn('font-neo-display text-[3.2cqw] font-black leading-none tabular-nums', low ? 'text-neo-red' : 'text-neo-white')}>
          {formatClock(remainingTime * 1000)}
        </span>
        <span className="sr-only">{t('classroomBoss.timeLeft')}</span>
        <Timer className="mt-[0.3cqw] size-[1.6cqw] text-neo-white/70" aria-hidden="true" />
      </div>
      <div
        data-testid="boss-combo"
        className={cn('min-w-[15cqw] rounded-[0.8cqw] border-[0.3cqw] border-neo-black bg-neo-navy-light px-[1.2cqw] py-[0.8cqw] text-center shadow-hard-xl', multiplier > 1 && 'border-neo-yellow')}
      >
        <p className="flex items-center justify-center gap-[0.4cqw] font-neo-display text-[1.7cqw] font-black uppercase leading-none text-neo-white">
          <Zap className="size-[1.7cqw] fill-neo-yellow text-neo-yellow" aria-hidden="true" />
          {t('classroomBoss.combo')}
        </p>
        <p key={multiplier} dir="ltr" className={cn('font-neo-display text-[3.8cqw] font-black leading-none', multiplier > 1 ? 'text-neo-yellow' : 'text-neo-white/50', multiplier > 1 && styles.slideIn)}>
          x{multiplier}
        </p>
        <div className="mt-[0.5cqw] flex gap-[0.3cqw]" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={cn('h-[0.7cqw] flex-1 rounded-sm border border-neo-black', i < filled ? 'bg-neo-yellow' : 'bg-neo-black/50')} />
          ))}
        </div>
      </div>
    </div>
  );
});
