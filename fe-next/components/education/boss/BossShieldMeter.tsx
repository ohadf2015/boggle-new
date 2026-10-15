'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { EDU_MASCOT } from '@/lib/education/mascotArt';

export const BossShieldMeter = memo(function BossShieldMeter({ shield, max }: { shield: number; max: number }) {
  const { t } = useLanguage();
  return (
    <section
      data-testid="boss-shield"
      className="relative rounded-[0.8vw] border-[0.25vw] border-neo-black bg-neo-navy-light/95 p-[1vw] shadow-hard-xl"
    >
      <Image src={EDU_MASCOT.shield} alt="" width={96} height={96} className="absolute -top-[3vw] -end-[1.2vw] size-[5.5vw] drop-shadow-[2px_2px_0_#000]" />
      <h3 className="flex items-center gap-[0.5vw] font-neo-display text-[2.2vw] font-black uppercase leading-none tracking-wide text-neo-white">
        <Shield className="size-[2.2vw] text-neo-cyan" strokeWidth={3} aria-hidden="true" />
        {t('classroomBoss.shield')}
      </h3>
      <div className="mt-[0.7vw] flex gap-[0.45vw]" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={shield} aria-label={t('classroomBoss.shield')}>
        {Array.from({ length: max }, (_, i) => (
          <Shield
            key={i}
            aria-hidden="true"
            strokeWidth={2.5}
            className={cn('size-[3.2vw] transition-transform duration-200', i < shield ? 'fill-neo-cyan text-neo-black scale-100' : 'text-neo-white/25 scale-90')}
          />
        ))}
      </div>
      <p dir="ltr" className="mt-[0.4vw] text-center text-[2.2vw] font-black text-neo-white tabular-nums">{shield}/{max}</p>
    </section>
  );
});
