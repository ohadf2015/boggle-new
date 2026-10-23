'use client';

/**
 * The foe's health: one continuous bar with a yellow "ghost" that trails the
 * red fill (so a big word reads as a big bite), notches where the foe changes
 * phase (66% / 33%), and the exact number. Shared by the arena HUD and the
 * reduced-motion stage so the two can never drift apart.
 */
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { hpPercent, notchesPassed, PHASE_NOTCHES } from './bossView';

interface Props {
  hp: number;
  max: number;
  /** 0 | 1 | 2 — the foe's current phase; later phases burn hotter. */
  phase: 0 | 1 | 2;
  className?: string;
}

const FILL = ['bg-neo-red', 'bg-neo-orange', 'bg-neo-pink'] as const;

export default function BossHpBar({ hp, max, phase, className }: Props) {
  const { t } = useLanguageSafe();
  const pct = hpPercent(hp, max);
  const passed = notchesPassed(hp, max);
  return (
    <div className={cn('relative h-4 rounded-md border-2 border-black bg-black/70 overflow-hidden', phase === 2 && 'shadow-[0_0_0_2px_var(--neo-pink)]', className)}
      role="progressbar" aria-label={t('adventurePlay.combat.enemyHp')} aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp}>
      <div aria-hidden className="absolute inset-y-0 start-0 bg-neo-yellow transition-[width] duration-700 delay-300 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }} />
      <div aria-hidden className={cn('absolute inset-y-0 start-0 transition-[width] duration-200 motion-reduce:transition-none', FILL[phase])}
        style={{ width: `${pct}%` }} />
      {PHASE_NOTCHES.map((n, i) => (
        <span key={n} aria-hidden className={cn('absolute inset-y-0 w-[3px] -ms-px border-x border-black', i < passed ? 'bg-black/80' : 'bg-neo-cream')}
          style={{ insetInlineStart: `${n}%` }} />
      ))}
      <span aria-hidden className="absolute inset-0 grid place-items-center text-[10px] font-black leading-none tabular-nums text-white [text-shadow:1px_1px_0_#000,-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000]">
        {Math.ceil(hp)}/{max}
      </span>
    </div>
  );
}
