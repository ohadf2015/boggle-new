'use client';

import Image from 'next/image';
import { Trophy, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { bossImage, bossNameKey } from './bossArt';

/**
 * The round's boss outcome on results, read from the server's final status (defeated vs escaped) so the
 * projector and every phone say the same thing. Only a defeat earns a trophy.
 */
export function BossOutcomeCard({ size, className }: { size: 'tv' | 'phone'; className?: string }) {
  const { t } = useLanguage();
  const view = useClassroomBossStore((s) => s.view);
  if (!view || (view.status !== 'defeated' && view.status !== 'escaped')) return null;
  const won = view.status === 'defeated';
  const name = t(bossNameKey(view.bossId));
  const tv = size === 'tv';
  return (
    <section
      data-testid="boss-outcome"
      data-outcome={view.status}
      className={cn(
        'mx-auto flex w-full items-center gap-3 rounded-neo border-[3px] border-neo-black shadow-hard-lg',
        won ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-white',
        tv ? 'max-w-5xl gap-6 px-8 py-4' : 'max-w-md px-3 py-2',
        className,
      )}
    >
      <span className={cn('relative shrink-0 overflow-hidden rounded-[10px] border-2 border-neo-black bg-neo-purple-dark', tv ? 'size-28' : 'size-12')}>
        <Image src={bossImage(view.bossId, won ? 'defeated' : 'enraged')} alt="" fill sizes={tv ? '112px' : '48px'} className="object-cover object-top" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('flex items-center gap-2 font-neo-display font-black uppercase leading-tight', tv ? 'text-5xl' : 'text-base')}>
          {won ? <Trophy className={cn('shrink-0', tv ? 'size-12' : 'size-5')} aria-hidden="true" /> : <Wind className={cn('shrink-0 text-neo-pink', tv ? 'size-12' : 'size-5')} aria-hidden="true" />}
          <span dir="auto" className="min-w-0">{won ? t('classroomBoss.defeated', { name }) : t('classroomBoss.escaped', { name })}</span>
        </p>
        <p className={cn('font-bold', tv ? 'mt-1 text-[44px] leading-tight' : 'text-sm', won ? 'text-neo-black/80' : 'text-neo-white/80')}>
          {t('classroomBoss.dealtPct', { pct: view.pctDealt })}
        </p>
      </div>
    </section>
  );
}
