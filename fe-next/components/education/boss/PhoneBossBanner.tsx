'use client';

import { AlertTriangle, ShieldCheck, Wind, Trophy, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import type { BossCue } from './useBossCues';
import { useLiveMs } from './useLiveMs';
import styles from './boss.module.css';

export function PhoneBossBanner({ view, cue }: { view: ClassroomBossView; cue: BossCue | null }) {
  const { t } = useLanguage();
  const ms = useLiveMs(view.telegraph?.msLeft ?? null);
  const base = 'flex max-w-full items-center gap-1.5 truncate rounded-neo border-2 border-neo-black px-3 py-1 text-center text-xs font-black leading-tight shadow-hard';

  if (view.status === 'defeated' || view.status === 'escaped') {
    const won = view.status === 'defeated';
    return (
      <p data-testid="phone-boss-end" role="status" className={cn(base, won ? 'bg-neo-lime text-neo-black' : 'bg-neo-pink text-neo-black', styles.slideIn)}>
        {won ? <Trophy className="size-4 shrink-0" aria-hidden="true" /> : <Wind className="size-4 shrink-0" aria-hidden="true" />}
        {won ? t('classroomBoss.phoneWon') : t('classroomBoss.dealtPct', { pct: view.pctDealt })}
      </p>
    );
  }
  if (view.telegraph) {
    return (
      <p data-testid="phone-boss-warning" role="status" className={cn(base, 'bg-neo-pink text-neo-black', styles.slideIn)}>
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        <span>
          {t('classroomBoss.warnPhone', { s: Math.ceil(ms / 1000) })}{' '}
          <span dir="ltr" className="tabular-nums">({view.telegraph.longWords}/{view.telegraph.need})</span>
        </span>
      </p>
    );
  }
  if (view.exposed) {
    return (
      <p data-testid="phone-boss-exposed" role="status" className={cn(base, 'bg-neo-yellow text-neo-black', styles.slideIn)}>
        <Crosshair className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
        {t('classroomBoss.exposedPhone')}
      </p>
    );
  }
  if (!cue || cue.kind === 'phase') return null;
  if (cue.kind === 'staggered') {
    return (
      <p key={cue.id} role="status" className={cn(base, 'bg-neo-lime text-neo-black', styles.slideIn)}>
        <Wind className="size-4 shrink-0" aria-hidden="true" />
        {t('classroomBoss.staggered')}
      </p>
    );
  }
  return (
    <p key={cue.id} data-testid="phone-boss-attack" role="status" className={cn(base, cue.blocked ? 'bg-neo-cyan text-neo-black' : 'bg-neo-yellow text-neo-black', styles.slideIn)}>
      {cue.blocked && <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />}
      {cue.blocked ? t('classroomBoss.blocked') : t(`classroomBoss.phoneLanded.${cue.attack}`)}
    </p>
  );
}
