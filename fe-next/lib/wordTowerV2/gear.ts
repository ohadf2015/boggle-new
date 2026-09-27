/**
 * What the empire looks like ON THE TOWER. Pure — the Pixi scene
 * (gearArt.ts) and the upgrade screen (PartArt.tsx) both read it, so the part
 * you buy in the workshop is the exact part you then see in the run.
 *
 * Each plot slot is a tower part:
 *   foundation -> a stepped plinth under the ground floor
 *   craneYard  -> the crane rail's paint and rigging
 *   vault      -> gold cornices on the floors
 *   insurance  -> steel braces up the tower's sides
 *   landmark   -> the rooftop: antenna, flag, dome, spire, crown
 *
 * `level` (0..5) is the shape; `material` is the finish. Both are read off
 * the EMPIRE total (finished districts count 5 per slot), so moving to a new
 * district never strips the tower bare — maxing a part moves it to the next
 * material instead.
 */
import { type Estate, slotLevels } from './estate';
import { MAX_PLOT_LEVEL, PLOT_SLOTS, type PlotSlot } from './estateCatalog';

export interface Material {
  id: string;
  main: number;
  trim: number;
  glow: number;
}

/** Ten finishes, one per five empire levels. */
export const MATERIALS: Material[] = [
  { id: 'brick', main: 0xc8553d, trim: 0x7a2e1f, glow: 0xffb38a },
  { id: 'steel', main: 0x9fb3c8, trim: 0x44546a, glow: 0xe6f2ff },
  { id: 'glass', main: 0x37e0ff, trim: 0x0f6d86, glow: 0xb8f6ff },
  { id: 'neon', main: 0xff4fd8, trim: 0x6a1a5c, glow: 0xffb3f0 },
  { id: 'marble', main: 0xf1ece2, trim: 0x9a9186, glow: 0xffffff },
  { id: 'copper', main: 0xd9824a, trim: 0x2f8f7a, glow: 0xffd2a8 },
  { id: 'jade', main: 0x3fcf8e, trim: 0x136b47, glow: 0xb5ffd9 },
  { id: 'obsidian', main: 0x3a2f5a, trim: 0x9b7bff, glow: 0xcdb8ff },
  { id: 'cloud', main: 0xdfe8ff, trim: 0x6b7fd6, glow: 0xffffff },
  { id: 'gold', main: 0xffc629, trim: 0x9a6b00, glow: 0xfff1a8 },
];

export interface GearPart {
  /** 0 = not built, 5 = full shape. */
  level: number;
  material: Material;
}

export type TowerGear = Record<PlotSlot, GearPart>;

export function gearFromEstate(e: Estate): TowerGear {
  const out = {} as TowerGear;
  for (const slot of PLOT_SLOTS) {
    const total = slotLevels(e, slot);
    out[slot] = {
      level: Math.min(MAX_PLOT_LEVEL, total),
      material: MATERIALS[Math.min(MATERIALS.length - 1, Math.floor(total / MAX_PLOT_LEVEL))],
    };
  }
  return out;
}

/** Braces are STEEL: on the first finish (brick) they must not read as a red edge. */
export const braceColour = (m: Material) => (m.id === 'brick' ? MATERIALS[1].main : m.main);

/** CSS colour for a material channel (the upgrade screen's SVG). */
export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
