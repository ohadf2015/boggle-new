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

// ── After a crash: what is still up ─────────────────────────────────────────

export interface IdBlock extends RiskBlock {
  id: string;
}

const upright = (b: RiskBlock) => tiltOf(b.angleRad) < TILT_FAIL_RAD;
const bottomOf = (b: RiskBlock) => b.y + b.heightPx / 2;
const topOf = (b: RiskBlock) => b.y - b.heightPx / 2;

/**
 * The floors still standing, ground floor first: an upright floor on the
 * street, then each upright floor sitting ON the one below it (touching, and
 * overlapping sideways). Slabs lying in the street next to the building and
 * anything above a knocked-over floor are not part of it. With `baseId`, the
 * chain must start from that floor (the run's real first floor), so a slab
 * that fell flat on the street is never mistaken for the building.
 */
export function standingChain(blocks: IdBlock[], baseId?: string): string[] {
  const sorted = [...blocks].filter(upright).sort((a, b) => b.y - a.y);
  const grounded = sorted.filter((b) => Math.abs(bottomOf(b)) < b.heightPx * 0.6 && (!baseId || b.id === baseId));
  let best: IdBlock[] = [];
  for (const start of grounded) {
    const chain = [start];
    for (;;) {
      const top = chain[chain.length - 1];
      const next = sorted.find(
        (b) =>
          !chain.includes(b) &&
          Math.abs(bottomOf(b) - topOf(top)) < top.heightPx * 0.5 &&
          Math.abs(b.x - top.x) < (b.widthPx + top.widthPx) / 2,
      );
      if (!next) break;
      chain.push(next);
    }
    if (chain.length > best.length) best = chain;
  }
  return best.map((b) => b.id);
}

/** Signed sideways lean: centre of the load above the ground floor minus the ground floor's centre (px). */
export function towerLean(blocks: RiskBlock[]): number {
  const stack = column(blocks);
  if (stack.length < 2) return 0;
  let mass = 0;
  let moment = 0;
  for (const f of stack.slice(1)) {
    mass += f.widthPx;
    moment += f.widthPx * f.x;
  }
  return moment / mass - stack[0].x;
}

/**
 * A floor that landed on the far side of a lean and pulled the load back over
 * the base. `offset` is where it landed relative to the ground floor's centre.
 */
export function isCounterweight(leanBefore: number, leanAfter: number, offset: number, baseHalfW: number): boolean {
  if (Math.abs(leanBefore) < baseHalfW * 0.15) return false;
  if (Math.sign(offset) !== -Math.sign(leanBefore)) return false;
  return Math.abs(leanAfter) <= Math.abs(leanBefore) * 0.6;
}
