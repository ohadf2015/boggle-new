/**
 * The one-way command channel into the arena canvas. Pure — no Pixi, no React.
 *
 * React owns combat state; the canvas owns a rAF loop that must not re-mount on
 * every tick. So state changes are compiled into a small append-only queue of
 * commands that the loop drains, exactly like `TowerFx` in wordTowerV2.
 */
import type { AttackEffect, CombatFx } from '@/lib/adventure/play/combat';

export type ArenaCommand =
  /** A word landed: letters fly off the board and the last one is the blow. */
  | { kind: 'cast'; id: number; word: string; power: number }
  /** The foe is winding up: charge the hand for `ms`. */
  | { kind: 'windup'; id: number; color: number; ms: number; effect: AttackEffect }
  /** The wind-up released: lunge, and the hero takes it (or blocks). */
  | { kind: 'strike'; id: number; color: number; blocked: boolean; heartsLost: number }
  | { kind: 'interrupt'; id: number }
  | { kind: 'phase'; id: number }
  | { kind: 'heal'; id: number }
  | { kind: 'death'; id: number; gold: number; relic: boolean };

/** Attack colours, as Pixi numbers (the DOM side keeps the hex twins in IntentDial). */
const COLOR: Record<AttackEffect, number> = {
  hit: 0xff3366,
  freeze: 0x22d3ee,
  curse: 0xa855f7,
  projectile: 0xff8a00,
  shuffle: 0xfacc15,
  drain: 0xff3366,
};

export const effectColor = (e: AttackEffect): number => COLOR[e] ?? 0xffffff;

/** Every fx that means "the foe just swung", mapped to the colour it swings in. */
const SWING: Partial<Record<CombatFx, AttackEffect>> = {
  hit: 'hit', drain: 'drain', freeze: 'freeze', curse: 'curse', shuffle: 'shuffle', projectile: 'projectile',
};

/**
 * The swings that actually cost the hero a heart — the ones `hurt()` handles.
 * NOT `'damage'`: that fx is the ENEMY losing HP to a word, so reading it as
 * "the player was hurt" meant the -N ♥ float never fired in a real fight.
 * 'freeze'/'shuffle' only touch the board, and a 'projectile' is still in the
 * air — its heart arrives later as its own 'hit'.
 */
const COSTS_HP = new Set<CombatFx>(['hit', 'drain', 'curse']);

interface Ctx {
  /** Hearts the player lost on this step (0 when blocked or when the board took it). */
  heartsLost: number;
  gold: number;
  relic: boolean;
}

/** One entry of the hook's combat fx feed — every fx a single step produced. */
export interface FxEntry {
  id: number;
  fx: readonly CombatFx[];
}

/**
 * Drain the fx feed into commands.
 *
 * Read the RAW feed, never the stamped banner: `statusFor` picks ONE `StatusId`
 * per step and 'projectile' is not one of them, so a world-2 fireball reached
 * the arena as nothing at all — the foe wound up and then simply stopped.
 * `sinceId` is the last id already turned into a command; a feed that restarts
 * at 1 for a new fight is handled by comparing against each entry, not a total.
 */
export function commandsFromFeed(
  feed: readonly FxEntry[],
  sinceId: number,
  ctx: Ctx,
): { cmds: ArenaCommand[]; lastId: number } {
  if (!feed.length) return { cmds: [], lastId: sinceId };
  const newest = feed[feed.length - 1].id;
  // A fresh fight rewinds the feed; anything at or below the cursor is old.
  const from = newest < sinceId ? 0 : sinceId;
  const cmds: ArenaCommand[] = [];
  for (const e of feed) {
    if (e.id <= from) continue;
    const cmd = commandFromFx(e.id, e.fx, ctx);
    if (cmd) cmds.push(cmd);
  }
  return { cmds, lastId: Math.max(from, newest) };
}

/**
 * The ONE command a combat step earns, or null. Death wins over everything —
 * a killing blow that also froze a tile is a death, not a freeze.
 */
export function commandFromFx(id: number, fx: readonly CombatFx[], ctx: Ctx): ArenaCommand | null {
  if (fx.includes('defeated')) return { kind: 'death', id, gold: ctx.gold, relic: ctx.relic };
  if (fx.includes('interrupt')) return { kind: 'interrupt', id };
  if (fx.includes('phase')) return { kind: 'phase', id };
  if (fx.includes('blocked') || fx.includes('deflect')) {
    return { kind: 'strike', id, color: COLOR.hit, blocked: true, heartsLost: 0 };
  }
  const swung = (Object.keys(SWING) as CombatFx[]).find((f) => fx.includes(f));
  if (swung) {
    const effect = SWING[swung]!;
    return { kind: 'strike', id, color: COLOR[effect], blocked: false, heartsLost: COSTS_HP.has(swung) ? ctx.heartsLost : 0 };
  }
  if (fx.includes('heal') || fx.includes('revive')) return { kind: 'heal', id };
  return null;
}
