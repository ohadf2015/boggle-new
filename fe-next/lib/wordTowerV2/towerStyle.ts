/**
 * The tower's LOOK, bought in the workshop. Pure: the Pixi floors
 * (apartmentArt.ts), the workshop banner and the in-run "upgrade ready" pop all
 * read it, so the style you unlock is the style you then build with.
 *
 * Workshop parts (gear.ts) used to be the only visible reward, and they were
 * trims: a plinth, a cornice, a rooftop. Players said upgrades should "change
 * the vibe of the building and its appearance completely" (Nov 2026), so every
 * few upgrades the WHOLE facade changes architecture: brick walk-up, brownstone,
 * art deco, glass, neon, palace, garden, gold.
 *
 * Read off the EMPIRE level (every built level in every district; a finished
 * district counts 25), so a new district never strips the look back.
 */
import { type Estate, slotLevels } from './estate';
import { PLOT_SLOTS } from './estateCatalog';

export type WindowShape = 'square' | 'arched' | 'tall' | 'curtain' | 'neon' | 'round';
export type Surface = 'brick' | 'stone' | 'fluted' | 'glass' | 'dark' | 'columns' | 'vines';

export interface TowerStyle {
  id: string;
  /** Empire levels needed. */
  at: number;
  /** [facade, trim] pairs; floors cycle through them. */
  facades: Array<[number, number]>;
  window: WindowShape;
  surface: Surface;
  /** Lit window colour (tenants). */
  lit: number;
  /** Dark window glass. */
  glass: number;
  /** Sign plaque fill. */
  plaque: number;
}

export const TOWER_STYLES: TowerStyle[] = [
  {
    id: 'walkup',
    at: 0,
    facades: [
      [0xff6b8b, 0xb3365a],
      [0x37e0ff, 0x117f99],
      [0xb58cff, 0x6d45b8],
      [0xbfff00, 0x6f9400],
      [0xff9f43, 0xb3621a],
      [0x4fe3b0, 0x1f8f6a],
    ],
    window: 'square',
    surface: 'brick',
    lit: 0xffe135,
    glass: 0x1b2a4a,
    plaque: 0xfffef0,
  },
  {
    id: 'brownstone',
    at: 4,
    facades: [
      [0xb5543c, 0x5e2417],
      [0x9c4a35, 0x4f1f14],
      [0xc0694a, 0x6b2e1d],
    ],
    window: 'arched',
    surface: 'stone',
    lit: 0xffc46b,
    glass: 0x22263a,
    plaque: 0xf6e7c8,
  },
  {
    id: 'deco',
    at: 9,
    facades: [
      [0xf1e3c2, 0xb88a2a],
      [0x1f3b4d, 0xd4a537],
      [0xe9d8b4, 0x8a6418],
    ],
    window: 'tall',
    surface: 'fluted',
    lit: 0xfff1a8,
    glass: 0x14202e,
    plaque: 0xffe9a8,
  },
  {
    id: 'glass',
    at: 15,
    facades: [
      [0x5fd4ff, 0x2a4a63],
      [0x7fb8ff, 0x24405e],
      [0x4fe3d0, 0x1d4b52],
    ],
    window: 'curtain',
    surface: 'glass',
    lit: 0xe6fbff,
    glass: 0x2a6f9a,
    plaque: 0xeaf8ff,
  },
  {
    id: 'neon',
    at: 22,
    facades: [
      [0x241338, 0xff3fd2],
      [0x13213a, 0x37e0ff],
      [0x1d1236, 0xbfff00],
    ],
    window: 'neon',
    surface: 'dark',
    lit: 0xff7be5,
    glass: 0x0b0e1c,
    plaque: 0xfff0fb,
  },
  {
    id: 'palace',
    at: 30,
    facades: [
      [0xf4efe6, 0xc9a24a],
      [0xe8e0d2, 0xa8822e],
    ],
    window: 'arched',
    surface: 'columns',
    lit: 0xffe7a3,
    glass: 0x2b2f45,
    plaque: 0xfff7e0,
  },
  {
    id: 'garden',
    at: 45,
    facades: [
      [0xd9f2e3, 0x2f9c63],
      [0xc7ead3, 0x1f7a4b],
    ],
    window: 'round',
    surface: 'vines',
    lit: 0xfff3b0,
    glass: 0x1d3a2e,
    plaque: 0xf3fff6,
  },
  {
    id: 'gold',
    at: 65,
    facades: [
      [0xffc629, 0x8a5a00],
      [0xffd65c, 0x9a6b00],
    ],
    window: 'tall',
    surface: 'fluted',
    lit: 0xffffff,
    glass: 0x3a2a05,
    plaque: 0xfff6c2,
  },
];

/** Every level built across the empire. */
export function empireLevel(e: Estate): number {
  return PLOT_SLOTS.reduce((sum, slot) => sum + slotLevels(e, slot), 0);
}

export function styleIndexFor(level: number): number {
  let i = 0;
  while (i + 1 < TOWER_STYLES.length && TOWER_STYLES[i + 1].at <= level) i += 1;
  return i;
}

export function towerStyleFor(level: number): TowerStyle {
  return TOWER_STYLES[styleIndexFor(level)];
}

export interface StyleProgress {
  style: TowerStyle;
  next: TowerStyle | null;
  /** Upgrades still to build before `next`. */
  toNext: number;
  /** 0..1 from this style's unlock to the next one. */
  progress01: number;
}

export function styleProgress(e: Estate): StyleProgress {
  const level = empireLevel(e);
  const i = styleIndexFor(level);
  const style = TOWER_STYLES[i];
  const next = TOWER_STYLES[i + 1] ?? null;
  if (!next) return { style, next: null, toNext: 0, progress01: 1 };
  return {
    style,
    next,
    toNext: next.at - level,
    progress01: Math.min(1, Math.max(0, (level - style.at) / (next.at - style.at))),
  };
}
