'use client';

import Image from 'next/image';
import { Snowflake, EyeOff, ShieldOff, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import type { ClassroomBossAttackKind, ClassroomBossView } from '@/shared/types/classroomBoss';
import { formatClock, useLiveMs } from './useLiveMs';
import styles from './boss.module.css';

export const ATTACK_ICON: Record<ClassroomBossAttackKind, typeof Snowflake> = {
  freeze: Snowflake,
  blur: EyeOff,
  drain: ShieldOff,
};

const R = 44;
const C = 2 * Math.PI * R;

export function BossAttackClock({ view }: { view: ClassroomBossView }) {
  const { t } = useLanguage();
  const tg = view.telegraph;
  const msAtReceipt = tg ? tg.msLeft : view.nextAttackMs;
  const ms = useLiveMs(msAtReceipt);
  const total = tg ? tg.totalMs : Math.max(ms, 1);
  const frac = tg ? Math.max(0, Math.min(1, ms / total)) : 1;
  const Icon = tg ? ATTACK_ICON[tg.kind] : Swords;
  return (
    <section
      data-testid="boss-attack-clock"
      className={cn(
        'flex flex-col items-center gap-[0.6vw] rounded-[0.8vw] border-[0.25vw] border-neo-black bg-neo-navy-light/95 p-[1vw] shadow-hard-xl',
        tg && 'border-neo-pink',
      )}
    >
      <h3 className="font-neo-display text-center text-[2.2vw] font-black uppercase leading-none text-neo-white">
        {tg ? t(`classroomBoss.attack.${tg.kind}`) : t('classroomBoss.attackIn')}
      </h3>
      <div className={cn('relative size-[11vw]', tg && styles.pulse)}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(0 0 0 / 0.5)" strokeWidth="9" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            stroke={tg ? 'var(--neo-pink)' : 'var(--neo-purple)'}
            strokeWidth="9" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            className={styles.ring}
            style={{ transitionDuration: '250ms' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.2vw]">
          <Icon className={cn('size-[2.4vw]', tg ? 'text-neo-pink' : 'text-neo-white/70')} strokeWidth={3} aria-hidden="true" />
          <span dir="ltr" className="font-neo-display text-[3.8vw] font-black leading-none text-neo-white tabular-nums">
            {view.status === 'fighting' || view.status === 'phase-change' ? formatClock(ms) : '--'}
          </span>
        </div>
        {tg && (
          <Image src={EDU_MASCOT.attack} alt="" width={96} height={96} className="absolute -end-[2vw] -bottom-[1vw] size-[5vw] drop-shadow-[2px_2px_0_#000]" />
        )}
      </div>
      {tg && (
        <p data-testid="boss-stagger" className="text-center text-[2.1vw] font-black leading-tight text-neo-white">
          {t('classroomBoss.staggerHint', { n: tg.longWords, need: tg.need })}
        </p>
      )}
    </section>
  );
}
