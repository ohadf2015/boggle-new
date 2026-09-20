/**
 * Non-play map nodes resolved server-side: treasure, shop, rest and event.
 * Everything is seeded from the run seed + node id, so a reload re-derives the
 * same stock / event without storing it.
 */
import { describe, it, expect } from 'vitest';
import { freshRun, enterNode, maxHpOf, hintBonusOf, type RunPayload } from '../runToken';
import { buildRunMap, type MapNode } from '../runMap';
import { shopStock, RELIC_PRICE, SHOP_HEAL_PRICE, POTION_PRICE_MIN, POTION_PRICE_MAX } from '../shop';
import { EVENTS, eventForNode } from '../events';
import { enterNodeState, applyNodeChoice, TREASURE_OFFER_RELICS, TREASURE_GOLD } from '../nodeResolve';
import { RELICS, RELIC_IDS, BASE_HP } from '../relics';

const SEED = 'seed-node';
const node = (kind: MapNode['kind'], id = `x-${kind}`): MapNode => ({ id, row: 2, lane: 0, kind });
const run = (over: Partial<RunPayload> = {}): RunPayload => ({ ...enterNode(freshRun(1, 'u', SEED), 'r2l0'), ...over });

describe('shopStock', () => {
  const stock = shopStock(SEED, 'r2l0', []);

  it('Given a shop node, When stocked, Then it is deterministic', () => {
    expect(shopStock(SEED, 'r2l0', [])).toEqual(stock);
  });

  it('Given two different nodes, When stocked, Then the stock differs', () => {
    expect(JSON.stringify(shopStock(SEED, 'r2l0', []))).not.toBe(JSON.stringify(shopStock(SEED, 'r4l1', [])));
  });

  it('Given a shop, When stocked, Then prices sit inside the design bands', () => {
    for (const item of stock) {
      if (item.type === 'relic') {
        expect(item.price).toBeGreaterThanOrEqual(60);
        expect(item.price).toBeLessThanOrEqual(150);
        expect(item.price).toBeGreaterThanOrEqual(RELIC_PRICE[RELICS[item.id].rarity].min);
      } else if (item.type === 'potion') {
        expect(item.price).toBeGreaterThanOrEqual(POTION_PRICE_MIN);
        expect(item.price).toBeLessThanOrEqual(POTION_PRICE_MAX);
      } else {
        expect(item.price).toBe(SHOP_HEAL_PRICE);
      }
    }
  });

  it('Given relics already owned, When stocked, Then the shop never sells a duplicate', () => {
    const owned = RELIC_IDS.slice(0, 4);
    const items = shopStock(SEED, 'r2l0', owned);
    expect(items.filter((i) => i.type === 'relic' && owned.includes(i.id))).toHaveLength(0);
  });

  it('Given every relic owned, When stocked, Then potions and heal still fill the shelf', () => {
    const items = shopStock(SEED, 'r2l0', RELIC_IDS);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.type !== 'relic')).toBe(true);
  });
});

describe('events', () => {
  it('Given the catalog, When counted, Then there are 8-12 events with 2-3 choices each', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(8);
    expect(EVENTS.length).toBeLessThanOrEqual(12);
    for (const e of EVENTS) {
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
      expect(e.choices.length).toBeLessThanOrEqual(3);
    }
  });

  it('Given the catalog, When ids are compared, Then they are unique', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });

  it('Given a node, When an event is drawn, Then it is deterministic and from the catalog', () => {
    const e = eventForNode(SEED, 'r3l1');
    expect(eventForNode(SEED, 'r3l1')).toBe(e);
    expect(EVENTS).toContain(e);
  });
});

