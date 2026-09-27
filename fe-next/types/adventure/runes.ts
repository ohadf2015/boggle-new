/**
 * Rune inventory types.
 */

export interface PlayerRune {
  runeId: string;
  equipped: boolean;
}

export interface RuneInventory {
  fragments: number;
  runes: PlayerRune[];
}
