import { describe, it, expect } from 'vitest';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { RELIC_PRICE, type ShopItem } from '@/lib/adventure/play/shop';
import { RELICS, RELIC_IDS } from '@/lib/adventure/play/relics';
import { runDelta, shopRowState, shopItemText, restChoiceList, eventChoiceKeys, eventChoiceHints, shopGreetingKey, isOnSale } from '../nodeText';

const base: PublicRun = {
  v: 2, w: 1, step: 3, node: 'r2l1', path: ['r0l0', 'r1l1', 'r2l1'],
  hp: 3, maxHp: 5, relics: [], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 100,
};

describe('runDelta — what the node actually gave or took', () => {
  it('Given gold spent and a relic gained, then it lists the relic and the exact gold cost', () => {
    const after: PublicRun = { ...base, gold: 40, relics: ['magnet'] };
    const lines = runDelta(base, after);
    expect(lines).toEqual([
      { key: 'adventurePlay.map.outRelic', params: { name: 'adventurePlay.relic.magnet' }, tone: 'good' },
      { key: 'adventurePlay.map.outGold', params: { amount: '\u200e-60' }, tone: 'bad' },
    ]);
  });

  it('Given a full heal that only restores the hearts actually missing, then the line shows the REAL heal, not the promise', () => {
    // word-fountain hands back `hp: 99`; the run was 3/5, so only 2 hearts came back.
    const after: PublicRun = { ...base, hp: 5 };
    expect(runDelta(base, after)).toEqual([
      { key: 'adventurePlay.map.outHp', params: { amount: '\u200e+2' }, tone: 'good' },
    ]);
  });

  it('Given max HP, hint charges and a potion, then each gain gets its own line', () => {
    const after: PublicRun = {
      ...base, maxHp: 6, hp: 4, bh: 1, potions: { ...base.potions, insight: 1 },
    };
    expect(runDelta(base, after)).toEqual([
      { key: 'adventurePlay.map.outPotion', params: { name: 'adventurePlay.potion.insight' }, tone: 'good' },
      { key: 'adventurePlay.map.outMaxHp', params: { amount: 1 }, tone: 'good' },
      { key: 'adventurePlay.map.outHint', params: { amount: 1 }, tone: 'good' },
      { key: 'adventurePlay.map.outHp', params: { amount: '\u200e+1' }, tone: 'good' },
    ]);
  });

  it('Given hearts lost, then the loss is its own bad line', () => {
    expect(runDelta(base, { ...base, hp: 1 })).toEqual([
      { key: 'adventurePlay.map.outHp', params: { amount: '\u200e-2' }, tone: 'bad' },
    ]);
  });

  it('Given nothing changed, then it says so rather than showing an empty panel', () => {
    expect(runDelta(base, { ...base })).toEqual([
      { key: 'adventurePlay.map.outNothing', tone: 'good' },
    ]);
  });
});

describe('shopRowState — a row you cannot buy is never tappable', () => {
  const relic: ShopItem = { type: 'relic', id: 'magnet', price: 90 };
  const heal: ShopItem = { type: 'heal', amount: 2, price: 40 };
  const wallet = (gold: number, hp = 3) => ({ ...base, gold, hp });

  it('Given enough gold and an unbought slot, then the row is buyable', () => {
    expect(shopRowState(relic, wallet(90), [], 0)).toBe('buyable');
  });
  it('Given one gold short, then the row is poor (the server would refuse it)', () => {
    expect(shopRowState(relic, wallet(89), [], 0)).toBe('poor');
  });
  it('Given this slot was already bought, then the row is sold even with gold to spare', () => {
    expect(shopRowState(relic, wallet(500), [2, 0], 0)).toBe('sold');
  });
  it('Given the run is at full HP, then the heal row is full — the server would take the gold and heal nothing', () => {
    expect(shopRowState(heal, wallet(500, base.maxHp), [], 5)).toBe('full');
  });
  it('Given the run is hurt, then the heal row is buyable again', () => {
    expect(shopRowState(heal, wallet(500, base.maxHp - 1), [], 5)).toBe('buyable');
  });
  it('Given a full-HP run that already bought the heal, then sold still wins over full', () => {
    expect(shopRowState(heal, wallet(500, base.maxHp), [5], 5)).toBe('sold');
  });
});

describe('shopItemText — price is folded into the item, never a separate tag to cross-reference', () => {
  it('Given a potion, then its name, description and kind come from the locale files', () => {
    expect(shopItemText({ type: 'potion', id: 'time', price: 30 })).toEqual({
      nameKey: 'adventurePlay.potion.time', nameParams: undefined,
      descKey: 'adventurePlay.potionDesc.time', descParams: undefined,
      kindKey: 'adventurePlay.loot.kindPotion',
    });
  });
  it('Given the heal slot, then the amount is printed in the name', () => {
    expect(shopItemText({ type: 'heal', amount: 2, price: 40 })).toEqual({
      nameKey: 'adventurePlay.map.shopHeal', nameParams: { amount: 2 },
      descKey: 'adventurePlay.loot.healDesc', descParams: undefined,
      kindKey: 'adventurePlay.loot.kindHeal',
    });
  });
});

describe('restChoiceList — every campfire choice states its exact number', () => {
  it('Given a heal of 2, then the three server choices come back in server index order', () => {
    expect(restChoiceList(2)).toEqual([
      { index: 0, key: 'adventurePlay.map.restHeal', params: { amount: 2 } },
      { index: 1, key: 'adventurePlay.map.restMaxHp', params: { amount: 1 } },
      { index: 2, key: 'adventurePlay.map.restHint', params: { amount: 1 } },
    ]);
  });
});

