'use client';

import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Trophy, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { bossImage, bossNameKey } from './bossArt';
import { CompactBossOutcome } from './CompactBossOutcome';

const HITTER_DISC = ['bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-pink'];

/**
 * The round's boss outcome on results, read from the server's final status (defeated vs escaped) so the
 * projector and every phone say the same thing. Only a defeat earns a trophy. The health bar drains from
 * full to what the boss ran off with (transform only; reduced motion paints the end state).
 */
export function BossOutcomeCard({ size, density, className }: { size: 'tv' | 'phone'; density?: 'compact'; className?: string }) {
  const { t } = useLanguage();
  const reduce = !!useReducedMotion();
  const view = useClassroomBossStore((s) => s.view);
  if (!view || (view.status !== 'defeated' && view.status !== 'escaped')) return null;
  const won = view.status === 'defeated';
  const name = t(bossNameKey(view.bossId));
  const tv = size === 'tv';
  const left = won || !view.maxHp ? 0 : Math.max(0, Math.min(1, view.hp / view.maxHp));
  const hitters = (view.topHitters ?? []).slice(0, 3);
  if (density === 'compact') return <CompactBossOutcome view={view} name={name} left={left} hitters={hitters} reduce={reduce} className={className} />;

  return (
    <section
      data-testid="boss-outcome"
      data-outcome={view.status}
      className={cn(
        'mx-auto flex w-full rounded-neo-lg border-[3px] border-neo-black shadow-hard-lg',
        won ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-white',
        tv ? 'max-w-[1800px] flex-row items-center gap-6 px-6 py-4 min-[2200px]:gap-10 min-[2200px]:px-10' : 'max-w-md flex-col gap-2.5 p-3',
        className,
      )}
    >
      <div className={cn('flex min-w-0 items-center', tv ? 'flex-1 gap-5' : 'gap-3')}>
        <span
          className={cn(
            'relative shrink-0 overflow-hidden rounded-neo border-[3px] border-neo-black bg-neo-purple-dark shadow-hard-sm',
            won ? 'rotate-3' : '-rotate-3',
            tv ? 'size-28 min-[2200px]:size-40' : 'size-14'
          )}
        >
          <Image src={bossImage(view.bossId, won ? 'defeated' : 'enraged')} alt="" fill sizes={tv ? '160px' : '56px'} className="object-cover object-top" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('flex items-center gap-2 font-neo-display font-black uppercase leading-none', tv ? 'text-3xl 2xl:text-5xl min-[2200px]:text-7xl' : 'text-lg')}>
            {won ? (
              <Trophy className={cn('shrink-0', tv ? 'size-10 2xl:size-12' : 'size-5')} aria-hidden="true" />
            ) : (
              <Wind className={cn('shrink-0 text-neo-pink', tv ? 'size-10 2xl:size-12' : 'size-5')} aria-hidden="true" />
            )}
            <span dir="auto" className="min-w-0 line-clamp-2 leading-tight">{won ? t('classroomBoss.defeated', { name }) : t('classroomBoss.escaped', { name })}</span>
          </p>
          <p className={cn('font-neo-body font-bold', tv ? 'mt-1.5 text-xl 2xl:text-2xl min-[2200px]:text-4xl' : 'mt-0.5 text-sm', won ? 'text-neo-black/85' : 'text-neo-white/85')}>
            {t('classroomBoss.dealtPct', { pct: view.pctDealt })}
          </p>
          <div className={cn('flex items-center gap-3', tv ? 'mt-3' : 'mt-2')}>
            <div
              aria-hidden="true"
              className={cn('relative min-w-0 flex-1 overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy', tv ? 'h-5 2xl:h-6' : 'h-3')}
            >
              <m.div
                className="absolute inset-0 origin-left bg-neo-pink rtl:origin-right"
                initial={reduce ? false : { scaleX: 1 }}
                animate={{ scaleX: left }}
                transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.4 }}
              />
            </div>
            {!won && (
              <span data-testid="boss-hp-left" className={cn('shrink-0 font-neo-display font-black tabular-nums text-neo-pink', tv ? 'text-xl 2xl:text-2xl' : 'text-xs')}>
                {t('classroomBoss.hpLeft', { pct: Math.round(left * 100) })}
              </span>
            )}
            {view.staggers > 0 && (
              <span
                data-testid="boss-staggers"
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-neo border-[2px] border-neo-black bg-neo-cyan font-neo-display font-black text-neo-black',
                  tv ? 'px-2.5 py-1 text-lg 2xl:text-xl' : 'px-1.5 py-0.5 text-xs'
                )}
              >
                <ShieldCheck className={tv ? 'size-5' : 'size-3.5'} aria-hidden="true" />
                {t('eduResultsV3.bossStaggers', { count: view.staggers })}
              </span>
            )}
          </div>
        </div>
      </div>

      {hitters.length > 0 && (
        <div className={cn('min-w-0', tv ? 'w-[min(34%,30rem)] shrink-0 border-s-[3px] border-neo-black/30 ps-6' : 'border-t-2 border-neo-black/20 pt-2')}>
          <p className={cn('font-neo-display font-black uppercase tracking-widest', tv ? 'mb-2 text-base 2xl:text-lg' : 'mb-1 text-[11px]', won ? 'text-neo-black/75' : 'text-neo-cream/80')}>
            {t('classroomBoss.topHitters')}
          </p>
          <ol className={cn('flex', tv ? 'flex-col gap-1.5' : 'flex-wrap gap-x-3 gap-y-1')}>
            {hitters.map((h, i) => (
              <li key={h.username} data-testid="boss-top-hitter" data-username={h.username} className="flex min-w-0 items-center gap-2">
                <span className={cn('grid shrink-0 place-items-center rounded-full border-[2px] border-neo-black font-neo-display font-black text-neo-black', HITTER_DISC[i], tv ? 'size-8 text-base' : 'size-5 text-[11px]')}>
                  {i + 1}
                </span>
                <span dir="auto" className={cn('min-w-0 truncate font-neo-display font-black', tv ? 'text-xl 2xl:text-2xl' : 'text-sm')}>{h.username}</span>
                <span className={cn('ms-auto shrink-0 font-neo-body font-bold tabular-nums', tv ? 'text-lg 2xl:text-xl' : 'text-xs', won ? 'text-neo-black/75' : 'text-neo-cream/80')}>
                  {t('eduResultsV3.bossDamage', { dmg: h.dmg })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
