'use client';

import { m, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { resolvePreset } from '@/lib/education/motion/presets';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

export interface PopProps {
  children: ReactNode;
  /** Change it to replay the 1 → 1.2 → 1 emphasis pulse. */
  pulseKey?: string | number;
  className?: string;
}

export function Pop({ children, pulseKey, className = '' }: PopProps) {
  const reduced = useEduReducedMotion();
  const controls = useAnimationControls();
  const firstPulse = useRef(true);

  useEffect(() => {
    const pop = resolvePreset('popIn', reduced);
    void controls.start({ ...pop.animate, transition: pop.transition });
  }, [controls, reduced]);

  useEffect(() => {
    if (firstPulse.current) {
      firstPulse.current = false;
      return;
    }
    if (reduced) return;
    const pulse = resolvePreset('pulse', false);
    void controls.start({ ...pulse.animate, transition: pulse.transition });
  }, [pulseKey, reduced, controls]);

  return (
    <m.span className={`inline-block ${className}`} initial={resolvePreset('popIn', reduced).initial} animate={controls}>
      {children}
    </m.span>
  );
}