describe('eventChoiceKeys', () => {
  it('Given an event with three choices, then one key per choice', () => {
    expect(eventChoiceKeys('dusty-library', 3)).toEqual([
      'adventurePlay.map.event.dusty-library.c0',
      'adventurePlay.map.event.dusty-library.c1',
      'adventurePlay.map.event.dusty-library.c2',
    ]);
  });
});

describe('eventChoiceHints — gain and cost on the button, before the tap', () => {
  it('Given a sure trade that costs one thing and gives another, then BOTH sides are listed with their real tones', () => {
    // spilled-inkwell c0 = { maxHp: +1, hp: -1 }: a real trade, not a free gift.
    const [trade] = eventChoiceHints('spilled-inkwell');
    expect(trade.risky).toBe(false);
    expect(trade.outcomes).toEqual([[
      { key: 'adventurePlay.map.outMaxHp', params: { amount: 1 }, tone: 'good' },
      { key: 'adventurePlay.map.outHp', params: { amount: '\u200e-1' }, tone: 'bad' },
    ]]);
  });

  it('Given a gamble, then every branch is shown as its own group, never merged into one false promise', () => {
    // broken-cart c1 rolls +100 gold / -1 HP OR a flat -2 HP. Merging them would
    // promise gold on the branch that only hurts.
    const hints = eventChoiceHints('broken-cart');
    expect(hints[0].risky).toBe(false);
    expect(hints[1].risky).toBe(true);
    expect(hints[1].outcomes).toEqual([
      [
        { key: 'adventurePlay.map.outHp', params: { amount: '\u200e-1' }, tone: 'bad' },
        { key: 'adventurePlay.map.outGold', params: { amount: '\u200e+100' }, tone: 'good' },
      ],
      [{ key: 'adventurePlay.map.outHp', params: { amount: '\u200e-2' }, tone: 'bad' }],
    ]);
  });

  it('Given a random relic, then it is named as a random relic — never as a relic id nobody has seen', () => {
    expect(eventChoiceHints('dusty-library')[0].outcomes[0]).toEqual([
      { key: 'adventurePlay.node.hintRelic', tone: 'good' },
    ]);
  });

  it('Given the fountain’s hp:99, then it reads as a full heal, not "+99 HP"', () => {
    expect(eventChoiceHints('word-fountain')[0].outcomes[0]).toEqual([
      { key: 'adventurePlay.node.hintFullHeal', tone: 'good' },
    ]);
  });

  it('Given a choice that does nothing (walk away), then it says so instead of showing an empty button', () => {
    expect(eventChoiceHints('stone-riddle')[1].outcomes[0]).toEqual([
      { key: 'adventurePlay.map.outNothing', tone: 'good' },
    ]);
  });

  it('Given an unknown event id, then it returns nothing rather than throwing on a screen mid-render', () => {
    expect(eventChoiceHints('no-such-event')).toEqual([]);
  });

  it('Given a potion prize, then the chip carries the potion NAME key so all six locales read their own', () => {
    expect(eventChoiceHints('crossroads-bard')[2].outcomes[0]).toEqual([
      { key: 'adventurePlay.map.outPotion', params: { name: 'adventurePlay.potion.cleanse' }, tone: 'good' },
    ]);
  });
});

describe('shopGreetingKey — the keeper reacts to a purse he can see', () => {
  const shelf: ShopItem[] = [
    { type: 'relic', id: 'magnet', price: 90 },
    { type: 'heal', amount: 2, price: 40 },
  ];

  it('Given nothing on the shelf is affordable, then he says come back with coin instead of "gold first"', () => {
    expect(shopGreetingKey(shelf, { gold: 5, hp: 3, maxHp: 5 }, [])).toBe('adventurePlay.node.shopGreetingBroke');
  });

  it('Given one row is affordable, then the normal greeting stands', () => {
    expect(shopGreetingKey(shelf, { gold: 50, hp: 3, maxHp: 5 }, [])).toBe('adventurePlay.node.shopGreeting');
  });

  it('Given the only affordable row was already bought, then the shelf counts as out of reach', () => {
    expect(shopGreetingKey(shelf, { gold: 50, hp: 3, maxHp: 5 }, [1])).toBe('adventurePlay.node.shopGreetingBroke');
  });

  it('Given a rich player whose only live row is a heal at full hearts, then the keeper does NOT insult the purse', () => {
    // The heal is dead because the hearts are full, not because the gold is short.
    // "Come back when your purse is heavier" would be the one false line on the piece.
    expect(shopGreetingKey(shelf, { gold: 500, hp: 5, maxHp: 5 }, [0])).toBe('adventurePlay.node.shopGreeting');
  });
});

describe('isOnSale — an honest SALE tag', () => {
  it('Given a relic priced at the bottom of its rarity band, then it is on sale', () => {
    // 'magnet' is rare: band 90-120, so the bottom quarter ends at 97.5.
    expect(isOnSale({ type: 'relic', id: 'magnet', price: 92 })).toBe(true);
    expect(isOnSale({ type: 'relic', id: 'magnet', price: 118 })).toBe(false);
  });

  it('Given a potion or a heal, then it is never tagged — they have no band to be cheap against', () => {
    expect(isOnSale({ type: 'potion', id: 'heal', price: 25 })).toBe(false);
    expect(isOnSale({ type: 'heal', amount: 3, price: 40 })).toBe(false);
  });

  it('Given every rarity, then the cheapest price in the band is always a sale', () => {
    for (const id of RELIC_IDS) {
      const band = RELIC_PRICE[RELICS[id].rarity];
      expect(isOnSale({ type: 'relic', id, price: band.min })).toBe(true);
      expect(isOnSale({ type: 'relic', id, price: band.max })).toBe(false);
    }
  });
});
