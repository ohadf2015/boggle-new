export type TileId = number;

export interface Tile {
  id: TileId;
  letter: string;
  rarity: 'common' | 'uncommon' | 'rare';
  letterValue: number;
  /** If set, this tile is claimed by the bot and unselectable for player. */
  claimedBy?: 'bot' | null;
  /** Turns remaining on the claim before tile refreshes back to free. */
  claimTurnsRemaining?: number;
  /** Bot has it earmarked for a not-yet-completed word. Player can still tap to steal. */
  targetedBy?: 'bot' | null;
  /** Gold tile — letter value × 2 when used in damage calc. Sparkly visual. */
  isGold?: boolean;
}

export type FsmState =
  | { type: 'idle' }
  | { type: 'player_compose'; word: string; tilesUsed: TileId[] }
  | { type: 'player_submit'; word: string; tilesUsed: TileId[] }
  | { type: 'player_resolve'; damage: number; tilesUsed: TileId[] }
  | { type: 'bot_compose'; word: string; tilesClaimed: TileId[]; damage: number }
  | { type: 'bot_resolve'; damage: number }
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

export type Locale = 'en' | 'he';
