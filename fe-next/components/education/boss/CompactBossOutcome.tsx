'use client';

import Image from 'next/image';
import { m } from 'framer-motion';
import { ShieldCheck, Trophy, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { bossImage } from './bossArt';

interface CompactBossOutcomeProps {
  view: ClassroomBossView;
  name: string;
  left: number;
  hitters: Array<{ username: string; dmg: number }>;
  reduce: boolean;
  className?: string;
}

/** The teacher wall's boss verdict: one calm strip so the round results under it keep the height. */
export function CompactBossOutcome({ view, name, left, hitters, reduce, className }: CompactBossOutcomeProps) {
  const { t } = useLanguage();
  const won = view.status === 'defeated';
  const Icon = won ? Trophy : Wind;

  return (
    <section
      data-testid="boss-outcome"
      data-outcome={view.status}
      data-density="compact"
      className={cn(
        'flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2 text-neo-cream',
        '@5xl/results:flex-nowrap @5xl/results:gap-x-6 @5xl/results:px-4 @[96rem]/results:py-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 basis-full items-center gap-3 @5xl/results:basis-auto">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-neo border-2 border-neo-cream/60 bg-neo-navy @5xl/results:size-12 @[96rem]/results:size-16">
          <Image src={bossImage(view.bossId, won ? 'defeated' : 'enraged')} alt="" fill sizes="64px" className="object-cover object-top" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-neo-display text-lg font-black leading-tight @5xl/results:text-2xl @[96rem]/results:text-3xl">
            <Icon className="size-[0.9em] shrink-0" aria-hidden="true" />
            <span dir="auto" className="min-w-0">
              {won ? t('classroomBoss.defeated', { name }) : t('classroomBoss.escaped', { name })}
            </span>
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-neo-body text-sm font-bold text-neo-cream/85 @5xl/results:text-base @[96rem]/results:text-lg">
              {t('classroomBoss.dealtPct', { pct: view.pctDealt })}
            </p>
            {!won && (
              <div className="flex items-center gap-2">
                <div
                  aria-hidden="true"
                  className="relative h-3 w-24 shrink-0 overflow-hidden rounded-full border-2 border-neo-cream/60 bg-neo-navy @[96rem]/results:h-4 @[96rem]/results:w-40"
                >
                  <m.div
                    className="absolute inset-0 origin-left bg-neo-cream rtl:origin-right"
                    initial={reduce ? false : { scaleX: 1 }}
                    animate={{ scaleX: left }}
                    transition={{
                      type: 'spring',
                      stiffness: 60,
                      damping: 16,
                      delay: 0.4,
                    }}
                  />
                </div>
                <span data-testid="boss-hp-left" className="shrink-0 font-neo-display text-sm font-black tabular-nums @[96rem]/results:text-lg">
                  {t('classroomBoss.hpLeft', { pct: Math.round(left * 100) })}
                </span>
              </div>
            )}
            {view.staggers > 0 && (
              <span
                data-testid="boss-staggers"
                className="inline-flex shrink-0 items-center gap-1 rounded-neo border-2 border-neo-cream/60 px-1.5 py-0.5 font-neo-display text-xs font-black @[96rem]/results:text-base"
              >
                <ShieldCheck className="size-3.5 @[96rem]/results:size-4" aria-hidden="true" />
                {t('eduResultsV3.bossStaggers', { count: view.staggers })}
              </span>
            )}
          </div>
        </div>
      </div>

      {hitters.length > 0 && (
        <div className="flex min-w-0 basis-full items-center gap-2 @5xl/results:shrink-0 @5xl/results:basis-auto">
          <p className="shrink-0 font-neo-body text-sm font-bold text-neo-cream/80 @[96rem]/results:text-base">{t('classroomBoss.topHitters')}</p>
          <ol className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 @5xl/results:flex-nowrap">
            {hitters.map((h, i) => (
              <li key={h.username} data-testid="boss-top-hitter" data-username={h.username} className="flex min-w-0 items-center gap-1.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-neo-cream/60 font-neo-display text-[11px] font-black @[96rem]/results:size-6 @[96rem]/results:text-sm">
                  {i + 1}
                </span>
                <span dir="auto" className="min-w-0 font-neo-display text-sm font-black @[96rem]/results:text-lg">
                  {h.username}
                </span>
                <span className="shrink-0 font-neo-body text-xs font-bold tabular-nums text-neo-cream/80 @[96rem]/results:text-base">
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
