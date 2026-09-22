/**
 * Roguelike run state — a chained, HMAC-signed token (no DB migration).
 * /start verifies + applies the pick, /complete advances it on a win.
 * Server-trusted: relics, offers, gold, step. Client-reported (ponytail, beta):
 * HP left, potions used, death.
 */
import { signPayload, verifyPayload } from './attemptToken';
import { makeRng } from './rng';
import {
  RELICS, RELIC_IDS, POTION_IDS, isPotionId, maxHpFor, draftSize, goldMult,
  type RelicId, type PotionId, type Rarity,
} from './relics';

export type OfferItem =
  | { type: 'relic'; id: RelicId }
  | { type: 'potion'; id: PotionId }
  | { type: 'heal'; amount: number }
  | { type: 'gold'; amount: number };

/**
 * v2 = the run carries its position on the act map (`node` + `path`) instead of
 * a bare level number. v1 tokens are rejected outright; the client answers the
 * `run_version` code by dropping its stored run and starting a fresh one.
 * v3 = uniform map rows collapse to one node, so v2 node ids (`r0l2`) no longer
 * exist on the map their seed rebuilds — reject them the same way.
 */
export const RUN_VERSION = 3;

export interface RunPayload {
  v: number;
  u: string;
  w: number;
  /** Depth: how many map nodes this run has entered (1-based, for HUD copy). */
  step: number;
  /** Current map node id, or null before the first row is chosen. */
  node: string | null;
  /** Node ids entered so far, in order. */
  path: string[];
  hp: number;
  maxHp: number;
  relics: RelicId[];
  potions: Record<PotionId, number>;
  gold: number;
  seed: string;
  offer?: OfferItem[];
  /** Rest-site upgrades: bonus max HP and bonus hint charges. */
  bhp?: number;
  bh?: number;
  /** Shop offer indices already bought at the CURRENT node (cleared on move). */
  bought?: number[];
  /**
   * How many relics the run held when it stepped onto the CURRENT node. A shop
   * draws its stock from the relics the run does not own, so without this mark
   * every purchase re-rolled the shelf the player was still standing at.
   */
  sr?: number;
}

export type PublicRun = Omit<RunPayload, 'u' | 'seed'>;

const DOMAIN = 'run';

export const signRun = (run: RunPayload, secret: string) => signPayload(run, secret, DOMAIN);

export function verifyRun(token: unknown, secret: string): RunPayload | null {
  const run = verifyPayload<RunPayload>(token, secret, DOMAIN);
  if (!run || run.v !== RUN_VERSION || !Array.isArray(run.path)) return null;
  return run;
}

/** Max HP = relic value + every rest-site upgrade taken. */
export const maxHpOf = (run: Pick<RunPayload, 'relics' | 'bhp'>) => maxHpFor(run.relics) + (run.bhp ?? 0);
export const hintBonusOf = (run: Pick<RunPayload, 'bh'>) => run.bh ?? 0;

/** Re-derive max HP after relics or upgrades change, carrying current HP by the same delta. */
function withMaxHp(run: RunPayload): RunPayload {
  const maxHp = maxHpOf(run);
  return { ...run, maxHp, hp: Math.max(0, Math.min(maxHp, run.hp + (maxHp - run.maxHp))) };
}

/** Rest site: +1 max HP (heals 1) or +1 hint charge. */
export function restUpgrade(run: RunPayload, upgrade: 'maxHp' | 'hint'): RunPayload {
  if (upgrade === 'hint') return { ...run, bh: hintBonusOf(run) + 1 };
  return withMaxHp({ ...run, bhp: (run.bhp ?? 0) + 1 });
}

/** Deduct a price, or null when the run cannot afford it (gold never goes negative). */
export function spendGold(run: RunPayload, price: number): RunPayload | null {
  const cost = Math.max(0, Math.floor(Number(price) || 0));
  if (run.gold < cost) return null;
  return { ...run, gold: run.gold - cost };
}

/** Step onto a map node: it becomes current, joins the path, and clears shop purchases. */
export function enterNode(run: RunPayload, id: string): RunPayload {
  const path = [...run.path, id];
  const next: RunPayload = { ...run, node: id, path, step: Math.max(1, path.length), sr: run.relics.length };
  delete next.bought;
  return next;
}

export function publicRun(run: RunPayload): PublicRun {
  const { u: _u, seed: _s, ...rest } = run;
  return rest;
}

const emptyPotions = (): Record<PotionId, number> => ({ heal: 0, time: 0, cleanse: 0, insight: 0 });

/**
 * A new run. `carry` is the previous run (already verified): its relics and
 * potions come along so a new run — after a death, or into the next world —
 * does not throw the haul away. Hearts, map, gold and rest upgrades start over.
 */
export function freshRun(world: number, userId: string, seed: string, carry?: Pick<RunPayload, 'relics' | 'potions'>): RunPayload {
  const relics = carry ? [...carry.relics] : [];
  const potions = { ...emptyPotions(), ...carry?.potions };
  potions.heal = Math.max(1, potions.heal);
  const maxHp = maxHpFor(relics);
  return {
    v: RUN_VERSION, u: userId, w: world, step: 1, node: null, path: [],
    hp: maxHp, maxHp, relics, potions, gold: 0, seed,
  };
}

/** Gold for a cleared level — before the gold-tooth multiplier. */
export const goldForScore = (score: number) => 5 + Math.floor(Math.max(0, score) / 10);

