/**
 * Word Tower — tower SKINS (pure, renderer-agnostic).
 *
 * A skin is an alternate per-zone building-material palette. It deliberately
 * stays ON the founder's "mature materials, not childish candy" rule — each skin
 * is a coherent material family (brushed gold, oxidised copper, pale marble,
 * black onyx, aurora alloy) graded dark as you climb, exactly like the default.
 *
 * Skins are a VARIABLE-REWARD progression hook: each unlocks at a personal-best
 * height milestone, so every few runs the climb pays off with a brand-new tower
 * look the player gets to equip. No purchase, no loot box — pure skill payoff.
 */
import { ZONE_MATERIAL, type ZoneMaterialPalette } from './blockGrade';

export type TowerSkinId = 'classic' | 'copper' | 'marble' | 'gold' | 'onyx' | 'aurora';

export interface TowerSkin {
  id: TowerSkinId;
  /** i18n key for the display name. */
  nameKey: string;
  /** i18n key for the one-line flavour blurb. */
  blurbKey: string;
  /** Personal-best height (m) required to unlock. 0 = always available. */
  unlockAtM: number;
  /** Six mature zone materials, city→galaxy (packed 24-bit RGB). */
  palette: ZoneMaterialPalette;
  /** A representative accent (the city material) for swatches/chips. */
  swatch: number;
}

export const DEFAULT_SKIN_ID: TowerSkinId = 'classic';

/**
 * Ordered by unlock height so the picker + unlock cadence read as a ladder.
 * Each palette keeps the light→dark climb (city bright, galaxy near-black).
 */
export const TOWER_SKINS: TowerSkin[] = [
  {
    id: 'classic',
    nameKey: 'wordTower.skin.classic.name',
    blurbKey: 'wordTower.skin.classic.blurb',
    unlockAtM: 0,
    palette: ZONE_MATERIAL,
    swatch: ZONE_MATERIAL.city,
  },
  {
    id: 'copper',
    nameKey: 'wordTower.skin.copper.name',
    blurbKey: 'wordTower.skin.copper.blurb',
    unlockAtM: 120,
    palette: {
      city: 0xb87333, // bright copper
      sky: 0x9c5a2c, // weathered copper
      stratosphere: 0x7d4a2a, // patina-edged bronze
      orbit: 0x5a3a2c, // dark bronze
      nebula: 0x46322c, // oxidised brown
      galaxy: 0x241a16, // near-black forged
    },
    swatch: 0xb87333,
  },
  {
    id: 'marble',
    nameKey: 'wordTower.skin.marble.name',
    blurbKey: 'wordTower.skin.marble.blurb',
    unlockAtM: 320,
    palette: {
      city: 0xe8e4dc, // pale marble
      sky: 0xc9c6c0, // grey-veined stone
      stratosphere: 0xa7a6ad, // cool slate
      orbit: 0x7c7d88, // basalt
      nebula: 0x55525e, // dark stone
      galaxy: 0x2a2730, // obsidian marble
    },
    swatch: 0xe8e4dc,
  },
  {
    id: 'gold',
    nameKey: 'wordTower.skin.gold.name',
    blurbKey: 'wordTower.skin.gold.blurb',
    unlockAtM: 650,
    palette: {
      city: 0xf2c14e, // brushed gold
      sky: 0xd9a531, // deep gold
      stratosphere: 0xb5832a, // antique gold
      orbit: 0x8a6324, // bronzed gold
      nebula: 0x5e441f, // dim gilt
      galaxy: 0x2e2212, // blackened gold leaf
    },
    swatch: 0xf2c14e,
  },
  {
    id: 'onyx',
    nameKey: 'wordTower.skin.onyx.name',
    blurbKey: 'wordTower.skin.onyx.blurb',
    unlockAtM: 1100,
    palette: {
      city: 0x4a4e57, // graphite
      sky: 0x3d414a, // charcoal steel
      stratosphere: 0x33363e, // gunmetal
      orbit: 0x282a31, // deep slate
      nebula: 0x1d1f25, // near-black
      galaxy: 0x101116, // onyx
    },
    swatch: 0x4a4e57,
  },
  {
    id: 'aurora',
    nameKey: 'wordTower.skin.aurora.name',
    blurbKey: 'wordTower.skin.aurora.blurb',
    unlockAtM: 1900,
    palette: {
      city: 0x2f9e8f, // teal alloy
      sky: 0x2b8aa0, // cyan steel
      stratosphere: 0x3a6fb0, // electric indigo
      orbit: 0x5b4fb8, // violet hull
      nebula: 0x7341a8, // magenta alloy
      galaxy: 0x2a1b3d, // deep nebula
    },
    swatch: 0x3a6fb0,
  },
];

const SKIN_BY_ID: Record<string, TowerSkin> = Object.fromEntries(TOWER_SKINS.map((s) => [s.id, s]));

/** Look up a skin by id; falls back to classic for unknown ids (defensive). */
export function towerSkin(id: TowerSkinId): TowerSkin {
  return SKIN_BY_ID[id] ?? SKIN_BY_ID.classic!;
}

/** The active material palette for a skin (classic for unknown ids). */
export function skinPalette(id: TowerSkinId): ZoneMaterialPalette {
  return towerSkin(id).palette;
}

/** Has the player climbed high enough (personal best, m) to own this skin? */
export function isSkinUnlocked(id: TowerSkinId, bestHeightM: number): boolean {
  return bestHeightM >= towerSkin(id).unlockAtM;
}

/** Every skin owned at this personal-best height, in ladder order. */
export function unlockedSkinIds(bestHeightM: number): TowerSkinId[] {
  return TOWER_SKINS.filter((s) => bestHeightM >= s.unlockAtM).map((s) => s.id);
}

/**
 * The single skin freshly earned by climbing from `prevBestM` to `newBestM` this
 * run — the "NEW SKIN UNLOCKED" beat. When several thresholds are leapt at once
 * we headline only the HIGHEST (most impressive) one. Returns null when nothing
 * new was crossed (so it never double-grants).
 */
export function newlyUnlockedSkin(prevBestM: number, newBestM: number): TowerSkin | null {
  if (newBestM <= prevBestM) return null;
  const crossed = TOWER_SKINS.filter((s) => s.unlockAtM > 0 && s.unlockAtM > prevBestM && s.unlockAtM <= newBestM);
  if (crossed.length === 0) return null;
  return crossed.reduce((hi, s) => (s.unlockAtM > hi.unlockAtM ? s : hi));
}
