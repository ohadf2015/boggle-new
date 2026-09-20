/**
 * The empire screen's art + copy resolution, pure so it can be tested against
 * the files actually on disk.
 *
 * The art pack ships THREE district themes (downtown / harbor / neon) and the
 * catalog has TEN districts, so districts cycle the three sets — a district
 * always looks like a district, and `estateArt.test.ts` proves every
 * (district, slot, level) resolves to a file that exists.
 */
import {
  type Estate,
  type PlotSlot,
  type Perks,
  canUpgrade,
  emptyEstate,
  perksFromEstate,
} from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL, PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';

const BASE = '/images/word-tower-v2/empire';

export interface ArtSet {
  id: string;
  backdrop: string;
  /** One building type per slot, in PLOT_SLOTS order. */
  types: [string, string, string, string, string];
}

/**
 * Ordered so district 1 (Dockside) gets the harbor theme and district 2 (Old
 * Town) the downtown one — the skyline should agree with the district's name.
 */
export const ART_SETS: ArtSet[] = [
  { id: 'harbor', backdrop: `${BASE}/bg-harbor.webp`, types: ['warehouse', 'boathouse', 'fishmarket', 'lighthouse', 'ferry'] },
  { id: 'downtown', backdrop: `${BASE}/bg-downtown.webp`, types: ['bakery', 'apartments', 'library', 'clocktower', 'garden'] },
  { id: 'neon', backdrop: `${BASE}/bg-neon.webp`, types: ['arcade', 'hotel', 'club', 'radiomast', 'skytower'] },
];

export const DAMAGE_OVERLAY = `${BASE}/fx-damaged.webp`;
export const ITEM = {
  coin: `${BASE}/coin.webp`,
  coinStack: `${BASE}/coin-stack.webp`,
  shield: `${BASE}/shield.webp`,
  brick: `${BASE}/golden-brick.webp`,
  blueprint: `${BASE}/blueprint.webp`,
  repair: `${BASE}/repair.webp`,
  revenge: `${BASE}/revenge.webp`,
  crown: `${BASE}/crown.webp`,
  star: `${BASE}/fx-star.webp`,
  dust: `${BASE}/fx-dust-puff.webp`,
} as const;

export function artSetFor(district: number): ArtSet {
  const d = Math.max(1, Math.floor(district) || 1);
  return ART_SETS[(d - 1) % ART_SETS.length];
}

export function backdropFor(district: number): string {
  return artSetFor(district).backdrop;
}

export type PlotStage = 'l0' | 'l2' | 'l4' | 'l5';

/** Lot -> scaffold -> complete -> landmark, the four stages every type was drawn in. */
export function plotStage(level: number): PlotStage {
  if (level >= MAX_PLOT_LEVEL) return 'l5';
  if (level >= 4) return 'l4';
  if (level >= 2) return 'l2';
  return 'l0';
}

export function buildingType(district: number, slot: PlotSlot): string {
  return artSetFor(district).types[PLOT_SLOTS.indexOf(slot)];
}

export function buildingSprite(district: number, slot: PlotSlot, level: number): string {
  return `${BASE}/bld-${buildingType(district, slot)}-${plotStage(level)}.webp`;
}

/**
 * The name to print under a plot. It follows the ART, not the catalog: the
 * player reads the picture, so a lighthouse must not be labelled "Guild Bank".
 */
export function buildingNameKey(district: number, slot: PlotSlot): string {
  return `wordTowerV2.estate.art.${buildingType(district, slot)}`;
}

// ── Perk copy ────────────────────────────────────────────────────────────────

export interface PerkLine {
  key: string;
  params: { n: number };
}

/** 0.925 -> 8. The epsilon keeps a float-tail .07499999 off a whole percent. */
const pct = (mult: number) => Math.round(Math.abs(1 - mult) * 100 + 1e-6);

/** Perks an estate would have with only `slot` built to `level` in `district`. */
function perksAt(district: number, slot: PlotSlot, level: number): Perks {
  const estate: Estate = {
    ...emptyEstate(),
    district,
    plots: PLOT_SLOTS.map((s) => ({ slot: s, level: s === slot ? level : 0, damaged: false })),
  };
  return perksFromEstate(estate);
}

const LINE_VALUE: Record<PlotSlot, (p: Perks) => number> = {
  foundation: (p) => pct(p.swayMult),
  craneYard: (p) => pct(p.perfectWindowMult),
  vault: (p) => pct(p.coinMult),
  insurance: (p) => p.shieldCap - 2,
  landmark: (p) => pct(p.scoreMult),
};

/**
 * What the NEXT level of this plot gives, as one short line. A maxed plot
 * quotes what it already holds.
 */
export function nextPerkLine(district: number, slot: PlotSlot, level: number): PerkLine {
  const target = Math.min(MAX_PLOT_LEVEL, level + 1);
  return { key: `wordTowerV2.estate.perkLine.${slot}`, params: { n: LINE_VALUE[slot](perksAt(district, slot, target)) } };
}

export interface PerkChip {
  id: PlotSlot;
  key: string;
  params: { n: number };
}

/** Every perk that is no longer neutral, as a chip the run can show. */
export function perkChips(perks: Perks): PerkChip[] {
  const chips: PerkChip[] = [];
  for (const slot of PLOT_SLOTS) {
    const n = LINE_VALUE[slot](perks);
    if (n > 0) chips.push({ id: slot, key: `wordTowerV2.estate.chip.${slot}`, params: { n } });
  }
  return chips;
}

// ── "What's new" when you come back ──────────────────────────────────────────

export interface EstateNews {
  affordable: PlotSlot[];
  damaged: PlotSlot[];
  raids: number;
  hasNews: boolean;
}

export function whatsNew(estate: Estate, raids: number): EstateNews {
  const affordable = PLOT_SLOTS.filter((slot) => canUpgrade(estate, slot).ok);
  const damaged = estate.plots.filter((p) => p.damaged).map((p) => p.slot);
  return { affordable, damaged, raids, hasNews: raids > 0 || damaged.length > 0 || affordable.length > 0 };
}

/** 0..1 across the district's 25 possible levels — the header's progress bar. */
export function districtProgress(estate: Estate): number {
  const total = estate.plots.reduce((sum, p) => sum + p.level, 0);
  return Math.min(1, total / (PLOT_SLOTS.length * MAX_PLOT_LEVEL));
}
