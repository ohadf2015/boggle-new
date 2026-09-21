/**
 * Server-side resolution of the non-play map nodes (treasure / shop / rest /
 * event). Pure: every outcome is seeded from the run seed + node id, and the
 * ONLY state is the run token, so `/api/adventure/node` stays a thin shell.
 *
 * One-shot nodes record the choice they took in `run.bought`, which `enterNode`
 * clears on the way out — so a reload re-reads the same resolved state instead
 * of granting it twice.
 */
import { makeRng } from './rng';
import { RELIC_IDS, POTION_HEAL, isPotionId, type RelicId } from './relics';
import {
  maxHpOf, hintBonusOf, restUpgrade, spendGold, grantGold, type RunPayload,
} from './runToken';
import { isPlayNode, type MapNode } from './runMap';
import { shopStock, type ShopItem } from './shop';
import { eventById, eventForNode, rollOutcome, type EventOutcome } from './events';

/** Rest heals this share of max HP (rounded up, always at least 1). */
export const REST_HEAL_FRACTION = 0.5;
export const TREASURE_GOLD = 45;
/** How many unowned relics a chest puts on the lid beside its gold pile. */
export const TREASURE_OFFER_RELICS = 2;

export type RestChoice = 0 | 1 | 2;

/** One prize on an open chest's lid. The player takes exactly one, or none. */
export type TreasureOffer = { kind: 'relic'; id: RelicId } | { kind: 'gold'; amount: number };

export type NodeState =
  /**
   * `offers` is the pick-one shelf; `taken` is the index the run answered with
   * (`offers.length` = skipped). `relic`/`gold` only ever appear on a run token
   * minted before the chest became a choice — see `legacyTreasure`.
   */
  | { kind: 'treasure'; offers: TreasureOffer[]; taken?: number; relic?: RelicId; gold?: number }
  | { kind: 'shop'; items: ShopItem[]; bought: number[] }
  | { kind: 'rest'; heal: number; taken?: number }
  | { kind: 'event'; id: string; choices: number; taken?: number; outcome?: EventOutcome };

export type NodeResult =
  | { ok: true; run: RunPayload; state: NodeState }
  | { ok: false; error: 'poor' | 'taken' | 'choice' | 'kind' };

const taken = (run: RunPayload) => run.bought ?? [];

/**
 * The relics the run held when it stepped onto the current node. The shelf is
 * derived from them, never from what the run owns RIGHT NOW: buying a relic
 * shrinks the unowned pool, and re-deriving from that pool re-rolled the shelf
 * under the player mid-visit (a reload painted a brand-new relic "sold").
 * Runs minted before `sr` existed fall back to the old, current-relics shelf.
 */
const entryRelics = (run: RunPayload): RelicId[] =>
  (run.sr == null ? run.relics : run.relics.slice(0, run.sr));

/** A chest resolved under the pre-choice contract: one prize, already banked. */
const legacyTreasure = (slot: number, offers: TreasureOffer[]): NodeState =>
  (slot >= 0 && RELIC_IDS[slot]
    ? { kind: 'treasure', offers, relic: RELIC_IDS[slot] }
    : { kind: 'treasure', offers, gold: TREASURE_GOLD });
const mark = (run: RunPayload, index: number): RunPayload => ({ ...run, bought: [...taken(run), index] });

const clampHp = (run: RunPayload): RunPayload => ({ ...run, hp: Math.max(0, Math.min(maxHpOf(run), run.hp)) });

export const restHeal = (run: RunPayload) => Math.max(1, Math.ceil(maxHpOf(run) * REST_HEAL_FRACTION));

/** A relic the run does not own yet, drawn deterministically. */
function drawRelic(seed: string, nodeId: string, owned: readonly RelicId[]): RelicId | null {
  const pool = RELIC_IDS.filter((id) => !owned.includes(id));
  if (!pool.length) return null;
  return pool[Math.floor(makeRng(`${seed}:relic:${nodeId}`)() * pool.length) % pool.length];
}

/**
 * The chest's shelf: `TREASURE_OFFER_RELICS` unowned relics plus a gold pile,
 * so opening it is a pick-one with a real opportunity cost instead of a reveal.
 * Seeded from the run seed + node id, so the server re-derives it every request.
 */
export function treasureOffers(seed: string, nodeId: string, owned: readonly RelicId[]): TreasureOffer[] {
  const rand = makeRng(`${seed}:chest:${nodeId}`);
  const pool = RELIC_IDS.filter((id) => !owned.includes(id));
  const offers: TreasureOffer[] = [];
  for (let i = 0; i < TREASURE_OFFER_RELICS && pool.length; i++) {
    offers.push({ kind: 'relic', id: pool.splice(Math.floor(rand() * pool.length), 1)[0] });
  }
  offers.push({ kind: 'gold', amount: TREASURE_GOLD });
  return offers;
}

function grantRelic(run: RunPayload, id: RelicId): RunPayload {
  if (run.relics.includes(id)) return run;
  const relics = [...run.relics, id];
  const maxHp = maxHpOf({ relics, bhp: run.bhp });
  return { ...run, relics, maxHp, hp: Math.min(maxHp, run.hp + (maxHp - run.maxHp)) };
}

/**
 * Step onto a non-play node and read its state. Treasure resolves on arrival
 * (StS chests hand you the thing); the rest wait for a choice.
 */
