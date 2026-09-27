export const START_CHIPS = 100;
export const MIN_STAKE = 5;
export const CHIPS_PER_COIN = 10;

export interface ChipWallet {
  chips: number;
  busted: boolean;
}

export function initWallet(start?: number): ChipWallet {
  return {
    chips: start ?? START_CHIPS,
    busted: false,
  };
}

export function clampStake(w: ChipWallet, desired: number): number {
  return Math.max(MIN_STAKE, Math.min(desired, w.chips));
}

export function applyDelta(w: ChipWallet, delta: number): ChipWallet {
  const newChips = Math.max(0, w.chips + delta);
  return {
    chips: newChips,
    busted: newChips === 0,
  };
}

export function cashOutCoins(chips: number): number {
  return Math.floor(chips / CHIPS_PER_COIN);
}
