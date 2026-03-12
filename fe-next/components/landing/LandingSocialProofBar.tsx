'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, animate } from 'framer-motion';
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

interface SocialProofPill {
  label: string;
  value: number;
  bg: string;
}

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

  const pills: SocialProofPill[] = [];

  // Static — always show
  pills.push({ label: t('landing.gameModes'), value: gameModes, bg: 'bg-neo-lime' });
  pills.push({ label: t('landing.languages'), value: languages, bg: 'bg-neo-purple text-neo-white' });

  // Dynamic — threshold gated
  if (gamesToday > 100) {
    pills.push({ label: t('landing.gamesToday'), value: gamesToday, bg: 'bg-neo-pink text-neo-white' });
  }
  if (activePlayers > 10) {
    pills.push({ label: t('landing.activePlayers'), value: activePlayers, bg: 'bg-neo-cyan' });
  }

  if (pills.length < 2) return null;

  return (
    <motion.div
      className="flex flex-wrap justify-center gap-2 sm:gap-3"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      {pills.map((pill) => (
        <motion.div
          key={pill.label}
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.8 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.08, rotate: 2 }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2',
            'border-2 border-neo-black shadow-hard-sm rounded-neo',
            'font-bold text-sm sm:text-base text-neo-black cursor-default',
            pill.bg
          )}
        >
          <AnimatedNumber value={pill.value} className="font-black text-lg sm:text-xl" />
          <span>{pill.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
