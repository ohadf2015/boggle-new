/**
 * How close the tower is to falling — the HUD's stability meter. Pure.
 *
 * DISPLAY ONLY. `world.collapsed` stays the one authority on a run ending;
 * this just reads the same snapshot the run loop already takes and says how
 * worried the player should be.
 *
 * Two ways a stack goes over, and the meter shows the worse:
 *  - LOAD off its support: for each floor, the width-weighted centre of
 *    everything resting on it, measured against its half-width. 1 = the load
 *    is over the edge. A tower that walks sideways a little per floor scores on
 *    the whole lean, not just the last step.
 *  - TILT: a floor rocked or landed crooked.
 *
 * ponytail: static geometry only, no velocities. A stack mid-wobble reads by
 * its current pose; add angular speed if the meter ever feels late.
 */

export interface RiskBlock {
  x: number;
  /** Centre y, Matter convention (grows DOWN). */
  y: number;
  widthPx: number;
  heightPx: number;
  angleRad: number;
  /** Welded by a rebar crate: it cannot move, and it carries what sits on it. */
  fixed?: boolean;
}

export type StabilityBand = 'steady' | 'wobbly' | 'danger';

/** A floor tilted this far reads as falling. ~20 degrees. */
const TILT_FAIL_RAD = 0.35;

/** Rectangles are symmetric: 180 degrees is flat again. Folded to 0..pi/2. */
const tiltOf = (a: number) => Math.abs(Math.atan(Math.tan(a)));

/**
 * The tower itself, lowest floor first: a chain where each floor is higher
 * than the last and overlaps it. The longest chain wins, so a missed slab lying
 * on the street beside the building is never mistaken for part of it.
 */
function column(blocks: RiskBlock[]): RiskBlock[] {
  const sorted = [...blocks].sort((a, b) => b.y - a.y);
  let best: RiskBlock[] = [];
  for (let s = 0; s < sorted.length; s++) {
    const chain = [sorted[s]];
    for (let i = s + 1; i < sorted.length; i++) {
      const top = chain[chain.length - 1];
      const b = sorted[i];
      const higher = b.y < top.y - top.heightPx / 2;
      const overlaps = Math.abs(b.x - top.x) < (b.widthPx + top.widthPx) / 2;
      if (higher && overlaps) chain.push(b);
    }
    if (chain.length > best.length) best = chain;
  }
  return best;
}

/** 0 = rock steady, 1 = going over. */
export function towerRisk(blocks: RiskBlock[]): number {
  const stack = column(blocks);
  if (stack.length < 2) return 0;

  let risk = 0;
  for (let i = 0; i < stack.length; i++) {
    const f = stack[i];
    if (!f.fixed) risk = Math.max(risk, tiltOf(f.angleRad) / TILT_FAIL_RAD);
    // The load on floor i: every floor above it, up to the first weld (a welded
    // floor holds itself — nothing above it presses down past it).
    let mass = 0;
    let moment = 0;
    for (let j = i + 1; j < stack.length && !stack[j].fixed; j++) {
      mass += stack[j].widthPx;
      moment += stack[j].widthPx * stack[j].x;
    }
    if (mass > 0) risk = Math.max(risk, Math.abs(moment / mass - f.x) / (f.widthPx / 2));
  }
  return Math.min(1, risk);
}

export function stabilityBand(risk: number): StabilityBand {
  if (risk >= 0.7) return 'danger';
  if (risk >= 0.35) return 'wobbly';
  return 'steady';
}
