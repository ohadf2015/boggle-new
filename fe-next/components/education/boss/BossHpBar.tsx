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

export const BossHpBar = memo(function BossHpBar({ hp, maxHp, phase, size, label }: BossHpBarProps) {
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const pct = Math.round(ratio * 100);
  const fill = phase === 3 ? 'bg-neo-red' : phase === 2 ? 'bg-neo-pink' : 'bg-neo-lime';
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      data-testid="boss-hp-bar"
      className={cn(
        'relative w-full overflow-hidden border-neo-cream/60 bg-neo-abyss-deep',
        size === 'stage' ? 'h-[2.6vw] rounded-[0.6vw] border-[0.25vw] shadow-hard-xl' : 'h-4 rounded-full border-2',
      )}
    >
      <div className={cn('absolute inset-0', fill, styles.hpFill)} style={{ transform: `scaleX(${ratio})` }} />
      <div className="absolute inset-0 flex" aria-hidden="true">
        {Array.from({ length: SEGMENTS - 1 }, (_, i) => (
          <span key={i} className="flex-1 border-e-2 border-neo-black/70" />
        ))}
        <span className="flex-1" />
      </div>
      {size === 'strip' && (
        <span dir="ltr" className="absolute inset-y-0 end-1.5 flex items-center text-[10px] font-black leading-none text-neo-white [text-shadow:1px_1px_0_#000] tabular-nums">
          {pct}%
        </span>
      )}
    </div>
  );
});
