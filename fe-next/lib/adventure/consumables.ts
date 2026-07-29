/**
 * Consumable Items — one-time use items purchasable with gold.
 * Primary gold sink for post-upgrade players.
 */

export interface ConsumableItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  /** Gold cost per unit */
  cost: number;
  /** Max that can be held at once */
  maxStack: number;
  /** Which worlds this is available in (0 = all) */
  minWorld: number;
}

export const CONSUMABLES: ConsumableItem[] = [
  { id: 'extraHint', nameKey: 'adventure.consumables.extraHint.name', descriptionKey: 'adventure.consumables.extraHint.desc', icon: '💡', cost: 30, maxStack: 5, minWorld: 1 },
  { id: 'timerExtension', nameKey: 'adventure.consumables.timerExtension.name', descriptionKey: 'adventure.consumables.timerExtension.desc', icon: '⏱️', cost: 50, maxStack: 3, minWorld: 3 },
  { id: 'gridReroll', nameKey: 'adventure.consumables.gridReroll.name', descriptionKey: 'adventure.consumables.gridReroll.desc', icon: '🔄', cost: 75, maxStack: 3, minWorld: 3 },
  { id: 'bossShield', nameKey: 'adventure.consumables.bossShield.name', descriptionKey: 'adventure.consumables.bossShield.desc', icon: '🛡️', cost: 100, maxStack: 2, minWorld: 5 },
  { id: 'doubleGold', nameKey: 'adventure.consumables.doubleGold.name', descriptionKey: 'adventure.consumables.doubleGold.desc', icon: '✨', cost: 150, maxStack: 2, minWorld: 5 },
  { id: 'bossRevive', nameKey: 'adventure.consumables.bossRevive.name', descriptionKey: 'adventure.consumables.bossRevive.desc', icon: '❤️‍🔥', cost: 200, maxStack: 1, minWorld: 7 },
  { id: 'objectiveSkip', nameKey: 'adventure.consumables.objectiveSkip.name', descriptionKey: 'adventure.consumables.objectiveSkip.desc', icon: '⏭️', cost: 250, maxStack: 1, minWorld: 8 },
  { id: 'perfectStar', nameKey: 'adventure.consumables.perfectStar.name', descriptionKey: 'adventure.consumables.perfectStar.desc', icon: '⭐', cost: 500, maxStack: 1, minWorld: 10 },
];

export function getConsumable(id: string): ConsumableItem | undefined {
  return CONSUMABLES.find(c => c.id === id);
}

export function getAvailableConsumables(world: number): ConsumableItem[] {
  return CONSUMABLES.filter(c => c.minWorld <= world);
}

export function canAffordConsumable(id: string, gold: number): boolean {
  const item = getConsumable(id);
  return item !== undefined && gold >= item.cost;
}

export function getConsumableCost(id: string, quantity: number): number | null {
  const item = getConsumable(id);
  if (!item) return null;
  return item.cost * quantity;
}
