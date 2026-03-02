/**
 * ComboTracker — immutable combo level tracking with Phaser-native hex colours.
 *
 * The existing `comboColors.ts` returns Tailwind class strings, which are
 * meaningless in canvas. This module mirrors the same colour palette as
 * integer hex values (0xRRGGBB) that Phaser's Graphics and Text APIs accept.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComboTracker {
  readonly level: number;
}

export interface ComboHexColors {
  /** 24-bit integer fill colour for the tile background (0xRRGGBB) */
  fillColor: number;
  /** 24-bit integer border / stroke colour */
  borderColor: number;
  /** 24-bit integer for text drawn on top */
  textColor: number;
  /** Shadow/glow colour for path trails */
  glowColor: number;
}

// ─── Colour palette ───────────────────────────────────────────────────────────
// Mirrors the neo-brutalist palette from comboColors.ts, as canvas hex integers.
// neo-lime    #B8FF00  neo-pink-light #FFB3D1  neo-pink #FF1493
// neo-red     #FF2D20  neo-cyan       #00FFFF  neo-cyan-muted #00CCCC
// neo-black   #0D0D0D  neo-white      #FFFFFF

const PALETTE: ComboHexColors[] = [
  // level 0: lime (no combo)
  { fillColor: 0xb8ff00, borderColor: 0x0d0d0d, textColor: 0x0d0d0d, glowColor: 0xb8ff00 },
  // level 1: pink-light
  { fillColor: 0xffb3d1, borderColor: 0x0d0d0d, textColor: 0x0d0d0d, glowColor: 0xffb3d1 },
  // level 2: pink
  { fillColor: 0xff1493, borderColor: 0x0d0d0d, textColor: 0xffffff, glowColor: 0xff1493 },
  // level 3: red (hot!)
  { fillColor: 0xff2d20, borderColor: 0x0d0d0d, textColor: 0xffffff, glowColor: 0xff2d20 },
  // level 4: cyan (high)
  { fillColor: 0x00ffff, borderColor: 0x0d0d0d, textColor: 0x0d0d0d, glowColor: 0x00ffff },
  // level 5: cyan-muted (max bonus)
  { fillColor: 0x00cccc, borderColor: 0x0d0d0d, textColor: 0x0d0d0d, glowColor: 0x00cccc },
  // level 6: lime again (success)
  { fillColor: 0xb8ff00, borderColor: 0x0d0d0d, textColor: 0x0d0d0d, glowColor: 0xb8ff00 },
  // level 7: rainbow — approximate as gold for canvas rendering
  { fillColor: 0xffd700, borderColor: 0x0d0d0d, textColor: 0xffffff, glowColor: 0xffd700 },
  // level 8: rainbow with strobe — bright orange
  { fillColor: 0xff6b35, borderColor: 0x0d0d0d, textColor: 0xffffff, glowColor: 0xff6b35 },
  // level 9+: intense — magenta
  { fillColor: 0xff00ff, borderColor: 0x0d0d0d, textColor: 0xffffff, glowColor: 0xff00ff },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export function createComboTracker(): ComboTracker {
  return { level: 0 };
}

export function incrementCombo(tracker: ComboTracker): ComboTracker {
  return { level: tracker.level + 1 };
}

export function resetCombo(tracker: ComboTracker): ComboTracker {
  return { ...tracker, level: 0 };
}

export function getComboLevel(tracker: ComboTracker): number {
  return tracker.level;
}

export function getComboHexColors(level: number): ComboHexColors {
  const index = Math.min(level, PALETTE.length - 1);
  return PALETTE[index];
}
