'use client';

import { memo } from 'react';
import { Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { useLiveMs } from './useLiveMs';
import styles from './boss.module.css';

/** The stagger payoff: while the boss is exposed, a draining yellow chip tells the room every word hits harder. */
export const BossExposedChip = memo(function BossExposedChip({ view }: { view: ClassroomBossView }) {
  const { t } = useLanguage();
  const ms = useLiveMs(view.exposed?.msLeft ?? null);
  if (!view.exposed || ms <= 0) return null;
  const frac = Math.max(0, Math.min(1, ms / view.exposed.totalMs));
  return (
    <div
      data-testid="boss-exposed"
      role="status"
      className={cn('relative overflow-hidden rounded-[0.5cqw] border-[0.25cqw] border-neo-black bg-neo-yellow px-[1.4cqw] py-[0.5cqw] shadow-hard-lg', styles.slideIn)}
    >
      <span className="relative z-10 flex items-center gap-[0.6cqw] font-neo-display text-[1.9cqw] font-black uppercase leading-none text-neo-black">
        <Crosshair className="size-[1.9cqw]" strokeWidth={3} aria-hidden="true" />
        {t('classroomBoss.exposed')}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 start-0 w-full origin-left bg-neo-orange/50 transition-transform duration-300 ease-linear rtl:origin-right"
        style={{ transform: `scaleX(${frac})` }}
      />
    </div>
  );
});
