/**
 * The shelf a shop shows must not move under the player.
 *
 * `shopStock` draws its relics from the ones the run does NOT own, so every
 * relic bought at the counter used to change the pool the SAME shelf is
 * re-derived from: a reload inside the shop re-rolled slot 0 into a brand-new
 * relic that the screen then painted SOLD, and a second relic bought in one
 * visit could be charged against a different row than the one tapped.
 *
 * The contract these tests pin: within one visit the items are frozen at the
 * relics the run held when it ENTERED the node.
 */
import { describe, it, expect } from 'vitest';
import { applyNodeChoice, enterNodeState } from '../nodeResolve';
import { enterNode, freshRun, type RunPayload } from '../runToken';
import type { MapNode } from '../runMap';
import type { ShopItem } from '../shop';

const SHOP: MapNode = { id: 'r2l1', kind: 'shop', row: 2, lane: 1, next: ['r3l1'] };

const rich = (): RunPayload => enterNode({ ...freshRun(1, 'u1', 'seed-abc'), gold: 999 }, SHOP.id);
const shelfOf = (state: { kind: string }) => (state as { items: ShopItem[] }).items;
const label = (items: ShopItem[]) => items.map((i) => `${i.type}:${'id' in i ? i.id : i.amount}@${i.price}`);

describe('shop shelf stability', () => {
  it('shows the same items after a purchase is re-read (a reload inside the shop)', () => {
    const entered = enterNodeState(rich(), SHOP);
    const before = label(shelfOf(entered.state));

    const bought = applyNodeChoice(entered.run, SHOP, 0);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;

    const reread = enterNodeState(bought.run, SHOP);
    expect(label(shelfOf(reread.state))).toEqual(before);
    expect((reread.state as { bought: number[] }).bought).toEqual([0]);
  });

  it('charges the second relic of a visit against the row that was tapped', () => {
    const entered = enterNodeState(rich(), SHOP);
    const shelf = shelfOf(entered.state);
    const slot = shelf.findIndex((i, n) => i.type === 'relic' && n > 0);
    expect(slot).toBeGreaterThan(0);
    const wanted = shelf[slot];

    const first = applyNodeChoice(entered.run, SHOP, 0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = applyNodeChoice(first.run, SHOP, slot);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(label(shelfOf(second.state))).toEqual(label(shelf));
    expect(first.run.gold - second.run.gold).toBe(wanted.price);
    if (wanted.type === 'relic') expect(second.run.relics).toContain(wanted.id);
  });

  it('re-rolls the shelf for the NEXT shop, which the run enters owning more', () => {
    const entered = enterNodeState(rich(), SHOP);
    const first = applyNodeChoice(entered.run, SHOP, 0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const nextShop: MapNode = { id: 'r5l2', kind: 'shop', row: 5, lane: 2, next: [] };
    const later = enterNodeState(enterNode(first.run, nextShop.id), nextShop);
    const ids = shelfOf(later.state).flatMap((i) => (i.type === 'relic' ? [i.id] : []));
    // A shop never sells a relic the run already carries.
    for (const owned of first.run.relics) expect(ids).not.toContain(owned);
  });
});
