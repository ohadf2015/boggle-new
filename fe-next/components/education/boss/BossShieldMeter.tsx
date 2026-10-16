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
      className="relative rounded-[0.8cqw] border-[0.25cqw] border-neo-black bg-neo-navy-light/95 p-[1cqw] shadow-hard-xl"
    >
      <Image src={EDU_MASCOT.shield} alt="" width={96} height={96} className="absolute -top-[2.2cqw] -end-[1cqw] size-[4.2cqw] drop-shadow-[2px_2px_0_#000]" />
      <h3 className="flex items-center gap-[0.5cqw] font-neo-display text-[1.8cqw] font-black uppercase leading-none tracking-wide text-neo-white">
        <Shield className="size-[2.2cqw] text-neo-cyan" strokeWidth={3} aria-hidden="true" />
        {t('classroomBoss.shield')}
      </h3>
      <div className="mt-[0.7cqw] flex gap-[0.45cqw]" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={shield} aria-label={t('classroomBoss.shield')}>
        {Array.from({ length: max }, (_, i) => (
          <Shield
            key={i}
            aria-hidden="true"
            strokeWidth={2.5}
            className={cn('size-[2.7cqw] transition-transform duration-200', i < shield ? 'fill-neo-cyan text-neo-black scale-100' : 'text-neo-white/25 scale-90')}
          />
        ))}
      </div>
      <p dir="ltr" className="mt-[0.4cqw] text-center text-[1.8cqw] font-black text-neo-white tabular-nums">{shield}/{max}</p>
    </section>
  );
});
