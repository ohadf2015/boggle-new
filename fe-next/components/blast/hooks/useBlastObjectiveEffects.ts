/**
 * useBlastObjectiveEffects — extracted objective completion tracking from BlastGame.
 * Handles hidden objective bonuses, score flies, screen shakes, and wave-clear celebration.
 */

import { useEffect, useRef } from 'react';
import { formatObjectiveLabel } from '../utils/blastObjectiveUtils';
import type { ScoreFlyEvent } from '../BlastScoreFly';
import type { BlastObjectiveProgress } from '../types';

const HIDDEN_OBJECTIVE_BONUS = 25;
const TARGET_WORD_BONUS = 50;
const COLOR_POWER_BONUS = 30;

interface ObjectiveEffectsDeps {
  objectives: {
    objectiveProgress: BlastObjectiveProgress[];
    allObjectivesComplete: boolean;
  };
  engine: {
    addBonusScore: (amount: number) => void;
  };
  sounds: {
    playWaveClear: () => void;
  };
  t: (key: string) => string;
  setScoreFlyEvents: React.Dispatch<React.SetStateAction<ScoreFlyEvent[]>>;
  setComboFlash: (flash: { id: string; tier: 1 | 2 | 3 } | null) => void;
  setComboTypeName: (name: string | undefined) => void;
  setExplosionShake: (intensity: number) => void;
  setWaveClearParticle: React.Dispatch<React.SetStateAction<number>>;
  explosionShakeTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  flyIdRef: React.RefObject<number>;
}

export function useBlastObjectiveEffects(deps: ObjectiveEffectsDeps) {
  const {
    objectives, engine, sounds, t,
    setScoreFlyEvents, setComboFlash, setComboTypeName,
    setExplosionShake, setWaveClearParticle,
    explosionShakeTimerRef, flyIdRef,
  } = deps;

  // Track individual objective completions — hidden objectives give surprise bonus score
  const completedObjRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    objectives.objectiveProgress.forEach((obj, i) => {
      if (obj.isComplete && !completedObjRef.current.has(i)) {
        completedObjRef.current.add(i);
        const isHidden = obj.objective.type !== 'clear_percent';
        if (isHidden) {
          // Determine bonus amount based on objective type
          let bonusAmount = HIDDEN_OBJECTIVE_BONUS;
          if (obj.objective.type === 'target_word') {
            bonusAmount = TARGET_WORD_BONUS;
          } else if (obj.objective.type === 'color_power') {
            bonusAmount = COLOR_POWER_BONUS;
          }

          engine.addBonusScore(bonusAmount);
          const flyId = `obj-bonus-${flyIdRef.current!++}`;
          setScoreFlyEvents(prev => [...prev.slice(-2), {
            id: flyId,
            score: bonusAmount,
            startX: 50,
            startY: 30,
            tier: 2,
            tileType: obj.objective.tileType || undefined,
          }]);
          setComboFlash({ id: flyId, tier: 2 });
          setComboTypeName(formatObjectiveLabel(obj.objective, t));
          if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
          setExplosionShake(2);
          explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(0), 500);
        } else {
          if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
          setExplosionShake(1);
          explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(0), 400);
        }
      }
    });
  }, [objectives.objectiveProgress, engine, t, setScoreFlyEvents, setComboFlash, setComboTypeName, setExplosionShake, explosionShakeTimerRef, flyIdRef]);

  // Play wave-clear sound once when ALL objectives are met
  const waveClearPlayedRef = useRef(false);
  useEffect(() => {
    if (objectives.allObjectivesComplete && !waveClearPlayedRef.current) {
      sounds.playWaveClear();
      setWaveClearParticle(c => c + 1);
      if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
      setExplosionShake(3);
      explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(0), 600);
      waveClearPlayedRef.current = true;
    }
  }, [objectives.allObjectivesComplete, sounds, setWaveClearParticle, setExplosionShake, explosionShakeTimerRef]);
}
