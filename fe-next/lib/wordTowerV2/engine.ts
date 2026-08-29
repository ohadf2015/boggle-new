/**
 * Word Tower v2 physics world.
 *
 * v1 had no physics: it classified a drop into perfect/good/sloppy and toppled
 * the tower on a counter (3 consecutive sloppy). The tower on screen was not the
 * tower being simulated, so failure was invisible until it happened.
 *
 * Here the blocks are real rigid bodies. A tower falls when its centre of mass
 * leaves its support polygon — which the player can see coming the whole time.
 * There is no topple counter anywhere in this file, by design.
 */
import { Bodies, Body, Composite, Engine, Events } from 'matter-js';

/**
 * Physics runs at a fixed 120Hz regardless of display refresh. 240Hz was tried
 * to soften landing impacts and changed nothing measurable, so it is not worth
 * double the solver cost.
 */
export const FIXED_DT_MS = 1000 / 120;

/** World scale. Tower height is reported in metres; physics thinks in pixels. */
export const PX_PER_M = 32;

/**
 * Matter expresses velocity per its own base delta (16.67ms), NOT per simulation
 * step — so converting our px/ms with FIXED_DT_MS silently halves every throw.
 * Keep this in sync with Matter's internal `Common._baseDelta`.
 */
const MATTER_BASE_DELTA_MS = 1000 / 60;

/**
 * Upper bound on substeps for one call. A backgrounded tab hands back a huge
 * delta; simulating all of it would block the main thread and produce an even
 * bigger delta next frame. We drop the excess rather than spiral.
 */
export const MAX_SUBSTEPS = 8;

/** Below these, a body is considered visually at rest (drives audio/particles). */
const REST_SPEED = 0.09;
const REST_ANGULAR_SPEED = 0.006;

/**
 * Rest must be SUSTAINED for this long. A rocking block passes through zero
 * speed at each extreme of its wobble, so an instantaneous check reports "at
 * rest" at the top of every rock — which would stutter landing audio and made
 * measured settle time move backwards as the wobble got bigger.
 */
const REST_HOLD_MS = 90;

/**
 * Downward speed (px/ms) above which a block is still falling and must not count
 * toward tower height. Deliberately loose: a settled block micro-jitters well
 * below this, so height stays stable, while a block in flight is excluded.
 */
const FALLING_VY = 0.25;

/** Height loss (in block heights) that counts as the tower having come down. */
const COLLAPSE_DROP_BLOCKS = 1.2;

/**
 * How long the height loss must persist before we call it a collapse. An impact
 * briefly jostles the block underneath out of "resting", which dips measured
 * height for ~100ms; a tower that actually fell stays down.
 */
const COLLAPSE_CONFIRM_MS = 350;

const GROUND_THICKNESS_PX = 120;
const GROUND_WIDTH_PX = 4000;

export interface SpawnSpec {
  id: string;
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  /** Lateral velocity inherited from the crane swing, px/ms. */
  vx: number;
  /**
   * Spawn hanging from the crane: a static body that follows the swing until
   * released. Making it a real body (rather than a DOM overlay) means the thing
   * the player aims with is the exact thing that gets simulated.
   */
  attached?: boolean;
}

export interface BlockSnapshot {
  id: string;
  x: number;
  y: number;
  angleRad: number;
  widthPx: number;
  heightPx: number;
  resting: boolean;
}

export interface WorldSnapshot {
  blocks: BlockSnapshot[];
  /** Height of the highest *settled* block, metres above ground. */
  towerHeightM: number;
  collapsed: boolean;
}

export interface TowerWorld {
  engine: Engine;
  blocks: Map<string, Body>;
  accumulatorMs: number;
  peakHeightPx: number;
  collapsed: boolean;
  /** Time the tower has continuously been below its peak, ms. */
  collapseHeldMs: number;
  /** Tallest block height seen, used to scale the collapse threshold. */
  tallestBlockPx: number;
  /** Matter body id -> block id, for resolving collision events. */
  bodyToId: Map<number, string>;
  /** Blocks that have touched something at least once. */
  landed: Set<string>;
  /** Per-block time spent continuously below the rest thresholds, ms. */
  restMs: Map<string, number>;
  /** Contacts observed since the last read — drives impact audio/particles. */
  pendingImpacts: Array<{ id: string; speed: number }>;
}

