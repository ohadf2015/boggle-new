'use client';

import Image from 'next/image';
import type { MotionProps } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

export type PracticeMascotMood = 'idle' | 'cheer' | 'wrong' | 'celebrate';

interface Props {
  mode: PracticeMode;
  reaction: PracticeMascotMood;
}

const MASCOT_FOR_MODE: Record<PracticeMode, string> = {
  classic: '/mascot/scholar.webp',
  wordHunt: '/mascot/explorer.webp',
  wheelRush: '/mascot/dj.webp',
};

/**
 * Variant maps for AdaptiveMotion. We keep the idle case "barely alive" (slow
 * scale breathing) so the companion looks present without competing with the
 * gameplay surface. Reactions are short bursts that settle back to idle —
 * implemented as keyframe arrays so the bounce/shake/spin returns to the same
 * neutral pose.
 *
 * Typed via `MotionProps['animate']` so framer-motion's strict `Easing` literal
 * union accepts our ease names without `as const` (which would freeze the
 * keyframe arrays as readonly and break a different motion constraint).
 */
const REACTION_VARIANTS: Record<PracticeMascotMood, MotionProps['animate']> = {
  idle: {
    scale: [1, 1.04, 1],
    transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
  },
  cheer: {
    y: [0, -10, 0],
    scale: [1, 1.15, 1],
    transition: { duration: 0.45, ease: 'easeOut' },
  },
  wrong: {
    x: [0, -6, 6, -4, 4, 0],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
  celebrate: {
    rotate: [0, -12, 12, -8, 8, 0],
    scale: [1, 1.25, 1.1, 1.18, 1],
    transition: { duration: 0.9, ease: 'easeOut' },
  },
};

/**
 * Floating mascot companion for the sandbox. Bottom-end-corner so it doesn't
 * collide with the board or the chain CTA stack. aria-hidden because it's
 * pure decoration — the live-region feedback elsewhere already announces
 * word-found / wrong-word to screen readers.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §11.
 */
export default function PracticeMascotReaction({ mode, reaction }: Props) {
  const variant = REACTION_VARIANTS[reaction];
  return (
    <div
      data-testid="practice-mascot-reaction"
      data-reaction={reaction}
      aria-hidden="true"
      className="pointer-events-none absolute bottom-3 end-3 z-10 w-12 h-12"
    >
      <AdaptiveMotion.div
        key={reaction}
        animate={variant}
        className="relative w-full h-full rounded-full border-2 border-neo-black overflow-hidden bg-neo-navy/90 shadow-hard-sm"
      >
        <Image
          src={MASCOT_FOR_MODE[mode]}
          alt=""
          fill
          sizes="48px"
          className="object-contain"
          draggable={false}
        />
      </AdaptiveMotion.div>
    </div>
  );
}
