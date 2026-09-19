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

export interface RunPayload {
  u: string;
  w: number;
  /** The level this run is about to play (1..7). */
  step: number;
  hp: number;
  maxHp: number;
  relics: RelicId[];
  potions: Record<PotionId, number>;
  gold: number;
  seed: string;
  offer?: OfferItem[];
}

export type PublicRun = Omit<RunPayload, 'u' | 'seed'>;

const DOMAIN = 'run';

export const signRun = (run: RunPayload, secret: string) => signPayload(run, secret, DOMAIN);
export const verifyRun = (token: unknown, secret: string) => verifyPayload<RunPayload>(token, secret, DOMAIN);

export function publicRun(run: RunPayload): PublicRun {
  const { u: _u, seed: _s, ...rest } = run;
  return rest;
}

const emptyPotions = (): Record<PotionId, number> => ({ heal: 0, time: 0, cleanse: 0, insight: 0 });

export function freshRun(world: number, userId: string, seed: string): RunPayload {
  const maxHp = maxHpFor([]);
  return { u: userId, w: world, step: 1, hp: maxHp, maxHp, relics: [], potions: { ...emptyPotions(), heal: 1 }, gold: 0, seed };
}

/** Gold for a cleared level — before the gold-tooth multiplier. */
export const goldForScore = (score: number) => 5 + Math.floor(Math.max(0, score) / 10);

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
    const newMax = maxHpFor(next.relics);
    next.hp += newMax - next.maxHp;
    next.maxHp = newMax;
  } else if (item.type === 'potion') {
    next.potions[item.id] = (next.potions[item.id] ?? 0) + 1;
  } else if (item.type === 'heal') {
    next.hp = Math.min(next.maxHp, next.hp + item.amount);
  } else {
    next.gold += item.amount;
  }
  return next;
}

/** Skip the draft: clear the offer without taking anything. */
export function skipPick(run: RunPayload): RunPayload {
  const next = { ...run };
  delete next.offer;
  return next;
}

export interface LevelOutcome {
  hpLeft: number;
  potionsUsed: Partial<Record<PotionId, number>>;
  score: number;
  /** Phoenix feather fired this level — spend it. */
  reviveUsed?: boolean;
}

/** After a won level: step+1, HP clamp, gold, potions spent, next offer. */
export function advanceRun(run: RunPayload, { hpLeft, potionsUsed, score, reviveUsed }: LevelOutcome): RunPayload {
  const potions = { ...emptyPotions(), ...run.potions };
  for (const [id, n] of Object.entries(potionsUsed ?? {})) {
    if (!isPotionId(id)) continue;
    const used = Math.max(0, Math.floor(Number(n) || 0));
    potions[id] = Math.max(0, potions[id] - used);
  }
  const relics = reviveUsed ? run.relics.filter((r) => r !== 'phoenix-feather') : [...run.relics];
  const maxHp = maxHpFor(relics);
  const hp = Math.min(maxHp, Math.max(0, Math.round(Number(hpLeft) || 0)));
  const step = run.step + 1;
  return {
    ...run,
    step,
    hp,
    maxHp,
    relics,
    potions,
    gold: run.gold + Math.floor(goldForScore(score) * goldMult(run.relics)),
    offer: makeOffer(run.seed, step, relics, draftSize(relics)),
  };
}