export interface CreateWorldOptions {
  seed: number;
}

/**
 * Ground sits with its top surface exactly at y=0, so "height above ground" is
 * just -y. Keeps every height calculation in this file a subtraction.
 */
function createGround(): Body {
  return Bodies.rectangle(0, GROUND_THICKNESS_PX / 2, GROUND_WIDTH_PX, GROUND_THICKNESS_PX, {
    isStatic: true,
    friction: 0.9,
    label: 'ground',
  });
}

export function createTowerWorld(_options: CreateWorldOptions): TowerWorld {
  const engine = Engine.create({
    // Stacked boxes need position iterations far above the default 6 or the
    // stack visibly sinks into itself under its own weight.
    positionIterations: 10,
    velocityIterations: 8,
    constraintIterations: 4,
    enableSleeping: false,
  });
  // Tuned, not guessed: t = sqrt(2h/a). A 300px fall should reach contact in
  // ~450ms (the Tower Bloxx drop weight), which needs ~2963 px/s^2. Matter reads
  // gravity.y in units of 0.001 px/ms^2, so 3.0 lands inside the target window.
  engine.gravity.y = 3.0;

  const world: TowerWorld = {
    engine,
    blocks: new Map(),
    accumulatorMs: 0,
    peakHeightPx: 0,
    collapsed: false,
    collapseHeldMs: 0,
    tallestBlockPx: 0,
    bodyToId: new Map(),
    landed: new Set(),
    restMs: new Map(),
    pendingImpacts: [],
  };

  Composite.add(engine.world, createGround());

  // A block only counts toward tower height once it has actually touched
  // something. Without this a block still in mid-air inflates the peak, and the
  // "collapse" check then fires the moment it lands.
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      for (const body of [pair.bodyA, pair.bodyB]) {
        const id = world.bodyToId.get(body.id);
        if (!id) continue;
        if (!world.landed.has(id)) world.landed.add(id);
        world.pendingImpacts.push({ id, speed: body.speed });
      }
    }
  });

  return world;
}

export function spawnBlock(world: TowerWorld, spec: SpawnSpec): Body {
  const body = Bodies.rectangle(spec.x, spec.y, spec.widthPx, spec.heightPx, {
    // High static friction is what lets a slightly-off block grip instead of
    // squirting out sideways. Restitution is small but NOT zero: at 0.02 a block
    // stopped dead the instant it touched, which reads as a sprite being
    // parented to the stack rather than a weight arriving.
    friction: 0.7,
    frictionStatic: 1.1,
    restitution: 0.16,
    density: 0.0016,
    slop: 0.02,
    label: `block:${spec.id}`,
  });

  if (spec.attached) {
    // Must be created dynamic and *then* made static. A body created with
    // isStatic:true has no stored original mass, so releasing it later restores
    // inverseMass 0 and every subsequent integration yields NaN.
    Body.setStatic(body, true);
  } else {
    Body.setVelocity(body, { x: spec.vx * MATTER_BASE_DELTA_MS, y: 0 });
  }

  world.blocks.set(spec.id, body);
  world.bodyToId.set(body.id, spec.id);
  world.tallestBlockPx = Math.max(world.tallestBlockPx, spec.heightPx);
  Composite.add(world.engine.world, body);

  return body;
}

/**
 * Current tower height in metres, without allocating a full snapshot. The crane
 * needs this every frame to hover above the tower; snapshotWorld builds an array
 * per block per call, which is wasteful at 60Hz.
 */
export function getTowerHeightM(world: TowerWorld): number {
  return towerHeightPx(world) / PX_PER_M;
}

/** Slide the hanging block along with the crane. No-op once released. */
export function moveAttachedBlock(world: TowerWorld, id: string, x: number, y: number): void {
  const body = world.blocks.get(id);
  if (!body || !body.isStatic) return;

  Body.setPosition(body, { x, y });
}

/**
 * Cut the block loose, handing it the crane's lateral momentum and a little of
 * its spin. The spin matters for feel: a block released dead-flat lands
 * dead-flat, and a stack of perfectly axis-aligned rectangles looks rendered
 * rather than simulated.
 */
