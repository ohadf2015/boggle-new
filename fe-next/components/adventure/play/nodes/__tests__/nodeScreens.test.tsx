import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { ShopItem } from '@/lib/adventure/play/shop';
import NodeScreen from '../NodeScreen';

const run = (over: Partial<PublicRun> = {}): PublicRun => ({
  v: 2, w: 1, step: 3, node: 'r3l1', path: ['r0l0', 'r1l1', 'r2l1', 'r3l1'],
  hp: 3, maxHp: 5, relics: [], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 100, ...over,
});

const items: ShopItem[] = [
  { type: 'relic', id: 'magnet', price: 90 },
  { type: 'relic', id: 'long-bow', price: 140 },
  { type: 'potion', id: 'time', price: 30 },
  { type: 'heal', amount: 2, price: 40 },
];

describe('Shop screen', () => {
  it('Given a relic rolled at the bottom of its price band, then the shelf tags it SALE — and never tags a potion', () => {
    render(<NodeScreen state={{ kind: 'shop', items, bought: [] }} run={run({ gold: 500 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    // magnet is rare (band 90-120) rolled at its floor; long-bow at 140 is not.
    expect(screen.getByTestId('shop-sale-0')).toBeTruthy();
    expect(screen.queryByTestId('shop-sale-1')).toBeNull();
    expect(screen.queryByTestId('shop-sale-2')).toBeNull();
  });

  it('Given a sold row, then its SALE tag is gone — the stamp owns that corner', () => {
    render(<NodeScreen state={{ kind: 'shop', items, bought: [0] }} run={run({ gold: 500 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.queryByTestId('shop-sale-0')).toBeNull();
  });

  it('Given 100 gold, then an affordable row buys and an unaffordable row is dead with the shortfall named', () => {
    const onBuy = vi.fn();
    render(<NodeScreen state={{ kind: 'shop', items, bought: [] }} run={run()} world={1} busy={false} onChoice={onBuy} onLeave={() => {}} />);

    const tooDear = screen.getByTestId('shop-item-1');
    expect(tooDear).toBeDisabled();
    expect(tooDear.dataset.state).toBe('poor');
    // The row says exactly how much gold is missing — 140 - 100.
    expect(tooDear.textContent).toContain('adventurePlay.node.shortBy:{"amount":40}');

    fireEvent.click(screen.getByTestId('shop-item-0'));
    const confirm = screen.getByTestId('shop-confirm');
    expect(confirm.textContent).toContain('adventurePlay.relic.magnet');
    expect(confirm.textContent).toContain('adventurePlay.node.confirmCost:{"price":90,"left":10}');
    expect(onBuy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('shop-confirm-buy'));
    expect(onBuy).toHaveBeenCalledWith(0);
  });

  it('Given a slot already bought, then it is stamped sold and cannot be sent again', () => {
    render(<NodeScreen state={{ kind: 'shop', items, bought: [2] }} run={run({ gold: 500 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const sold = screen.getByTestId('shop-item-2');
    expect(sold).toBeDisabled();
    expect(sold.textContent).toContain('adventurePlay.map.shopSold');
  });

  it('Given the purchase came back, then the receipt is the run’s real diff, not the price tag’s promise', () => {
    const before = run({ gold: 100 });
    const { rerender } = render(<NodeScreen state={{ kind: 'shop', items, bought: [] }} run={before} world={1} busy onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.queryByTestId('shop-receipt')).toBeNull();
    const after = run({ gold: 10, relics: ['magnet'] });
    rerender(<NodeScreen state={{ kind: 'shop', items, bought: [0] }} run={after} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const receipt = screen.getByTestId('shop-receipt');
    expect(receipt.textContent).toContain('adventurePlay.map.outRelic');
    expect(receipt.textContent).toContain('adventurePlay.map.outGold:{"amount":"\u200e-90"}');
  });

  it('Given full hearts, then the heal row is dead and says so instead of taking the gold for nothing', () => {
    render(<NodeScreen state={{ kind: 'shop', items, bought: [] }} run={run({ gold: 500, hp: 5, maxHp: 5 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const heal = screen.getByTestId('shop-item-3');
    expect(heal).toBeDisabled();
    expect(heal.dataset.state).toBe('full');
    expect(heal.textContent).toContain('adventurePlay.node.shopFull');
  });

  it('Given a choice in flight, then the shelf is frozen but the screen stays on screen', () => {
    render(<NodeScreen state={{ kind: 'shop', items, bought: [] }} run={run()} world={1} busy onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('node-screen-shop')).toBeTruthy();
    expect(screen.getByTestId('shop-item-0')).toBeDisabled();
  });
});

describe('Campfire screen', () => {
  it('Given 3 of 5 hearts and a heal of 2, then every choice shows its exact before → after', () => {
    const onChoice = vi.fn();
    render(<NodeScreen state={{ kind: 'rest', heal: 2 }} run={run()} world={1} busy={false} onChoice={onChoice} onLeave={() => {}} />);
    expect(screen.getByTestId('rest-choice-0').textContent).toContain('adventurePlay.map.restHeal:{"amount":2}');
    expect(screen.getByTestId('rest-choice-0').textContent).toContain('3');
    expect(screen.getByTestId('rest-choice-1').textContent).toContain('adventurePlay.map.restMaxHp:{"amount":1}');
    expect(screen.getByTestId('rest-choice-2').textContent).toContain('adventurePlay.map.restHint:{"amount":1}');
    fireEvent.click(screen.getByTestId('rest-choice-1'));
    expect(onChoice).toHaveBeenCalledWith(1);
  });

  it('Given the choice resolved, then the campfire prints what the run really gained', () => {
    const before = run();
    const after = run({ maxHp: 6, hp: 4 });
    // The screen reads the run the server handed back, so the panel cannot flatter the choice.
    const { rerender } = render(<NodeScreen state={{ kind: 'rest', heal: 2 }} run={before} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    rerender(<NodeScreen state={{ kind: 'rest', heal: 2, taken: 1 }} run={after} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const out = screen.getByTestId('rest-outcome');
    expect(out.textContent).toContain('adventurePlay.map.outMaxHp:{"amount":1}');
    expect(out.textContent).toContain('adventurePlay.map.outHp:{"amount":"\u200e+1"}');
    expect(screen.queryByTestId('rest-choice-0')).toBeNull();
  });

  it('Given the choice resolved, then the card it kept shows the trade it MADE, not a fresh promise', () => {
    const before = run();
    const after = run({ maxHp: 6, hp: 4 });
    const { rerender } = render(<NodeScreen state={{ kind: 'rest', heal: 2 }} run={before} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    rerender(<NodeScreen state={{ kind: 'rest', heal: 2, taken: 1 }} run={after} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    // The fire is spent: the pill must still read 5 → 6 (what it did), never 6 → 7.
    expect(screen.getByTestId('rest-choice-1').textContent).toContain('5');
    expect(screen.getByTestId('rest-choice-1').textContent).not.toContain('7');
  });

  it('Given a reload after resting (no diff left to show), then it names the choice instead of an empty panel', () => {
    render(<NodeScreen state={{ kind: 'rest', heal: 2, taken: 0 }} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('rest-outcome').textContent).toContain('adventurePlay.map.restHeal:{"amount":2}');
  });
});

describe('Treasure screen — a pick-one, not a reveal', () => {
  const offers = [
    { kind: 'relic', id: 'magnet' },
    { kind: 'relic', id: 'phoenix-feather' },
    { kind: 'gold', amount: 45 },
  ] as const;
  const chest = (over: Record<string, unknown> = {}) =>
    ({ kind: 'treasure', offers: [...offers], ...over }) as never;

  it('Given a shut lid, then the ONLY footer action opens it — never Leave over an unopened chest', () => {
    const onLeave = vi.fn();
    render(<NodeScreen state={chest()} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={onLeave} />);
    expect(screen.queryByTestId('treasure-offers')).toBeNull();
    expect(screen.queryByTestId('node-leave')).toBeNull();
    fireEvent.click(screen.getByTestId('node-open'));
    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.getByTestId('treasure-offers')).toBeTruthy();
  });

  it('Given an open chest, then EVERY prize is named with its rarity and effect, side by side', () => {
    render(<NodeScreen state={chest()} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    fireEvent.click(screen.getByTestId('treasure-chest'));
    const list = screen.getByTestId('treasure-offers').textContent ?? '';
    expect(list).toContain('adventurePlay.relic.magnet');
    expect(list).toContain('adventurePlay.relicDesc.magnet');
    expect(list).toContain('adventurePlay.loot.rarity.rare');
    expect(list).toContain('adventurePlay.relic.phoenix-feather');
    expect(list).toContain('adventurePlay.loot.rarity.epic');
    expect(list).toContain('adventurePlay.map.outGold:{"amount":45}');
  });

  it('Given a prize tapped, then the confirm states what it COSTS — the rest of the chest — before it is sent', () => {
    const onChoice = vi.fn();
    render(<NodeScreen state={chest()} run={run()} world={1} busy={false} onChoice={onChoice} onLeave={() => {}} />);
    fireEvent.click(screen.getByTestId('treasure-chest'));
    fireEvent.click(screen.getByTestId('treasure-offer-1'));
    const dialog = screen.getByTestId('treasure-confirm');
    expect(dialog.textContent).toContain('adventurePlay.relic.phoenix-feather');
    expect(dialog.textContent).toContain('adventurePlay.node.chestGiveUp:{"count":2}');
    expect(onChoice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('treasure-confirm-take'));
    expect(onChoice).toHaveBeenCalledWith(1);
  });

  /**
   * framer-motion writes `opacity` inline on the element it animates, so an
   * `opacity-*` CLASS on that same element never lands: the passed prizes were
   * meant to fade back and stayed at full strength next to the one taken.
   */
  it('Given an answered chest, then the passed prizes are not dimmed with a class the motion layer overwrites', () => {
    render(<NodeScreen state={chest({ taken: 0 })} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('treasure-offer-2').className).not.toContain('opacity-45');
    expect(screen.getByTestId('treasure-offer-2').className).toContain('grayscale');
  });

  it('Given the sealed-chest answer, then it says it pays NOTHING and sends the skip index', () => {
    const onChoice = vi.fn();
    render(<NodeScreen state={chest()} run={run()} world={1} busy={false} onChoice={onChoice} onLeave={() => {}} />);
    fireEvent.click(screen.getByTestId('treasure-chest'));
    fireEvent.click(screen.getByTestId('treasure-skip'));
    expect(screen.getByTestId('treasure-confirm').textContent).toContain('adventurePlay.node.chestSkipDesc');
    fireEvent.click(screen.getByTestId('treasure-confirm-take'));
    expect(onChoice).toHaveBeenCalledWith(3);
  });

  it('Given a reload onto an answered chest, then the taken prize is marked and the ones passed stay on screen', () => {
    render(<NodeScreen state={chest({ taken: 0 })} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('treasure-offer-0').dataset.state).toBe('taken');
    expect(screen.getByTestId('treasure-offer-2').dataset.state).toBe('passed');
    // The cost of the pick is still legible — the alternatives are not hidden.
    expect(screen.getByTestId('treasure-offers').textContent).toContain('adventurePlay.node.chestPassed');
    expect(screen.getByTestId('node-leave').textContent).toContain('adventurePlay.node.continue');
  });

  it('Given a taken prize, then the screen STATES what the chest paid — on a reload too, with no diff to read', () => {
    render(<NodeScreen state={chest({ taken: 2 })} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('treasure-ledger').textContent).toContain('adventurePlay.map.outGold:{"amount":"\u200e+45"}');
  });

  it('Given a relic taken, then the ledger says it joined the relics', () => {
    render(<NodeScreen state={chest({ taken: 0 })} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('treasure-ledger').textContent).toContain('adventurePlay.node.relicAdded');
  });

  it('Given the GOLD prize taken, then the taken row never claims a relic joined the collection', () => {
    render(<NodeScreen state={chest({ taken: 2 })} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('treasure-offer-2').textContent).not.toContain('adventurePlay.node.relicAdded');
    expect(screen.getByTestId('treasure-offer-2').textContent).toContain('adventurePlay.map.outGold');
  });

  it('Given a skipped chest, then the screen says so and every prize reads as passed', () => {
    render(<NodeScreen state={chest({ taken: 3 })} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('node-screen-treasure').textContent).toContain('adventurePlay.node.chestSkipped');
    expect(screen.getByTestId('treasure-offer-0').dataset.state).toBe('passed');
  });

  it('Given an answered chest, then no prize can be taken a second time', () => {
    const onChoice = vi.fn();
    render(<NodeScreen state={chest({ taken: 2 })} run={run()} world={1} busy={false} onChoice={onChoice} onLeave={() => {}} />);
    fireEvent.click(screen.getByTestId('treasure-offer-0'));
    expect(screen.queryByTestId('treasure-confirm')).toBeNull();
    expect(onChoice).not.toHaveBeenCalled();
  });

  it('Given a pre-choice run token, then its single granted prize still reads correctly', () => {
    const onLeave = vi.fn();
    render(<NodeScreen state={{ kind: 'treasure', offers: [], relic: 'phoenix-feather' }} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={onLeave} />);
    expect(screen.queryByTestId('treasure-prize')).toBeNull();
    fireEvent.click(screen.getByTestId('node-open'));
    const prize = screen.getByTestId('treasure-prize');
    expect(prize.textContent).toContain('adventurePlay.loot.rarity.epic');
    expect(prize.textContent).toContain('adventurePlay.relic.phoenix-feather');
    expect(prize.textContent).toContain('adventurePlay.relicDesc.phoenix-feather');
    fireEvent.click(screen.getByTestId('node-leave'));
    expect(onLeave).toHaveBeenCalled();
  });

  it('Given a pre-choice gold chest, then the amount is stated once it is open', () => {
    render(<NodeScreen state={{ kind: 'treasure', offers: [], gold: 45 }} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    fireEvent.click(screen.getByTestId('treasure-chest'));
    expect(screen.getByTestId('treasure-prize').textContent).toContain('adventurePlay.map.treasureGold:{"amount":45}');
  });
});

describe('Event screen', () => {
  it('Given a three-choice event, then each button carries its own honest outcome line', () => {
    const onChoice = vi.fn();
    render(<NodeScreen state={{ kind: 'event', id: 'dusty-library', choices: 3 }} run={run()} world={1} busy={false} onChoice={onChoice} onLeave={() => {}} />);
    expect(screen.getByTestId('node-screen-event').textContent).toContain('adventurePlay.map.event.dusty-library.body');
    expect(screen.getByTestId('event-choice-0').textContent).toContain('adventurePlay.map.event.dusty-library.c0');
    expect(screen.getByTestId('event-choice-2').textContent).toContain('adventurePlay.map.event.dusty-library.c2');
    fireEvent.click(screen.getByTestId('event-choice-2'));
    expect(onChoice).toHaveBeenCalledWith(2);
  });

  it('Given a reload onto a resolved event, then it names the choice instead of claiming nothing happened', () => {
    // The payout landed before the page came back, so there is no diff left to print.
    render(<NodeScreen state={{ kind: 'event', id: 'crossroads-bard', choices: 3, taken: 1 }} run={run({ gold: 125 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const out = screen.getByTestId('event-outcome');
    expect(out.textContent).toContain('adventurePlay.node.alreadyTaken');
    expect(out.textContent).toContain('adventurePlay.map.event.crossroads-bard.c1');
    expect(out.textContent).not.toContain('outNothing');
  });

  it('Given a gamble that went badly, then the outcome shows the hearts it really cost', () => {
    const before = run();
    const { rerender } = render(<NodeScreen state={{ kind: 'event', id: 'stone-riddle', choices: 2 }} run={before} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    rerender(<NodeScreen state={{ kind: 'event', id: 'stone-riddle', choices: 2, taken: 0, outcome: { hp: -2, gold: 20 } }}
      run={run({ hp: 1, gold: 120 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const out = screen.getByTestId('event-outcome');
    expect(out.textContent).toContain('adventurePlay.map.outHp:{"amount":"\u200e-2"}');
    expect(out.textContent).toContain('adventurePlay.map.outGold:{"amount":"\u200e+20"}');
  });
});

describe('Event choices state gain and cost before the tap', () => {
  it('Given a sure trade, then the button carries the cost chip beside the gain chip', () => {
    render(<NodeScreen state={{ kind: 'event', id: 'spilled-inkwell', choices: 2 }} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const trade = screen.getByTestId('event-choice-0');
    expect(trade.textContent).toContain('adventurePlay.map.outMaxHp:{"amount":1}');
    expect(trade.textContent).toContain('adventurePlay.map.outHp:{"amount":"\u200e-1"}');
  });

  it('Given a gamble, then both branches are on the button, joined by an explicit "or" — never merged', () => {
    render(<NodeScreen state={{ kind: 'event', id: 'broken-cart', choices: 2 }} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const risky = screen.getByTestId('event-choice-1');
    expect(risky.textContent).toContain('adventurePlay.node.hintOr');
    expect(risky.textContent).toContain('adventurePlay.map.outGold:{"amount":"\u200e+100"}');
    expect(risky.textContent).toContain('adventurePlay.map.outHp:{"amount":"\u200e-2"}');
    // and the sure choice beside it is NOT dressed as a gamble
    expect(screen.getByTestId('event-choice-0').textContent).not.toContain('adventurePlay.node.hintOr');
  });

  it('Given an event with no table on the client, then the buttons still render with their label alone', () => {
    render(<NodeScreen state={{ kind: 'event', id: 'no-such-event', choices: 2 }} run={run()} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('event-choice-0').textContent).toContain('adventurePlay.map.event.no-such-event.c0');
  });
});

describe('Shop legibility of a row you cannot afford', () => {
  it('Given too little gold, then the shortfall stays full-contrast — only the goods are dimmed', () => {
    render(<NodeScreen state={{ kind: 'shop', items, bought: [] }} run={run({ gold: 10 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const row = screen.getByTestId('shop-item-1');
    // The card itself must never carry the desaturation: it would grey the pink
    // "80 gold short" line, which is the one thing the player needs to read.
    expect(row.className).not.toContain('grayscale');
    expect(screen.getByTestId('shop-item-goods-1').className).toContain('grayscale');
    expect(row.textContent).toContain('adventurePlay.node.shortBy:{"amount":130}');
  });
});

describe('Campfire never dresses a wasted choice as the best one', () => {
  it('Given full hearts, then the heal card is flagged dead and stops looking like the primary action', () => {
    render(<NodeScreen state={{ kind: 'rest', heal: 2 }} run={run({ hp: 5, maxHp: 5 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const heal = screen.getByTestId('rest-choice-0');
    expect(heal.dataset.dead).toBe('true');
    expect(heal.textContent).toContain('adventurePlay.node.restFull');
    // the other two still stand as real offers
    expect(screen.getByTestId('rest-choice-1').dataset.dead).toBeUndefined();
  });

  /**
   * The dead card dimmed itself with `opacity-45`, and framer-motion's `animate`
   * writes `opacity: 1` inline on the same element — so on screen the wasted
   * choice painted as the brightest, most primary card of the three.
   */
  it('Given full hearts, then the dead heal card does not paint in the live lime fill', () => {
    render(<NodeScreen state={{ kind: 'rest', heal: 2 }} run={run({ hp: 5, maxHp: 5 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    const heal = screen.getByTestId('rest-choice-0');
    expect(heal.className).not.toContain('bg-neo-lime');
    expect(screen.getByTestId('rest-choice-1').className).toContain('bg-neo-pink');
  });

  it('Given hearts to spare, then the heal card is a live offer', () => {
    render(<NodeScreen state={{ kind: 'rest', heal: 2 }} run={run({ hp: 2, maxHp: 5 })} world={1} busy={false} onChoice={() => {}} onLeave={() => {}} />);
    expect(screen.getByTestId('rest-choice-0').dataset.dead).toBeUndefined();
  });
});
