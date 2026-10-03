'use client';

/** The Boss Battle verdict above the finale: the class felled it, or it got away with N HP. */

import { cn } from '@/lib/utils';
import type { VocabQuizBoss } from '@/shared/types/vocabQuiz';
import { BOSS_ART } from './ClassroomBossBar';

type T = (key: string, params?: Record<string, string | number>) => string;

export function ClassroomBossOutcome({ boss, compact = false, t }: { boss: VocabQuizBoss | null; compact?: boolean; t: T }) {
  if (!boss) return null;
  const won = boss.defeated;
  return (
    <section
      data-testid="boss-outcome"
      data-outcome={won ? 'defeated' : 'escaped'}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-neo border-[3px] border-neo-black shadow-hard-lg',
        won ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-cream',
        compact ? 'p-2' : 'p-3 md:gap-5 md:p-3 md:[@media(min-height:1000px)]:p-4'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- transparent boss art */}
      <img
        src={won ? BOSS_ART.defeated : BOSS_ART.idle}
        alt=""
        aria-hidden="true"
        className={cn('shrink-0 select-none object-contain drop-shadow-[3px_3px_0_#000]', compact ? 'size-14' : 'size-20 md:[@media(min-height:1000px)]:size-32')}
      />
      <div className="min-w-0">
        <h3 className={cn('font-neo-display font-black uppercase leading-none', compact ? 'text-xl' : 'text-2xl md:text-4xl md:[@media(min-height:1000px)]:text-5xl')}>
          {t(won ? 'eg2Modes.boss.defeatedTitle' : 'eg2Modes.boss.escapedTitle')}
        </h3>
        <p className={cn('mt-1 font-neo-body font-bold', compact ? 'text-xs' : 'text-sm md:text-lg md:[@media(min-height:1000px)]:text-xl')}>
          {won ? t('eg2Modes.boss.defeatedBody') : t('eg2Modes.boss.escapedBody', { hp: boss.hp })}
        </p>
      </div>
    </section>
  );
}

export default ClassroomBossOutcome;
