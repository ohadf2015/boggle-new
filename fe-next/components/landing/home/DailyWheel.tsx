'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CUBE_BLUR_DATA_URL } from '@/lib/landing/modeMeta';
import styles from './DailyWheel.module.css';

const DAILY_ART = '/modes/cubes/daily.png';
const RADIUS_PCT = 39;

/** The daily's letter wheel around its mascot. Decorative: the hero link carries the label. */
export function DailyWheel({ className }: { className?: string }) {
  const { t, dir } = useLanguage();
  const letters = Array.from(t('landing.home.wheelWord'));
  const step = 360 / Math.max(letters.length, 1);
  const turn = dir === 'rtl' ? -1 : 1;

  return (
    <div data-testid="daily-wheel" aria-hidden="true" className={cn('relative aspect-square [container-type:inline-size]', className)}>
      <span className={cn('absolute inset-[11%] rounded-full', styles.rim)} />
      <span className="absolute inset-[24%] overflow-hidden rounded-full border-[3px] border-black bg-neo-yellow/90 shadow-hard">
        <span className={cn('absolute inset-0 block', styles.core)}>
          <Image
            src={DAILY_ART}
            alt=""
            fill
            placeholder="blur"
            blurDataURL={CUBE_BLUR_DATA_URL}
            sizes="160px"
            className="scale-125 object-contain drop-shadow-[0_3px_0_rgba(0,0,0,0.5)]"
          />
        </span>
      </span>
      {letters.map((ch, i) => {
        const a = ((-90 + turn * i * step) * Math.PI) / 180;
        return (
          <span
            key={`${ch}-${i}`}
            data-wheel-tile
            style={
              {
                '--i': i,
                left: `${(50 + RADIUS_PCT * Math.cos(a)).toFixed(2)}%`,
                top: `${(50 + RADIUS_PCT * Math.sin(a)).toFixed(2)}%`,
              } as CSSProperties
            }
            className={cn(
              'absolute flex h-[23%] w-[23%] items-center justify-center rounded-[22%] border-[2.5px] border-black bg-neo-navy font-neo-display text-[10cqi] font-black uppercase leading-none text-neo-cream shadow-hard-sm',
              styles.tile,
            )}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}
