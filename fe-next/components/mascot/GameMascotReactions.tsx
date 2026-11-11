'use client';

import { useEffect, useRef } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BlastMascotHud } from '@/components/blast/legacy/BlastMascotHud';
import { useBlastMascot } from '@/lib/blast/useBlastMascot';
import { useMascotEnabled } from '@/lib/blast/useMascotEnabled';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { trackGrowthEvent } from '@/utils/growthTracking';

interface GameMascotReactionsProps {
  mode: string;
  comboLevel: number;
}

export function GameMascotReactions({ mode, comboLevel }: GameMascotReactionsProps) {
  const mascot = useBlastMascot();
  const pref = useMascotEnabled();
  const [reducedEffects] = useReducedEffects();

  const prevCombo = useRef(comboLevel);
  useEffect(() => {
    if (comboLevel > prevCombo.current) emitMascotEvent({ kind: 'combo-milestone', level: comboLevel });
    prevCombo.current = comboLevel;
  }, [comboLevel]);

  const show = mascot.visible && pref.enabled && !reducedEffects;
  useEffect(() => {
    if (show) trackGrowthEvent('mascot_reaction_shown', { state: mascot.state, mode });
  }, [show, mascot.state, mode]);

  return (
    <AdaptiveAnimatePresence>
      {show && (
        <AdaptiveMotion.div
          key="game-mascot"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className="absolute top-[calc(env(safe-area-inset-top,0px)+2.75rem)] end-[4.25rem] sm:top-3 sm:end-3 z-50 pointer-events-none [&_*]:pointer-events-none"
        >
          <BlastMascotHud state={mascot.state} />
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
