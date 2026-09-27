/**
 * Milestone chests — every Nth chest gets a special opening ceremony, even
 * when the regular tier cycle would have given an ordinary wood/silver/gold.
 * Small numeric trigger, big perceptual payoff: the rare drops feel rare.
 */
export const MILESTONE_CHEST_NUMBERS: readonly number[] = [10, 25, 50, 100, 200] as const;

const SET = new Set(MILESTONE_CHEST_NUMBERS);

export function milestoneForChest(chestNumber: number): number | null {
  return SET.has(chestNumber) ? chestNumber : null;
}
