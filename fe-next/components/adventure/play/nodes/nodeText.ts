/**
 * Pure view logic for the map's non-play nodes (shop / rest / treasure / event).
 *
 * Two rules the screens are built on:
 *  - Every outcome is read from what the RUN actually changed by, never from the
 *    promise the choice made. An event that hands back `hp: 99` on a 3/5 run
 *    healed 2 hearts, so the screen says +2.
 *  - A row the server would refuse (no gold, already bought) is never tappable:
 *    `/api/adventure/node` answers a refusal with a 400, and the hook turns any
 *    400 into the run's error screen — so the client must not send one.
 *
 * No prose lives here: every line is a locale KEY + params, resolved by the
 * component through `t()` so all six languages read the same beat.
 */
import { eventById, type EventOutcome } from '@/lib/adventure/play/events';
import { POTION_IDS, RELICS, type PotionId, type RelicId } from '@/lib/adventure/play/relics';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { RELIC_PRICE, type ShopItem } from '@/lib/adventure/play/shop';

export type Tone = 'good' | 'bad';
export interface Line { key: string; params?: Record<string, string | number>; tone: Tone }

const MAP = 'adventurePlay.map';
export const relicNameKey = (id: RelicId) => `adventurePlay.relic.${id}`;
export const relicDescKey = (id: RelicId) => `adventurePlay.relicDesc.${id}`;
export const potionNameKey = (id: PotionId) => `adventurePlay.potion.${id}`;
export const potionDescKey = (id: PotionId) => `adventurePlay.potionDesc.${id}`;
/**
 * Signed so the number always reads as a change, in any language. The leading
 * U+200E (LRM) keeps the sign on the LEFT of the digits inside a Hebrew line:
 * without it the bidi algorithm renders "+45" as "45+" and "-1" as "1-".
 */
const signed = (n: number) => (n > 0 ? `\u200e+${n}` : `\u200e${n}`);

/**
 * What one node move did to the run, as printable lines. Both snapshots come
 * from the server, so this is the honest ledger — clamps and refusals included.
 */
export function runDelta(before: PublicRun, after: PublicRun): Line[] {
  const lines: Line[] = [];
  for (const id of after.relics) {
    if (!before.relics.includes(id)) lines.push({ key: `${MAP}.outRelic`, params: { name: relicNameKey(id) }, tone: 'good' });
  }
  for (const id of POTION_IDS) {
    const gained = (after.potions?.[id] ?? 0) - (before.potions?.[id] ?? 0);
    if (gained > 0) lines.push({ key: `${MAP}.outPotion`, params: { name: potionNameKey(id) }, tone: 'good' });
  }
  const maxHp = after.maxHp - before.maxHp;
  if (maxHp !== 0) lines.push({ key: `${MAP}.outMaxHp`, params: { amount: maxHp }, tone: maxHp > 0 ? 'good' : 'bad' });
  const hints = (after.bh ?? 0) - (before.bh ?? 0);
  if (hints !== 0) lines.push({ key: `${MAP}.outHint`, params: { amount: hints }, tone: hints > 0 ? 'good' : 'bad' });
  const hp = after.hp - before.hp;
  if (hp !== 0) lines.push({ key: `${MAP}.outHp`, params: { amount: signed(hp) }, tone: hp > 0 ? 'good' : 'bad' });
  const gold = after.gold - before.gold;
  if (gold !== 0) lines.push({ key: `${MAP}.outGold`, params: { amount: signed(gold) }, tone: gold > 0 ? 'good' : 'bad' });
  return lines.length ? lines : [{ key: `${MAP}.outNothing`, tone: 'good' }];
}

/** How deep into a rarity band a relic must be priced to count as a bargain. */
export const SALE_BAND_SHARE = 0.25;

/**
 * A SALE tag the shelf can actually justify: relic prices are rolled inside a
 * per-rarity band (`RELIC_PRICE`), so a roll in the bottom quarter of its own
 * band IS cheap for what it is. Potions and the heal have no band to be cheap
 * against, so they are never tagged — a tag that is sometimes a lie is worse
 * than no tag.
 */
export function isOnSale(item: ShopItem): boolean {
  if (item.type !== 'relic') return false;
  const band = RELIC_PRICE[RELICS[item.id].rarity];
  return item.price <= band.min + (band.max - band.min) * SALE_BAND_SHARE;
}

export type ShopRowState = 'buyable' | 'poor' | 'sold' | 'full';

/**
 * A slot is sold once bought (the server refuses a second buy) and poor below
 * its price. `full` is the client being stricter than the server on purpose:
 * the heal is clamped to max HP, so buying it at full health would take the
 * gold and hand back nothing — a receipt of pure loss.
 */
export function shopRowState(
  item: ShopItem,
  run: Pick<PublicRun, 'gold' | 'hp' | 'maxHp'>,
  bought: readonly number[],
  index: number,
): ShopRowState {
  if (bought.includes(index)) return 'sold';
  if (run.gold < item.price) return 'poor';
  if (item.type === 'heal' && run.hp >= run.maxHp) return 'full';
  return 'buyable';
}

