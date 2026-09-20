/**
 * The empire's building catalog. Each district is five plots (Coin Master's
 * five village items); a plot's SLOT decides the perk it grants (estate.ts
 * perksFromEstate), its BUILDING is the art + name that slot wears in that
 * district. Ids are stable art keys; i18n keys live under
 * `wordTowerV2.estate.{district,building}.<id>`.
 */

export const PLOT_SLOTS = ['foundation', 'craneYard', 'vault', 'insurance', 'landmark'] as const;
export type PlotSlot = (typeof PLOT_SLOTS)[number];

export const MAX_PLOT_LEVEL = 5;
export const MAX_DISTRICT = 10;

export interface BuildingDef {
  slot: PlotSlot;
  /** Stable art id (e.g. `pier-footings`) — also the i18n key suffix. */
  id: string;
  i18nKey: string;
}

export interface DistrictDef {
  /** 1-based, matches `Estate.district`. */
  index: number;
  id: string;
  i18nKey: string;
  buildings: BuildingDef[];
}

/** [district id, [foundation, craneYard, vault, insurance, landmark] building ids]. */
const RAW: Array<[string, [string, string, string, string, string]]> = [
  ['dockside', ['pier-footings', 'dock-crane', 'fish-market', 'lighthouse', 'ferry-terminal']],
  ['old-town', ['stone-cellar', 'timber-hoist', 'guild-bank', 'watch-house', 'clock-tower']],
  ['market-row', ['brick-arcade', 'cargo-lift', 'bazaar', 'fire-station', 'grand-bazaar-dome']],
  ['garden-heights', ['terrace-walls', 'garden-crane', 'greenhouse-bank', 'rain-shelter', 'botanic-spire']],
  ['rail-yard', ['rail-bed', 'gantry-crane', 'freight-depot', 'signal-box', 'central-station']],
  ['neon-strip', ['steel-piles', 'neon-rig', 'arcade-vault', 'security-hub', 'neon-tower']],
  ['harbor-lights', ['sea-wall', 'container-crane', 'customs-house', 'coast-guard', 'harbor-bridge']],
  ['glass-quarter', ['deep-caissons', 'tower-crane', 'trading-floor', 'insurance-tower', 'glass-pyramid']],
  ['sky-gardens', ['sky-anchors', 'sky-hoist', 'cloud-bank', 'storm-shield', 'hanging-gardens']],
  ['summit', ['bedrock-core', 'summit-crane', 'golden-vault', 'aegis-dome', 'word-spire']],
];

export const DISTRICTS: DistrictDef[] = RAW.map(([id, buildings], i) => ({
  index: i + 1,
  id,
  i18nKey: `wordTowerV2.estate.district.${id}`,
  buildings: buildings.map((b, s) => ({ slot: PLOT_SLOTS[s], id: b, i18nKey: `wordTowerV2.estate.building.${b}` })),
}));

export function districtDef(district: number): DistrictDef {
  const i = Math.min(MAX_DISTRICT, Math.max(1, Math.floor(district) || 1)) - 1;
  return DISTRICTS[i];
}

export function buildingFor(district: number, slot: PlotSlot): BuildingDef {
  return districtDef(district).buildings[PLOT_SLOTS.indexOf(slot)];
}
