'use client';

import { m, useAnimationControls, type TargetAndTransition } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSkipAnimations } from './AdaptiveMotion';

export type MascotRigState = 'idle' | 'hop' | 'cheer' | 'sad' | 'wiggle';

const REACTIONS: Record<Exclude<MascotRigState, 'idle'>, TargetAndTransition> = {
  hop: {
    y: [0, 2, -22, 0, 0],
    scaleX: [1, 1.08, 0.94, 1.06, 1],
    scaleY: [1, 0.9, 1.08, 0.94, 1],
    transition: { duration: 0.55, times: [0, 0.15, 0.45, 0.75, 1], ease: 'easeOut' },
  },
  cheer: {
    y: [0, -18, 0, -12, 0],
    rotate: [0, -6, 0, 6, 0],
    scaleY: [1, 1.06, 0.95, 1.04, 1],
    transition: { duration: 0.8, ease: 'easeInOut' },
  },
  sad: {
    y: [0, 4, 4, 0],
    scaleY: [1, 0.94, 0.94, 1],
    rotate: [0, -4, -4, 0],
    transition: { duration: 0.9, times: [0, 0.25, 0.8, 1] },
  },
  wiggle: { rotate: [0, -8, 8, -6, 6, 0], transition: { duration: 0.5 } },
};

export interface MascotRigProps {
  state?: MascotRigState;
  play?: number;
  className?: string;
  children: ReactNode;
}

export function MascotRig({ state = 'idle', play = 0, className, children }: MascotRigProps) {
  const skip = useSkipAnimations();
  const controls = useAnimationControls();

  useEffect(() => {
    if (skip || state === 'idle') return;
    void controls.start(REACTIONS[state]);
  }, [skip, state, play, controls]);

  return (
    <div data-testid="mascot-rig" data-state={state} className={cn('inline-block', !skip && 'neo-mascot-idle', className)}>
      {skip ? children : (
        <m.div animate={controls} className="origin-bottom">
          {children}
        </m.div>
      )}
    </div>
  );
}
