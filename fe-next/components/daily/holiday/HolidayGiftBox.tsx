'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { reducedMotion, spawnBurst } from './holidayBurst';
import styles from './holidayDaily.module.css';

type Phase = 'wrapped' | 'shaking' | 'open';

interface Props {
  length: number;
  found: boolean;
  word?: string;
  onOpened?: () => void;
  className?: string;
  style?: CSSProperties;
}

export default function HolidayGiftBox({ length, found, word, onOpened, className, style }: Props) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>(found ? 'open' : 'wrapped');
  const boxRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(found);
  const onOpenedRef = useRef(onOpened);
  useEffect(() => {
    onOpenedRef.current = onOpened;
  });

  useEffect(() => {
    if (!found || openedRef.current) return;
    openedRef.current = true;
    if (reducedMotion()) {
      setPhase('open');
      onOpenedRef.current?.();
      return;
    }
    setPhase('shaking');
    const id = window.setTimeout(() => {
      setPhase('open');
      const el = boxRef.current;
      if (el) spawnBurst(el, el.offsetWidth / 2, el.offsetHeight / 3, 'confetti', 18);
      onOpenedRef.current?.();
    }, 1200);
    return () => window.clearTimeout(id);
  }, [found]);

  return (
    <div
      ref={boxRef}
      data-testid="holiday-gift-box"
      data-phase={phase}
      role="status"
      style={style}
      className={cn(
        'pointer-events-none relative flex items-center gap-2 rounded-xl border-[3px] border-black bg-neo-navy-light px-2 py-1 text-neo-white shadow-hard-sm',
        className,
      )}
    >
      <span className="relative block h-10 w-10 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/holidays/props-gift-red.webp"
          alt=""
          width={236}
          height={256}
          className={cn('h-full w-full object-contain', phase === 'shaking' && styles.shake, phase === 'open' && styles.lidOff)}
        />
        {phase === 'open' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/holidays/props-star.webp" alt="" width={233} height={236} className={cn('absolute inset-1 object-contain', styles.pop)} />
        )}
      </span>
      <span className="font-neo-display text-xs font-bold leading-tight">
        {phase === 'open'
          ? t('holiday.daily.giftOpened', 'Gift unwrapped: {word}!', { word: word ?? '' })
          : t('holiday.daily.giftHidden', 'A {count}-letter gift is hidden', { count: length })}
      </span>
    </div>
  );
}
