'use client';

/**
 * Gold pill that counts up to `value` (from `from` on mount) and bumps when it
 * grows. The coin burst flies into `anchorRef`.
 */
import { useEffect, useRef, useState, type Ref } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { COIN_ART } from './art';
import { cn } from '@/lib/utils';

export function useCountUp(target: number, { from = target, delayMs = 0, durationMs = 900 } = {}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? target : from);
  const shownRef = useRef(shown);
  useEffect(() => {
    if (reduce) { shownRef.current = target; setShown(target); return; }
    const start = shownRef.current;
    if (start === target) return;
    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / durationMs);
      const v = Math.round(start + (target - start) * (1 - (1 - p) ** 3));
      shownRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const id = setTimeout(() => { raf = requestAnimationFrame(tick); }, delayMs);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, [target, reduce, delayMs, durationMs]);
  return shown;
}

interface Props {
  value: number;
  from?: number;
  delayMs?: number;
  durationMs?: number;
  anchorRef?: Ref<HTMLSpanElement>;
  size?: 'sm' | 'lg';
  className?: string;
}

export default function GoldCounter({ value, from, delayMs, durationMs, anchorRef, size = 'sm', className }: Props) {
  const { t } = useLanguageSafe();
  const shown = useCountUp(value, { from, delayMs, durationMs });
  const counting = shown !== value;
  return (
    <motion.span
      animate={counting ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.25, repeat: counting ? Infinity : 0 }}
      className={cn('inline-flex items-center gap-1 rounded-full border-[3px] border-black bg-black/70 font-neo-display font-bold tabular-nums text-neo-yellow shadow-[2px_2px_0_#000]',
        size === 'lg' ? 'px-3 py-1 text-2xl' : 'px-2 py-0.5 text-sm', className)}
      aria-label={t('adventurePlay.gold', { gold: value })}
    >
      <span ref={anchorRef} className="grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
        <img src={COIN_ART} alt="" className={size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'} draggable={false} />
      </span>
      <span aria-hidden>{shown}</span>
    </motion.span>
  );
}