describe('enterNodeState', () => {
  it('Given a treasure node, When entered, Then it OFFERS named prizes and grants nothing yet', () => {
    const r = enterNodeState(run(), node('treasure'));
    expect(r.state.kind).toBe('treasure');
    if (r.state.kind !== 'treasure') return;
    // A chest that pays out on arrival is a confirmation, not a decision.
    expect(r.run.relics).toHaveLength(0);
    expect(r.run.gold).toBe(run().gold);
    expect(r.state.taken).toBeUndefined();
    expect(r.state.offers.length).toBeGreaterThanOrEqual(2);
    expect(r.state.offers.filter((o) => o.kind === 'relic')).toHaveLength(TREASURE_OFFER_RELICS);
    expect(r.state.offers.some((o) => o.kind === 'gold')).toBe(true);
  });

  it('Given a treasure node, When entered twice, Then the same prizes are on the lid', () => {
    const a = enterNodeState(run(), node('treasure')).state;
    const b = enterNodeState(run(), node('treasure')).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('Given a treasure node with every relic owned, When entered, Then the gold offer still stands', () => {
    // `sr` is the relic count the run ARRIVED with — the shelf is derived from it.
    const r = enterNodeState(run({ relics: [...RELIC_IDS], sr: RELIC_IDS.length }), node('treasure'));
    expect(r.state.kind).toBe('treasure');
    if (r.state.kind === 'treasure') {
      expect(r.state.offers.length).toBeGreaterThanOrEqual(1);
      expect(r.state.offers.every((o) => o.kind === 'gold')).toBe(true);
    }
  });

  it('Given a shop node, When entered, Then the stock is listed and nothing is bought', () => {
    const r = enterNodeState(run({ gold: 200 }), node('shop'));
    expect(r.state.kind).toBe('shop');
    if (r.state.kind === 'shop') expect(r.state.items.length).toBeGreaterThan(0);
    expect(r.run.gold).toBe(200);
  });

  it('Given a rest node, When entered, Then three untaken choices are offered', () => {
    const r = enterNodeState(run({ hp: 2 }), node('rest'));
    expect(r.state.kind).toBe('rest');
    if (r.state.kind === 'rest') {
      expect(r.state.heal).toBeGreaterThan(0);
      expect(r.state.taken).toBeUndefined();
    }
  });

  it('Given an event node, When entered, Then the event and its choices are named', () => {
    const r = enterNodeState(run(), node('event'));
    expect(r.state.kind).toBe('event');
    if (r.state.kind === 'event') expect(r.state.choices).toBeGreaterThanOrEqual(2);
  });

  it('Given a fight node, When entered, Then it is refused as a play node', () => {
    expect(() => enterNodeState(run(), node('fight'))).toThrow();
  });
});

describe('applyNodeChoice — treasure', () => {
  const chest = node('treasure');
  const offersOf = (r: RunPayload) => {
    const s = enterNodeState(r, chest).state;
    return s.kind === 'treasure' ? s.offers : [];
  };

  it('Given a chest, When one prize is picked, Then only that prize is granted', () => {
    const start = run();
    const offers = offersOf(start);
    const relicIdx = offers.findIndex((o) => o.kind === 'relic');
    const res = applyNodeChoice(start, chest, relicIdx, SEED);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.run.relics).toEqual([offers[relicIdx].kind === 'relic' ? offers[relicIdx].id : null]);
    expect(res.run.gold).toBe(start.gold);
    if (res.state.kind === 'treasure') expect(res.state.taken).toBe(relicIdx);
  });

  it('Given a chest, When the gold prize is picked, Then gold rises and no relic is taken', () => {
    const start = run();
    const goldIdx = offersOf(start).findIndex((o) => o.kind === 'gold');
    const res = applyNodeChoice(start, chest, goldIdx, SEED);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.run.gold).toBe(start.gold + TREASURE_GOLD);
    expect(res.run.relics).toHaveLength(0);
  });

  it('Given a picked chest, When re-entered, Then the SAME prize is shown and nothing is granted twice', () => {
    const start = run();
    const offers = offersOf(start);
    const idx = offers.findIndex((o) => o.kind === 'relic');
    const res = applyNodeChoice(start, chest, idx, SEED);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const again = enterNodeState(res.run, chest);
    expect(again.run.relics).toEqual(res.run.relics);
    expect(again.state.kind).toBe('treasure');
    if (again.state.kind !== 'treasure') return;
    // The shelf must be derived from the relics held ON ARRIVAL: re-deriving from
    // what the run owns NOW shrinks the pool and repaints a prize it never took.
    expect(JSON.stringify(again.state.offers)).toBe(JSON.stringify(offers));
    expect(again.state.taken).toBe(idx);
  });

  it('Given a chest, When it is skipped, Then nothing is granted and the skip is remembered', () => {
    const start = run();
    const skip = offersOf(start).length;
    const res = applyNodeChoice(start, chest, skip, SEED);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.run.relics).toHaveLength(0);
    expect(res.run.gold).toBe(start.gold);
    if (res.state.kind === 'treasure') expect(res.state.taken).toBe(skip);
  });

  it('Given a chest already answered, When picked again, Then it is refused', () => {
    const start = run();
    const first = applyNodeChoice(start, chest, 0, SEED);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = applyNodeChoice(first.run, chest, 1, SEED);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('taken');
  });

  it('Given an out-of-range index, When picked, Then it is refused', () => {
    const start = run();
    const res = applyNodeChoice(start, chest, offersOf(start).length + 1, SEED);
    expect(res.ok).toBe(false);
  });
});