export function enterNodeState(run: RunPayload, node: MapNode, seed = run.seed): { run: RunPayload; state: NodeState } {
  if (isPlayNode(node.kind)) throw new Error(`node ${node.id} is a play node`);

  if (node.kind === 'treasure') {
    // Nothing is granted on arrival: the chest waits for a pick. The shelf is
    // derived from the relics held ON ARRIVAL (`entryRelics`) — re-deriving it
    // from what the run owns NOW shrinks the pool after a pick and repaints the
    // lid with a prize the player never took.
    const offers = treasureOffers(seed, node.id, entryRelics(run));
    const already = taken(run)[0];
    if (already == null) return { run, state: { kind: 'treasure', offers } };
    // A token minted before chests became a choice stored the granted relic's
    // RELIC_IDS index (-1 = gold); show that prize rather than an offer index.
    if (already < 0 || already > offers.length) return { run, state: legacyTreasure(already, offers) };
    return { run, state: { kind: 'treasure', offers, taken: already } };
  }

  if (node.kind === 'shop') {
    return { run, state: { kind: 'shop', items: shopStock(seed, node.id, entryRelics(run)), bought: taken(run) } };
  }

  if (node.kind === 'rest') {
    return { run, state: { kind: 'rest', heal: restHeal(run), ...(taken(run).length ? { taken: taken(run)[0] } : {}) } };
  }

  const ev = eventForNode(seed, node.id);
  return { run, state: { kind: 'event', id: ev.id, choices: ev.choices.length, ...(taken(run).length ? { taken: taken(run)[0] } : {}) } };
}

function applyOutcome(run: RunPayload, out: EventOutcome, seed: string, nodeId: string): RunPayload {
  let next = run;
  if (out.relic) {
    const id = drawRelic(seed, nodeId, next.relics);
    next = id ? grantRelic(next, id) : grantGold(next, TREASURE_GOLD);
  }
  if (out.maxHp) next = restUpgrade(next, 'maxHp');
  if (out.hint) next = { ...next, bh: hintBonusOf(next) + out.hint };
  if (out.potion && isPotionId(out.potion)) {
    next = { ...next, potions: { ...next.potions, [out.potion]: (next.potions[out.potion] ?? 0) + 1 } };
  }
  // Gold can never go below zero, and the run cannot be killed by a choice it took.
  if (out.gold) next = grantGold(next, out.gold);
  if (out.hp) next = { ...next, hp: out.hp > 0 ? next.hp + out.hp : Math.max(1, next.hp + out.hp) };
  return clampHp(next);
}

/** Act on the node the run is standing on. One-shot nodes refuse a second choice. */
export function applyNodeChoice(run: RunPayload, node: MapNode, choice: number, seed = run.seed): NodeResult {
  if (isPlayNode(node.kind)) return { ok: false, error: 'kind' };
  const index = Math.floor(Number(choice));
  if (!Number.isInteger(index) || index < 0) return { ok: false, error: 'choice' };

  if (node.kind === 'shop') {
    const items = shopStock(seed, node.id, entryRelics(run));
    const item = items[index];
    if (!item) return { ok: false, error: 'choice' };
    if (taken(run).includes(index)) return { ok: false, error: 'taken' };
    const paid = spendGold(run, item.price);
    if (!paid) return { ok: false, error: 'poor' };
    let next = paid;
    if (item.type === 'relic') next = grantRelic(paid, item.id);
    else if (item.type === 'potion') next = { ...paid, potions: { ...paid.potions, [item.id]: (paid.potions[item.id] ?? 0) + 1 } };
    else next = { ...paid, hp: Math.min(maxHpOf(paid), paid.hp + item.amount) };
    next = mark(next, index);
    return { ok: true, run: next, state: { kind: 'shop', items, bought: taken(next) } };
  }

  if (taken(run).length) return { ok: false, error: 'taken' };

  if (node.kind === 'treasure') {
    const offers = treasureOffers(seed, node.id, entryRelics(run));
    // `offers.length` is the explicit skip: an answer, not an out-of-range index.
    if (index > offers.length) return { ok: false, error: 'choice' };
    const offer = offers[index];
    let next = run;
    if (offer?.kind === 'relic') next = grantRelic(run, offer.id);
    else if (offer?.kind === 'gold') next = grantGold(run, offer.amount);
    return { ok: true, run: mark(next, index), state: { kind: 'treasure', offers, taken: index } };
  }

  if (node.kind === 'rest') {
    if (index > 2) return { ok: false, error: 'choice' };
    const heal = restHeal(run);
    let next = run;
    if (index === 0) next = { ...run, hp: Math.min(maxHpOf(run), run.hp + heal) };
    else next = restUpgrade(run, index === 1 ? 'maxHp' : 'hint');
    next = mark(clampHp(next), index);
    return { ok: true, run: next, state: { kind: 'rest', heal, taken: index } };
  }

  const ev = eventById(node.id) ?? eventForNode(seed, node.id);
  const choiceDef = ev.choices[index];
  if (!choiceDef) return { ok: false, error: 'choice' };
  const out = rollOutcome(choiceDef, seed, node.id, index);
  const next = mark(applyOutcome(run, out, seed, node.id), index);
  return { ok: true, run: next, state: { kind: 'event', id: ev.id, choices: ev.choices.length, taken: index, outcome: out } };
}

/** Potion strength the shop sells, exported so the UI can label the heal item. */
export const SHOP_HEAL_AMOUNT = POTION_HEAL;
