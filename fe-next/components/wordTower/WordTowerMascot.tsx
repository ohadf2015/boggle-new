'use client';

import { useRef } from 'react';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import { useTimedReveal } from '@/lib/wordTower/useTimedReveal';
import type { ApplyResult } from '@/lib/wordTower/wordTowerManager';
import { reactionMascotPose } from '@/lib/wordTower/mascotPose';

interface WordTowerMascotProps {
  /** Bumps on each accepted word. */
  resultKey: number;
  lastResult: ApplyResult | null;
  reducedMotion?: boolean;
}

/** How long the mascot stays on-screen after a notable word is built. */
const REVEAL_MS = 1500;

/**
 * The brand climb companion — a small, circular LexiClash mascot that pops in
 * beside the build line to cheer. Founder ask (2026-07-17): it was popping on
 * EVERY drop, which — alongside the confetti — buried the physics/drop feel in
 * celebration noise. It now only appears for a NOTABLE build (a long-enough word
 * that earns a tier: high-rise / tall / skyscraper); ordinary short drops stay
 * quiet so the crane + landing physics are the star. Purely decorative
 * (`pointer-events-none`, `aria-hidden`); the pop is suppressed under
 * reduced-motion (it simply appears/disappears).
 */
export function WordTowerMascot({ resultKey, lastResult, reducedMotion }: WordTowerMascotProps) {
  // Gate the reveal to notable results only: advance the key the reveal watches
  // just for tiered (long) words, so a plain drop never triggers the companion.
  const notableKeyRef = useRef(0);
  const notable = resultKey > 0 && !!lastResult && lastResult.tier !== 'none';
  if (notable) notableKeyRef.current = resultKey;
  const visible = useTimedReveal(notableKeyRef.current, REVEAL_MS);
  if (!visible) return null;

  const pose = reactionMascotPose(lastResult?.tier ?? 'none');

  return (
    // top-44 (176px) clears the restructured top chrome (buttons row + altitude
    // row end ~140px) on phone AND desktop — at the old top-[9%] the cheer pose
    // popped straight over the altitude pill on 844px-tall phones (2026-07-02).
    <div
      className={`pointer-events-none absolute end-[4%] top-44 z-[1] ${reducedMotion ? '' : 'animate-neo-pop'}`}
      aria-hidden
    >
      <InteractiveMascot
        variant={pose}
        size="sm"
        animated={!reducedMotion}
        clipShape="circle"
        clipBorder="pink"
        clipBg="bg-neo-navy"
        priority={false}
      />
    </div>
  );
}
