/**
 * The `?` nodes: word-themed events with 2-3 choices whose outcomes are seeded.
 * Pure data + pure resolution — no text lives here. Every id maps to
 * `adventurePlay.event.<id>.{title,body,c0,c1,c2}` in the locale files, so all
 * six languages get the same beat and the server never ships prose.
 */
import { makeRng } from './rng';
import type { PotionId } from './relics';

/** What one choice does to the run. `relic` grants a random unowned relic. */
export interface EventOutcome {
  gold?: number;
  hp?: number;
  maxHp?: number;
  hint?: number;
  relic?: boolean;
  potion?: PotionId;
}

/** A choice resolves to one of its weighted outcomes (seeded); a single entry is deterministic. */
export interface EventChoice { roll: Array<{ weight: number; out: EventOutcome }> }
export interface EventDef { id: string; choices: EventChoice[] }

const sure = (out: EventOutcome): EventChoice => ({ roll: [{ weight: 1, out }] });
const gamble = (...roll: Array<{ weight: number; out: EventOutcome }>): EventChoice => ({ roll });

export const EVENTS: EventDef[] = [
  { id: 'spilled-inkwell', choices: [sure({ maxHp: 1, hp: -1 }), sure({ gold: 30 })] },
  {
    id: 'dusty-library',
    choices: [sure({ relic: true }), sure({ gold: 55 }), sure({ hint: 1 })],
  },
  {
    id: 'wandering-scribe',
    choices: [sure({ gold: -40, hp: 2 }), sure({ gold: 25 })],
  },
  {
    id: 'stone-riddle',
    choices: [gamble({ weight: 1, out: { relic: true } }, { weight: 1, out: { hp: -2, gold: 20 } }), sure({})],
  },
  {
    id: 'broken-cart',
    choices: [sure({ gold: 60 }), gamble({ weight: 2, out: { gold: 100, hp: -1 } }, { weight: 1, out: { hp: -2 } })],
  },
  {
    id: 'word-fountain',
    choices: [sure({ hp: 99 }), sure({ potion: 'insight' }), sure({ potion: 'heal' })],
  },
  {
    id: 'vowel-thief',
    choices: [gamble({ weight: 2, out: { gold: 45, hp: -1 } }, { weight: 1, out: { gold: 80 } }), sure({ potion: 'time' })],
  },
  { id: 'old-tome', choices: [sure({ hint: 1 }), sure({ gold: 35 })] },
  { id: 'crossroads-bard', choices: [sure({ hp: 2 }), sure({ gold: 25 }), sure({ potion: 'cleanse' })] },
  {
    id: 'cursed-quill',
    choices: [sure({ relic: true, hp: -2 }), sure({ gold: 20 })],
  },
];

export const eventById = (id: string): EventDef | null => EVENTS.find((e) => e.id === id) ?? null;

/** Which event a `?` node shows. Deterministic from the run seed + node id. */
export function eventForNode(seed: string, nodeId: string): EventDef {
  const rand = makeRng(`${seed}:event:${nodeId}`);
  return EVENTS[Math.floor(rand() * EVENTS.length) % EVENTS.length];
}

/** Resolve one choice's weighted outcome table. */
export function rollOutcome(choice: EventChoice, seed: string, nodeId: string, index: number): EventOutcome {
  if (choice.roll.length === 1) return choice.roll[0].out;
  const rand = makeRng(`${seed}:eventroll:${nodeId}:${index}`);
  const total = choice.roll.reduce((s, r) => s + r.weight, 0);
  let n = rand() * total;
  for (const r of choice.roll) {
    n -= r.weight;
    if (n < 0) return r.out;
  }
  return choice.roll[choice.roll.length - 1].out;
}