describe('applyNodeChoice — rest', () => {
  const rest = node('rest');

  it('Given a wounded run, When rest heals, Then it restores about 30% of max HP', () => {
    const before = run({ hp: 1 });
    const after = applyNodeChoice(enterNodeState(before, rest).run, rest, 0, SEED);
    expect(after.ok).toBe(true);
    if (after.ok) expect(after.run.hp).toBe(Math.min(maxHpOf(before), 1 + Math.max(1, Math.round(BASE_HP * 0.3))));
  });

  it('Given a rest, When the HP upgrade is taken, Then max HP rises by one', () => {
    const after = applyNodeChoice(enterNodeState(run(), rest).run, rest, 1, SEED);
    expect(after.ok && maxHpOf(after.run)).toBe(BASE_HP + 1);
  });

  it('Given a rest, When the hint upgrade is taken, Then the hint bonus rises by one', () => {
    const after = applyNodeChoice(enterNodeState(run(), rest).run, rest, 2, SEED);
    expect(after.ok && hintBonusOf(after.run)).toBe(1);
  });

  it('Given a rest already taken, When chosen again, Then it is refused', () => {
    const once = applyNodeChoice(enterNodeState(run(), rest).run, rest, 0, SEED);
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    expect(applyNodeChoice(once.run, rest, 1, SEED).ok).toBe(false);
  });
});

describe('applyNodeChoice — shop', () => {
  const shop = node('shop');

  it('Given enough gold, When an item is bought, Then it is delivered and gold drops by its price', () => {
    const entered = enterNodeState(run({ gold: 400 }), shop);
    const items = entered.state.kind === 'shop' ? entered.state.items : [];
    const idx = items.findIndex((i) => i.type === 'relic');
    const after = applyNodeChoice(entered.run, shop, idx, SEED);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.run.gold).toBe(400 - items[idx].price);
    expect(after.run.relics).toHaveLength(1);
  });

  it('Given too little gold, When an item is bought, Then it is refused and gold stays put', () => {
    const entered = enterNodeState(run({ gold: 1 }), shop);
    const after = applyNodeChoice(entered.run, shop, 0, SEED);
    expect(after.ok).toBe(false);
    if (!after.ok) expect(after.error).toBe('poor');
  });

  it('Given an item already bought, When bought again, Then it is refused', () => {
    const entered = enterNodeState(run({ gold: 400 }), shop);
    const first = applyNodeChoice(entered.run, shop, 0, SEED);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(applyNodeChoice(first.run, shop, 0, SEED).ok).toBe(false);
  });

  it('Given many buys, When gold runs out, Then it never goes negative', () => {
    let cur = enterNodeState(run({ gold: 120 }), shop).run;
    for (let i = 0; i < 8; i++) {
      const r = applyNodeChoice(cur, shop, i, SEED);
      if (r.ok) cur = r.run;
      expect(cur.gold).toBeGreaterThanOrEqual(0);
    }
  });

  it('Given an out-of-range index, When bought, Then it is refused', () => {
    expect(applyNodeChoice(enterNodeState(run({ gold: 400 }), shop).run, shop, 99, SEED).ok).toBe(false);
  });
});

describe('applyNodeChoice — event', () => {
  const ev = node('event');

  it('Given an event, When a choice is taken, Then the run changes and the outcome is reported', () => {
    const entered = enterNodeState(run({ gold: 100, hp: 3 }), ev);
    const after = applyNodeChoice(entered.run, ev, 0, SEED);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.state.kind).toBe('event');
    if (after.state.kind === 'event') expect(after.state.taken).toBe(0);
  });

  it('Given an event, When the same choice is taken twice from the same seed, Then the outcome matches', () => {
    const entered = enterNodeState(run({ gold: 100, hp: 3 }), ev);
    const a = applyNodeChoice(entered.run, ev, 0, SEED);
    const b = applyNodeChoice(entered.run, ev, 0, SEED);
    expect(a).toEqual(b);
  });

  it('Given every event and choice, When resolved, Then HP and gold stay in legal bounds', () => {
    for (const e of EVENTS) {
      for (let c = 0; c < e.choices.length; c++) {
        const start = run({ gold: 0, hp: 1 });
        const r = applyNodeChoice({ ...enterNodeState(start, ev).run, gold: 0, hp: 1 }, { ...ev, id: e.id }, c, `${SEED}:${e.id}`);
        if (!r.ok) continue;
        expect(r.run.gold).toBeGreaterThanOrEqual(0);
        expect(r.run.hp).toBeGreaterThanOrEqual(0);
        expect(r.run.hp).toBeLessThanOrEqual(maxHpOf(r.run));
      }
    }
  });

  it('Given an event already answered, When answered again, Then it is refused', () => {
    const first = applyNodeChoice(enterNodeState(run(), ev).run, ev, 0, SEED);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(applyNodeChoice(first.run, ev, 1, SEED).ok).toBe(false);
  });
});

describe('node kinds cover the map', () => {
  it('Given a generated map, When every non-play node is entered, Then none throws', () => {
    const map = buildRunMap(SEED, 4);
    for (const n of map.nodes.filter((x) => !['fight', 'elite', 'boss'].includes(x.kind))) {
      expect(() => enterNodeState(run({ gold: 50 }), n)).not.toThrow();
    }
  });
});
