'use client';

import { cn } from '@/lib/utils';
import styles from './holidayDaily.module.css';

interface Props {
  total: number;
  opened: number;
  today?: number | null;
  className?: string;
}

export default function HolidayGifts({ total, opened, today = null, className }: Props) {
  return (
    <ol className={cn('grid grid-cols-6 justify-items-center gap-1', className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <li key={i} className="relative h-8 w-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={i % 2 ? '/holidays/props-gift-blue.webp' : '/holidays/props-gift-red.webp'}
            alt=""
            width={256}
            height={256}
            className={cn('h-full w-full object-contain', i >= opened && i !== today && 'opacity-35 grayscale', i === today && styles.shake)}
          />
        </li>
      ))}
    </ol>
  );
}
