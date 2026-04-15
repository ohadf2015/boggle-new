/**
 * Adventure tile types — grid cell state and special tile configuration.
 */

export type TileType = 'standard' | 'gold' | 'ice' | 'bomb' | 'time' | 'locked' | 'rainbow' | 'chain' | 'multiplier';

export type TileActivationEffect =
  | 'melt'
  | 'explode'
  | 'collect'
  | 'timeBonus'
  | null;

export interface TileState {
  letter: string;
  type: TileType;
  isCleared: boolean;
  cascadeDelay?: number;
  isFrozen?: boolean;
  bonusTime?: number;
  activationEffect?: TileActivationEffect;
  activationTimestamp?: number;
}

export interface GridTileState extends TileState {
  id: string;
  row: number;
  col: number;
}

export interface SpecialTile {
  row: number;
  col: number;
  type: TileType;
}
