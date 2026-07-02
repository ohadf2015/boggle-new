'use client';

import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import { useTimedReveal } from '@/lib/wordTower/useTimedReveal';
import type { ApplyResult } from '@/lib/wordTower/wordTowerManager';
import { reactionMascotPose } from '@/lib/wordTower/mascotPose';

interface WordTowerMascotProps {
  /** Bumps on each accepted word → the mascot pops in to cheer, then tucks away. */
  resultKey: number;
  lastResult: ApplyResult | null;
  reducedMotion?: boolean;
}

/** How long the mascot stays on-screen after a word is built. */
const REVEAL_MS = 1500;

/**
 * The brand climb companion — a small, circular LexiClash mascot that pops in
 * beside the build line ONLY when you complete a word (founder: the old mascot
 * was huge and always on-screen). It cheers based on word quality, then tucks
 * away. Purely decorative (`pointer-events-none`, `aria-hidden`); the pop is
 * suppressed under reduced-motion (it simply appears/disappears).
 */
export function WordTowerMascot({ resultKey, lastResult, reducedMotion }: WordTowerMascotProps) {
  const visible = useTimedReveal(resultKey, REVEAL_MS);
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
