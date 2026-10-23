/** Which of the foe's art frames the arena shows. Pure — no Pixi. */

export type FoePose = 'idle' | 'windup' | 'lunge' | 'hurt' | 'dead';
export type FoeFrame = 'idle' | 'attack' | 'hurt' | 'enraged';

/** Extra frames load after the first paint; until they arrive the idle frame stands in. */
export interface FoeFramesLoaded { attack: boolean; enraged: boolean }

export function pickFoeFrame(pose: FoePose, phase: 0 | 1 | 2, loaded: FoeFramesLoaded): FoeFrame {
  if (pose === 'hurt' || pose === 'dead') return 'hurt';
  if ((pose === 'windup' || pose === 'lunge') && loaded.attack) return 'attack';
  if (phase === 2 && loaded.enraged) return 'enraged';
  return 'idle';
}
