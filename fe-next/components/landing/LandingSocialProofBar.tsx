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

interface LandingSocialProofBarProps {
  activePlayers: number;
  gamesToday: number;
  gameModes: number;
  languages: number;
}

export function LandingSocialProofBar({
  activePlayers,
  gamesToday,
}: LandingSocialProofBarProps) {
  const { t } = useLanguage();

  const pills: { label: string; value: number }[] = [];

  // Only show dynamic, meaningful stats
  if (activePlayers > 10) {
    pills.push({ label: t('landing.activePlayers'), value: activePlayers });
  }
  if (gamesToday > 100) {
    pills.push({ label: t('landing.gamesToday'), value: gamesToday });
  }

  if (pills.length === 0) return null;

  return (
    <motion.div
      className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 sm:gap-x-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      {pills.map((pill, i) => (
        <motion.div
          key={pill.label}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="inline-flex items-center gap-1.5 cursor-default text-neo-white/70"
        >
          <AnimatedNumber value={pill.value} className="font-black text-lg sm:text-xl text-neo-white" />
          <span className="text-sm sm:text-base font-medium">{pill.label}</span>
          {i < pills.length - 1 && (
            <span className="text-neo-white/20 ms-2 sm:ms-4 hidden sm:inline" aria-hidden="true">·</span>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
