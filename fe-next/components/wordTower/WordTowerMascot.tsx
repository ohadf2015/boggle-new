'use client';

import { useEffect, useRef, useState } from 'react';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import type { ApplyResult } from '@/lib/wordTower/wordTowerManager';
import { idleMascotPose, reactionMascotPose, ERROR_MASCOT_POSE, type TowerMascotPose } from '@/lib/wordTower/mascotPose';

interface WordTowerMascotProps {
  biomeId: WordTowerBiomeId;
  /** Bumps on each accepted word → triggers a cheer pose. */
  resultKey: number;
  /** Bumps on each rejected word → triggers a brief sulk. */
  errorKey: number;
  lastResult: ApplyResult | null;
  reducedMotion?: boolean;
}

const REACTION_MS = 1300;
const ERROR_MS = 900;

/**
 * The brand climb companion — a small LexiClash mascot that floats beside the
 * build line and travels up with you (replacing the old construction crane, which
 * read as generic builder-game IP). Its resting pose shifts by altitude band and
 * it reacts to word events: a trophy on a good word, cosmic awe on a skyscraper,
 * a quick kawaii cry on a rejected word. Purely decorative (`pointer-events-none`,
 * `aria-hidden`); idle motion is suppressed under reduced-motion.
 */
export function WordTowerMascot({ biomeId, resultKey, errorKey, lastResult, reducedMotion }: WordTowerMascotProps) {
  const [pose, setPose] = useState<TowerMascotPose>(() => idleMascotPose(biomeId));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armRevert = (ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPose(idleMascotPose(biomeId)), ms);
  };

  // Settle to the biome's resting pose whenever the altitude band changes.
  useEffect(() => { setPose(idleMascotPose(biomeId)); }, [biomeId]);

  // Cheer on each accepted word, then relax back to idle.
  useEffect(() => {
    if (resultKey === 0) return;
    setPose(reactionMascotPose(lastResult?.tier ?? 'none'));
    armRevert(REACTION_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [resultKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Brief sulk on a rejected word.
  useEffect(() => {
    if (errorKey === 0) return;
    setPose(ERROR_MASCOT_POSE);
    armRevert(ERROR_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [errorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="pointer-events-none absolute end-[5%] top-[7%] z-[1] transition-transform duration-700 ease-out"
      aria-hidden
    >
      <InteractiveMascot variant={pose} size="lg" animated={!reducedMotion} clipShape="none" priority={false} />
    </div>
  );
}
