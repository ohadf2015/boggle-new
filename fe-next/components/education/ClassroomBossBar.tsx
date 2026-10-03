'use client';

// Paints the server's boss numbers only (VocabQuizBoss, answerResult.bossHit) — never computes them (Class 3).

import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VocabQuizBoss } from '@/shared/types/vocabQuiz';

type T = (key: string, params?: Record<string, string | number>) => string;

export const BOSS_ART = {
  idle: '/images/bosses/boss-lexicon-dragon.png',
  hurt: '/images/bosses/boss-lexicon-dragon-hurt.png',
  defeated: '/images/bosses/boss-lexicon-dragon-defeated.png',
} as const;

export interface ClassroomBossBarProps {
  boss: VocabQuizBoss | null;
  phase: string;
  surface: 'host' | 'student';
  /** Student only: the damage the server credited to this phone's answer. */
  myHit?: number | null;
  t: T;
}

export function ClassroomBossBar({ boss, phase, surface, myHit = null, t }: ClassroomBossBarProps) {
  if (!boss) return null;
  const host = surface === 'host';
  const fraction = boss.maxHp > 0 ? Math.round((boss.hp / boss.maxHp) * 100) / 100 : 0;
  const hitNow = phase === 'reveal' && boss.lastHits > 0;
  const art = boss.defeated ? BOSS_ART.defeated : hitNow ? BOSS_ART.hurt : BOSS_ART.idle;
  const low = fraction <= 0.25;

  return (
    <section
      data-testid="boss-bar"
      className={cn(
        'relative flex shrink-0 items-center gap-3 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard',
        host ? 'p-2 md:gap-5 md:p-3' : 'p-1.5'
      )}
    >
      <span className={cn('relative shrink-0', host ? 'size-16 md:size-28' : 'size-12')}>
        {/* eslint-disable-next-line @next/next/no-img-element -- transparent boss art */}
        <img
          key={`${phase}-${boss.hp}`}
          data-testid="boss-art"
          src={art}
          alt=""
          aria-hidden="true"
          className={cn(
            'size-full select-none object-contain drop-shadow-[3px_3px_0_#000]',
            hitNow && 'motion-safe:animate-[combo-shake_0.5s_ease-in-out]'
          )}
        />
        {hitNow && (
          <span
            data-testid="boss-hit-pop"
            aria-hidden="true"
            dir="ltr"
            className={cn(
              'absolute -end-2 -top-2 rotate-6 rounded-neo border-[2px] border-neo-black bg-neo-lime px-1.5 font-neo-display font-black leading-tight text-neo-black shadow-hard-sm motion-safe:animate-[neo-pop-in_0.35s_ease-out]',
              host ? 'text-lg md:text-3xl' : 'text-sm'
            )}
          >
            −{boss.lastHits}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('inline-flex items-center gap-1.5 truncate font-neo-display font-black uppercase text-neo-pink', host ? 'text-base md:text-2xl' : 'text-xs')}>
            <Swords className={host ? 'size-4 md:size-6' : 'size-3.5'} strokeWidth={3} aria-hidden="true" />
            {t('eg2Modes.boss.dragon')}
          </span>
          <span data-testid="boss-hp-text" className={cn('shrink-0 font-neo-display font-black tabular-nums text-neo-cream', host ? 'text-sm md:text-xl' : 'text-[0.7rem]')}>
            {t('eg2Modes.boss.hp', { hp: boss.hp, max: boss.maxHp })}
          </span>
        </div>
        <div
          role="meter"
          aria-valuemin={0}
          aria-valuemax={boss.maxHp}
          aria-valuenow={boss.hp}
          aria-label={t('eg2Modes.boss.dragon')}
          className={cn('mt-1 w-full overflow-hidden rounded-full border-[2px] border-neo-cream bg-neo-navy', host ? 'h-4 md:h-7' : 'h-3')}
        >
          <span
            data-testid="boss-hp-fill"
            data-fraction={String(fraction)}
            className={cn(
              'block h-full w-full origin-left rounded-full transition-transform duration-700 ease-out rtl:origin-right',
              low ? 'bg-neo-orange' : 'bg-neo-pink'
            )}
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
        {host && hitNow && (
          <p className="mt-1 font-neo-body text-sm font-bold text-neo-lime md:text-lg">{t('eg2Modes.boss.classHits', { hits: boss.lastHits })}</p>
        )}
        {!host && phase === 'reveal' && myHit !== null && (
          <p data-testid="boss-my-hit" className={cn('mt-1 font-neo-body text-xs font-bold', myHit > 0 ? 'text-neo-lime' : 'text-neo-cream/80')}>
            {myHit > 1
              ? t('eg2Modes.boss.yourCrit', { hits: myHit })
              : myHit === 1
                ? t('eg2Modes.boss.yourHit', { hits: myHit })
                : t('eg2Modes.boss.noHit')}
          </p>
        )}
      </div>
    </section>
  );
}

export default ClassroomBossBar;