/**
 * Every gold GAIN goes through here, so "+50% gold" means all of it — chest,
 * event and draft-card gold included. It used to apply to level-clear rewards
 * only, which is why a gold-tooth run could see no bonus at all. Losses (an
 * event toll, a purchase) are never multiplied, and gold never goes negative.
 */
export function grantGold(run: RunPayload, amount: number): RunPayload {
  const delta = amount > 0 ? Math.floor(amount * goldMult(run.relics)) : amount;
  return { ...run, gold: Math.max(0, run.gold + delta) };
}

const RARITY_WEIGHT: Record<Rarity, number> = { common: 6, rare: 3, epic: 1 };
const offerKey = (o: OfferItem) => `${o.type}:${'id' in o ? o.id : ''}`;

/** Deterministic pick-1-of-N from `seed + step`. Always leads with a relic while any are left. */
export function makeOffer(seed: string, step: number, relicsOwned: readonly RelicId[], size: number): OfferItem[] {
  const rand = makeRng(`${seed}:offer:${step}`);
  const pool = RELIC_IDS.filter((id) => !relicsOwned.includes(id));
  const out: OfferItem[] = [];
  const push = (o: OfferItem | null) => {
    if (o && !out.some((x) => offerKey(x) === offerKey(o))) out.push(o);
  };

  const relic = (): OfferItem | null => {
    const left = pool.filter((id) => !out.some((o) => o.type === 'relic' && o.id === id));
    if (!left.length) return null;
    const total = left.reduce((s, id) => s + RARITY_WEIGHT[RELICS[id].rarity], 0);
    let roll = rand() * total;
    for (const id of left) {
      roll -= RARITY_WEIGHT[RELICS[id].rarity];
      if (roll < 0) return { type: 'relic', id };
    }
    return { type: 'relic', id: left[left.length - 1] };
  };
  const other = (): OfferItem => {
    const r = rand();
    if (r < 0.45) return { type: 'potion', id: POTION_IDS[Math.floor(rand() * POTION_IDS.length)] };
    if (r < 0.75) return { type: 'heal', amount: 2 };
    return { type: 'gold', amount: 20 + step * 5 };
  };

  push(relic());
  for (let tries = 0; out.length < size && tries < 40; tries++) push(rand() < 0.55 ? relic() : other());
  // Exhausted pool edge case: fill with the non-relic basics in a fixed order.
  const fillers: OfferItem[] = [{ type: 'heal', amount: 2 }, { type: 'gold', amount: 20 + step * 5 }, ...POTION_IDS.map((id) => ({ type: 'potion' as const, id }))];
  for (const f of fillers) if (out.length < size) push(f);
  return out.slice(0, size);
}

/** Apply the player's pick from the pending offer. null = no offer / bad index. */
export function applyPick(run: RunPayload, pickIndex: number): RunPayload | null {
  const item = run.offer?.[pickIndex];
  if (!Number.isInteger(pickIndex) || !item) return null;
  const next: RunPayload = { ...run, relics: [...run.relics], potions: { ...run.potions } };
  delete next.offer;
  if (item.type === 'relic') {
    if (!next.relics.includes(item.id)) next.relics.push(item.id);
    return withMaxHp(next);
  } else if (item.type === 'potion') {
    next.potions[item.id] = (next.potions[item.id] ?? 0) + 1;
  } else if (item.type === 'heal') {
    next.hp = Math.min(next.maxHp, next.hp + item.amount);
  } else {
    return grantGold(next, item.amount);
  }
  return next;
}

/** Skip the draft: clear the offer without taking anything. */
export function skipPick(run: RunPayload): RunPayload {
  const next = { ...run };
  delete next.offer;
  return next;
}

/** HP a won node gives back — rival chip damage is recoverable by playing well. */
export const WIN_HEAL = 1;

export interface LevelOutcome {
  hpLeft: number;
  potionsUsed: Partial<Record<PotionId, number>>;
  score: number;
  /** Phoenix feather fired this level — spend it. */
  reviveUsed?: boolean;
}

/**
 * After a won fight: HP clamp, gold, potions spent, next offer. The map
 * position is NOT advanced — the player picks the next node off the map.
 */
export function advanceRun(run: RunPayload, { hpLeft, potionsUsed, score, reviveUsed }: LevelOutcome): RunPayload {
  const potions = { ...emptyPotions(), ...run.potions };
  for (const [id, n] of Object.entries(potionsUsed ?? {})) {
    if (!isPotionId(id)) continue;
    const used = Math.max(0, Math.floor(Number(n) || 0));
    potions[id] = Math.max(0, potions[id] - used);
  }
  const relics = reviveUsed ? run.relics.filter((r) => r !== 'phoenix-feather') : [...run.relics];
  const maxHp = maxHpOf({ relics, bhp: run.bhp });
  const hp = Math.min(maxHp, Math.max(0, Math.round(Number(hpLeft) || 0)) + WIN_HEAL);
  // The offer is keyed on map DEPTH, so two nodes of a run never re-roll the same draft.
  const depth = run.path.length;
  return {
    ...run,
    hp,
    maxHp,
    relics,
    potions,
    gold: grantGold(run, goldForScore(score)).gold,
    offer: makeOffer(run.seed, depth, relics, draftSize(relics)),
  };
}