/**
 * The keeper's line. A shelf where every row is out of reach is the commonest
 * first-shop state in this economy, and "Gold first. Questions later." reads as
 * a taunt there — say the true thing instead.
 */
export function shopGreetingKey(
  items: readonly ShopItem[],
  run: Pick<PublicRun, 'gold' | 'hp' | 'maxHp'>,
  bought: readonly number[],
): string {
  // `full` counts as within reach: that row is dead because the hearts are
  // topped up, not because the purse is light. Blaming the gold there would be
  // the one false line on the piece.
  const affordable = items.some((it, i) => {
    const state = shopRowState(it, run, bought, i);
    return state === 'buyable' || state === 'full';
  });
  return affordable ? 'adventurePlay.node.shopGreeting' : 'adventurePlay.node.shopGreetingBroke';
}

export interface ItemText {
  nameKey: string;
  nameParams?: Record<string, string | number>;
  descKey: string;
  descParams?: Record<string, string | number>;
  kindKey: string;
}

/** Name / one-line effect / kind tag for one shelf slot. */
export function shopItemText(item: ShopItem): ItemText {
  if (item.type === 'relic') {
    return { nameKey: relicNameKey(item.id), nameParams: undefined, descKey: relicDescKey(item.id), descParams: undefined, kindKey: 'adventurePlay.loot.kindRelic' };
  }
  if (item.type === 'potion') {
    return { nameKey: potionNameKey(item.id), nameParams: undefined, descKey: potionDescKey(item.id), descParams: undefined, kindKey: 'adventurePlay.loot.kindPotion' };
  }
  return {
    nameKey: `${MAP}.shopHeal`, nameParams: { amount: item.amount },
    descKey: 'adventurePlay.loot.healDesc', descParams: undefined,
    kindKey: 'adventurePlay.loot.kindHeal',
  };
}

export interface RestChoice { index: number; key: string; params: Record<string, number> }

/** The campfire's three server choices (0 heal, 1 max HP, 2 hint), each with its exact number. */
export function restChoiceList(heal: number): RestChoice[] {
  return [
    { index: 0, key: `${MAP}.restHeal`, params: { amount: heal } },
    { index: 1, key: `${MAP}.restMaxHp`, params: { amount: 1 } },
    { index: 2, key: `${MAP}.restHint`, params: { amount: 1 } },
  ];
}

export const eventKey = (id: string, part: string) => `${MAP}.event.${id}.${part}`;
/** One locale key per choice the server offers for this event. */
export const eventChoiceKeys = (id: string, choices: number) =>
  Array.from({ length: Math.max(0, choices) }, (_, i) => eventKey(id, `c${i}`));

/**
 * What a choice is ABOUT to do, as chips — the genre rule that gain and cost
 * ride on the button itself, never behind a second tap. Read from the same
 * `EVENTS` table the server resolves against, so the promise and the payout
 * come from one source.
 *
 * A gamble keeps its branches apart (`outcomes` is a list of groups, joined by
 * "or" on screen): merging "+100 gold, -1 HP" with "-2 HP" would promise gold
 * on the branch that only ever hurts.
 */
export interface EventHint { index: number; risky: boolean; outcomes: Line[][] }

/** One outcome as printable chips, in the same order `runDelta` prints them. */
function outcomeLines(out: EventOutcome): Line[] {
  const lines: Line[] = [];
  if (out.relic) lines.push({ key: 'adventurePlay.node.hintRelic', tone: 'good' });
  if (out.potion) lines.push({ key: `${MAP}.outPotion`, params: { name: potionNameKey(out.potion) }, tone: 'good' });
  if (out.maxHp) lines.push({ key: `${MAP}.outMaxHp`, params: { amount: out.maxHp }, tone: out.maxHp > 0 ? 'good' : 'bad' });
  if (out.hint) lines.push({ key: `${MAP}.outHint`, params: { amount: out.hint }, tone: out.hint > 0 ? 'good' : 'bad' });
  // The fountain hands back `hp: 99` to mean "top the player up"; printing +99
  // would promise hearts no run has. Name the effect instead of the number.
  if (out.hp && out.hp >= 99) lines.push({ key: 'adventurePlay.node.hintFullHeal', tone: 'good' });
  else if (out.hp) lines.push({ key: `${MAP}.outHp`, params: { amount: signed(out.hp) }, tone: out.hp > 0 ? 'good' : 'bad' });
  if (out.gold) lines.push({ key: `${MAP}.outGold`, params: { amount: signed(out.gold) }, tone: out.gold > 0 ? 'good' : 'bad' });
  return lines.length ? lines : [{ key: `${MAP}.outNothing`, tone: 'good' }];
}

export function eventChoiceHints(id: string): EventHint[] {
  const def = eventById(id);
  if (!def) return [];
  return def.choices.map((choice, index) => ({
    index,
    risky: choice.roll.length > 1,
    outcomes: choice.roll.map((r) => outcomeLines(r.out)),
  }));
}
