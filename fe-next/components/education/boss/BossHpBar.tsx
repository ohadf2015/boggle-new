'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import styles from './boss.module.css';

const SEGMENTS = 10;

interface BossHpBarProps {
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  size: 'stage' | 'strip';
  label?: string;
}

/** Fighting-game HP: the fill drops at once, a pale "chip damage" ghost trails it so every hit reads as a chunk. */
export const BossHpBar = memo(function BossHpBar({ hp, maxHp, phase, size, label }: BossHpBarProps) {
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const pct = Math.round(ratio * 100);
  const fill = phase === 3 ? 'bg-neo-red' : phase === 2 ? 'bg-neo-pink' : 'bg-neo-lime';
  const stage = size === 'stage';
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      data-testid="boss-hp-bar"
      className={cn(
        'relative w-full overflow-hidden bg-neo-abyss-deep',
        stage ? 'h-[3.4cqw] rounded-[0.5cqw] border-[0.3cqw] border-neo-black shadow-hard-xl' : 'h-4 rounded-full border-2 border-neo-cream/60',
      )}
    >
      <div className={cn('absolute inset-0 bg-neo-cream', styles.hpGhost)} style={{ transform: `scaleX(${ratio})` }} aria-hidden="true" />
      <div className={cn('absolute inset-0', fill, styles.hpFill)} style={{ transform: `scaleX(${ratio})` }} />
      {stage && <div className="absolute inset-x-0 top-0 h-[38%] bg-neo-white/25" aria-hidden="true" />}
      <div className="absolute inset-0 flex" aria-hidden="true">
        {Array.from({ length: SEGMENTS - 1 }, (_, i) => (
          <span key={i} className={cn('flex-1 border-e-neo-black/60', stage ? 'border-e-[0.15cqw]' : 'border-e-2')} />
        ))}
        <span className="flex-1" />
      </div>
      <span
        dir="ltr"
        className={cn(
          'absolute inset-y-0 end-[1%] flex items-center font-neo-display font-black leading-none text-neo-white tabular-nums',
          stage ? 'text-[2.2cqw] [text-shadow:0.15cqw_0.15cqw_0_#000]' : 'text-[10px] [text-shadow:1px_1px_0_#000]',
        )}
      >
        {pct}%
      </span>
    </div>
  );
});
