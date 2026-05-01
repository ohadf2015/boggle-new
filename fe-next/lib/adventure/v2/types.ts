export type TileId = number;

export interface Tile {
  id: TileId;
  letter: string;
  rarity: 'common' | 'uncommon' | 'rare';
  letterValue: number;
}

export type FsmState =
  | { type: 'idle' }
  | { type: 'player_compose'; word: string; tilesUsed: TileId[] }
  | { type: 'player_submit'; word: string; tilesUsed: TileId[] }
  | { type: 'player_resolve'; damage: number; tilesUsed: TileId[] }
  | { type: 'enemy_telegraph'; nextDamage: number; ms: number }
  | { type: 'enemy_resolve'; damage: number }
  | { type: 'tile_refresh'; replacedTileIds: TileId[] }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface CombatModel {
  heroHp: number;
  heroMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyAtk: number;
  tiles: Tile[];
  fsmState: FsmState;
}

export type Locale = 'en';