export function releaseBlock(
  world: TowerWorld,
  id: string,
  /** px per millisecond, matching crane.ts. Converted to Matter's per-step units. */
  vx: number,
  /** radians per millisecond. */
  angularVel = 0,
): void {
  const body = world.blocks.get(id);
  if (!body) return;

  Body.setStatic(body, false);
  // Matter velocities are per-step, not per-ms. Passing px/ms straight through
  // threw every block sideways at 8.3x the intended speed.
  Body.setVelocity(body, { x: vx * MATTER_BASE_DELTA_MS, y: 0 });
  Body.setAngularVelocity(body, angularVel * MATTER_BASE_DELTA_MS);
}

function isSlow(body: Body): boolean {
  return body.speed < REST_SPEED && body.angularSpeed < REST_ANGULAR_SPEED;
}

function isResting(world: TowerWorld, id: string, body: Body): boolean {
  if (body.isSleeping || body.isStatic) return true;

  return (world.restMs.get(id) ?? 0) >= REST_HOLD_MS;
}

/**
 * Height of the tower, in pixels above ground.
 *
 * Counts a block once it has landed and is not currently falling. It must NOT be
 * defined over "resting" blocks: settled bodies micro-jitter above any rest
 * threshold you pick, so that definition reports a standing tower as 1 block
 * tall and the collapse check then fires on a perfectly intact stack.
 */
function towerHeightPx(world: TowerWorld): number {
  let highest = 0;

  for (const [id, body] of world.blocks) {
    if (!world.landed.has(id)) continue;
    if (body.velocity.y > FALLING_VY) continue;
    // bounds.min.y is the top edge; ground top is y=0 and up is negative.
    highest = Math.max(highest, -body.bounds.min.y);
  }

  return highest;
}

/**
 * Collapse is measured, not decided. If settled height falls more than about a
 * block below its running peak, the stack came down. Only *settled* blocks count
 * toward height, so a block still falling through the air never inflates the
 * peak and then fakes a collapse when it lands.
 */
function updateCollapse(world: TowerWorld, simulatedMs: number): void {
  const current = towerHeightPx(world);

  if (current > world.peakHeightPx) {
    world.peakHeightPx = current;
    world.collapseHeldMs = 0;
    return;
  }

  const threshold = world.tallestBlockPx * COLLAPSE_DROP_BLOCKS;

  if (world.peakHeightPx - current > threshold) {
    world.collapseHeldMs += simulatedMs;
    if (world.collapseHeldMs >= COLLAPSE_CONFIRM_MS) world.collapsed = true;
    return;
  }

  world.collapseHeldMs = 0;
}

/**
 * Advance the world by real elapsed milliseconds.
 * Returns the number of fixed substeps actually simulated.
 */
export function stepWorld(world: TowerWorld, elapsedMs: number): number {
  // Impacts describe the step that is about to run, so they are cleared here
  // rather than on read. Left uncleared this array grows for the whole session.
  world.pendingImpacts.length = 0;
  world.accumulatorMs += elapsedMs;

  const wanted = Math.floor(world.accumulatorMs / FIXED_DT_MS);
  const substeps = Math.min(wanted, MAX_SUBSTEPS);

  if (wanted > substeps) {
    // Dropped time. Better a visible skip than a death spiral.
    world.accumulatorMs = 0;
  } else {
    world.accumulatorMs -= substeps * FIXED_DT_MS;
  }

  for (let i = 0; i < substeps; i += 1) {
    Engine.update(world.engine, FIXED_DT_MS);
  }

  if (substeps > 0) {
    const simulatedMs = substeps * FIXED_DT_MS;

    for (const [id, body] of world.blocks) {
      world.restMs.set(id, isSlow(body) ? (world.restMs.get(id) ?? 0) + simulatedMs : 0);
    }

    updateCollapse(world, simulatedMs);
  }

  return substeps;
}

export function snapshotWorld(world: TowerWorld): WorldSnapshot {
  const blocks: BlockSnapshot[] = [];

  for (const [id, body] of world.blocks) {
    blocks.push({
      id,
      x: body.position.x,
      y: body.position.y,
      angleRad: body.angle,
      widthPx: body.bounds.max.x - body.bounds.min.x,
      heightPx: body.bounds.max.y - body.bounds.min.y,
      resting: isResting(world, id, body),
    });
  }


  return {
    blocks,
    towerHeightM: towerHeightPx(world) / PX_PER_M,
    collapsed: world.collapsed,
  };
}
