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
 * Downtown first, then neon, the harbour last: district 1 (Old Town) and 2
 * (Neon Strip) match their skylines, and the harbour no longer greets every
 * new player. Only the BACKDROP is read on the workshop screen now — the
 * five plots are drawn as tower parts (PartArt).
 */
export const ART_SETS: ArtSet[] = [
  { id: 'downtown', backdrop: `${BASE}/bg-downtown.webp`, types: ['bakery', 'apartments', 'library', 'clocktower', 'garden'] },
  { id: 'neon', backdrop: `${BASE}/bg-neon.webp`, types: ['arcade', 'hotel', 'club', 'radiomast', 'skytower'] },
  { id: 'harbor', backdrop: `${BASE}/bg-harbor.webp`, types: ['warehouse', 'boathouse', 'fishmarket', 'lighthouse', 'ferry'] },
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

// ── Plot identity: what a player recognises a plot BY ────────────────────────

/**
 * All fifteen `bld-<type>-l0.webp` are the same grey foundation slab, and the
 * `l2` scaffolds read as scaffolds first. So at build time the art alone can
 * not tell five plots apart — the identity has to come from somewhere else:
 *
 *  - a GHOST of the finished building standing on the empty lot (Coin Master
 *    shows unbuilt village items as a dim silhouette of the real thing), and
 *  - a per-type ICON on the name plate, which survives phone-size and
 *    colour-blindness where a silhouette alone might not.
 *
 * The ghost also fixes the second half of the problem: `plotStage` maps levels
 * 0 and 1 to the same file, so buying level 1 used to change nothing at all.
 * The ghost firms up instead — the plan is more real than it was.
 */
export type PlotIconId =
  | 'croissant' | 'apartments' | 'book' | 'clock' | 'flower'
  | 'fish' | 'lighthouse' | 'sailboat' | 'warehouse' | 'ship'
  | 'arcade' | 'bed' | 'skytower' | 'radio' | 'music';

/** One glyph per building type in the art pack. Keyed by the art id, not the slot. */
export const PLOT_ICONS: Record<string, PlotIconId> = {
  bakery: 'croissant',
  apartments: 'apartments',
  library: 'book',
  clocktower: 'clock',
  garden: 'flower',
  fishmarket: 'fish',
  lighthouse: 'lighthouse',
  boathouse: 'sailboat',
  warehouse: 'warehouse',
  ferry: 'ship',
  arcade: 'arcade',
  hotel: 'bed',
  skytower: 'skytower',
  radiomast: 'radio',
  club: 'music',
};

/** Damage first, then done, then "you can build this NOW", then "not yet". */
export type PlotState = 'damaged' | 'maxed' | 'affordable' | 'locked';

export interface PlotIdentity {
  type: string;
  /** The stage art actually on the ground. */
  sprite: string;
  /** The finished building, drawn faint above the lot — null once it is real. */
  ghost: string | null;
  ghostOpacity: number;
  icon: PlotIconId;
  state: PlotState;
}

export interface PlotIdentityInput {
  district: number;
  slot: PlotSlot;
  level: number;
  damaged: boolean;
  affordable: boolean;
}

/**
 * Ghost strength by level. Only the lot stage carries one: from level 2 the
 * scaffold sprites are already five different shapes, and a ghost on top of a
 * scaffold reads as mud rather than as a plan.
 */
const GHOST_OPACITY: Record<number, number> = { 0: 0.42, 1: 0.66 };

export function plotIdentity({ district, slot, level, damaged, affordable }: PlotIdentityInput): PlotIdentity {
  const type = buildingType(district, slot);
  const ghostOpacity = GHOST_OPACITY[level] ?? 0;
  return {
    type,
    sprite: buildingSprite(district, slot, level),
    ghost: ghostOpacity > 0 ? buildingSprite(district, slot, 4) : null,
    ghostOpacity,
    icon: PLOT_ICONS[type],
    state: damaged ? 'damaged' : level >= MAX_PLOT_LEVEL ? 'maxed' : affordable ? 'affordable' : 'locked',
  };
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
