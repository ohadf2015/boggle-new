'use client';

import { useEffect, useRef } from 'react';
import { m, useInView, useMotionValue, useSpring, animate } from 'framer-motion';
import { Users, Flame, Gamepad2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

/** Animated counter that ticks up when scrolled into view */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 200, damping: 30 });
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      if (ref.current) ref.current.textContent = value.toLocaleString();
      return;
    }
    const controls = animate(motionVal, value, { duration: 1.2 });
    return controls.stop;
  }, [isInView, value, motionVal]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
    });
    return unsub;
  }, [spring]);

  return <span ref={ref} className={cn('tabular-nums', className)}>0</span>;
}

const STAT_ICONS = [Users, Flame, Gamepad2, Globe] as const;
const STAT_COLORS = [
  'border-neo-pink bg-neo-pink/10',
  'border-neo-orange bg-neo-orange/10',
  'border-neo-cyan bg-neo-cyan/10',
  'border-neo-lime bg-neo-lime/10',
] as const;
const STAT_ICON_COLORS = [
  'text-neo-pink',
  'text-neo-orange',
  'text-neo-cyan',
  'text-neo-lime',
] as const;

interface LandingSocialProofBarProps {
  activePlayers: number;
  gamesToday: number;
  gameModes: number;
  languages: number;
}

export function LandingSocialProofBar({
  activePlayers,
  gamesToday,
  gameModes,
  languages,
}: LandingSocialProofBarProps) {
  const { t } = useLanguage();

  const pills: { label: string; value: number; iconIdx: number }[] = [];

  if (activePlayers > 10) {
    pills.push({ label: t('landing.activePlayers'), value: activePlayers, iconIdx: 0 });
  }
  if (gamesToday > 100) {
    pills.push({ label: t('landing.gamesToday'), value: gamesToday, iconIdx: 1 });
  }

  // Only show static stats when at least one dynamic stat is visible
  if (pills.length > 0) {
    if (gameModes > 0) {
      pills.push({ label: t('landing.gameModes'), value: gameModes, iconIdx: 2 });
    }
    if (languages > 0) {
      pills.push({ label: t('landing.languages'), value: languages, iconIdx: 3 });
    }
  }

  if (pills.length === 0) return null;

  return (
    <m.div
      className="flex flex-wrap justify-center items-stretch gap-3 sm:gap-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      {pills.map((pill) => {
        const Icon = STAT_ICONS[pill.iconIdx];
        return (
          <m.div
            key={pill.label}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.9, rotate: -3 },
              visible: { opacity: 1, y: 0, scale: 1, rotate: 0 },
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            whileHover={{ y: -4, scale: 1.05, rotate: 1, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
            className={cn(
              'inline-flex items-center gap-2.5 px-4 py-2.5 lg:px-5 lg:py-3',
              'border-3 border-neo-black rounded-neo shadow-hard-sm',
              'cursor-default select-none',
              STAT_COLORS[pill.iconIdx],
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-neo border-2 border-neo-black',
              'flex items-center justify-center shrink-0',
              'bg-neo-navy/80',
            )}>
              <Icon className={cn('w-4 h-4', STAT_ICON_COLORS[pill.iconIdx])} aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <AnimatedNumber value={pill.value} className="font-black text-lg sm:text-xl lg:text-2xl text-neo-white leading-tight" />
              <span className="text-[10px] sm:text-xs font-bold text-neo-white uppercase tracking-wider leading-tight">
                {pill.label}
              </span>
            </div>
          </m.div>
        );
      })}
    </m.div>
  );
}
