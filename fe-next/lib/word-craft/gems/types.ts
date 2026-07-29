export type GemColor = 'amber' | 'ruby' | 'sapphire' | 'emerald';
export type GemRarity = 1 | 2 | 3;

export const GEM_COLORS: readonly GemColor[] = ['amber', 'ruby', 'sapphire', 'emerald'] as const;
export const GEM_RARITY_LABEL: Record<GemRarity, 'chip' | 'shard' | 'crown'> = {
  1: 'chip',
  2: 'shard',
  3: 'crown',
};
export const TRANSMUTE_COST = 3;
export const WIN_RARITY: GemRarity = 3;

export interface Gem {
  color: GemColor;
  rarity: GemRarity;
}

export interface GemCell extends Gem {
  row: number;
  col: number;
  /** Stable id for animation tracking */
  id: string;
}

export type GemInventory = Record<GemColor, Record<GemRarity, number>>;

export function emptyInventory(): GemInventory {
  return {
    amber: { 1: 0, 2: 0, 3: 0 },
    ruby: { 1: 0, 2: 0, 3: 0 },
    sapphire: { 1: 0, 2: 0, 3: 0 },
    emerald: { 1: 0, 2: 0, 3: 0 },
  };
}

export type AbilityKind = 'portal' | 'joker' | 'reroll';

export interface AbilityCard {
  /** Stable id per-roll for React keys */
  id: string;
  kind: AbilityKind;
  cost: Gem;
}

export interface GemHuntState {
  /** Active gem cells overlaid on the WordCraft board */
  gemCells: GemCell[];
  inventory: GemInventory;
  /** Ability cards offered for the current turn's pre-move shop */
  shop: AbilityCard[];
  /** Abilities purchased this turn — applied on submit */
  pendingAbilities: AbilityCard[];
  /** RNG state seed — same seed = same gem layout for reproducible play */
  seed: number;
  /** Bump every time gems are collected/transmuted for telemetry + UI */
  collectionTurn: number;
  /** When set, terminal state */
  outcome: 'won' | 'lost' | null;
}

export interface CollectedGem extends Gem {
  /** Source cell (so the UI can fly the gem from board to inventory) */
  fromRow: number;
  fromCol: number;
  /** Stable id from the original GemCell */
  cellId: string;
}
