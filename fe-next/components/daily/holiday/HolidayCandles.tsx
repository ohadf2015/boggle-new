'use client';

import { cn } from '@/lib/utils';
import styles from './holidayDaily.module.css';

interface Props {
  total: number;
  lit: number;
  newest?: number | null;
  glow?: ReadonlySet<number>;
  className?: string;
}

export default function HolidayCandles({ total, lit, newest = null, glow, className }: Props) {
  return (
    <ol className={cn('flex items-end justify-center gap-1', className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const on = i < lit;
        return (
          <li key={i} className="relative flex w-5 flex-col items-center">
            <span className={cn('mb-0.5 h-4', !on && 'invisible')}>
              <span className={cn(styles.flameShape, styles.flame, i === newest && styles.ignite)} />
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/holidays/props-candle.webp"
              alt=""
              width={88}
              height={256}
              className={cn('h-10 w-auto', !on && 'opacity-35 grayscale', glow?.has(i) && 'drop-shadow-[0_0_6px_var(--neo-holiday-gold)]')}
            />
          </li>
        );
      })}
    </ol>
  );
}
