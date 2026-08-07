/**
 * Word Tower — per-word colour + glyph contrast (pure, renderer-agnostic).
 *
 * What is LEFT of this module: each word gets its own deterministic colour and
 * every glyph gets a legible ink colour for the tile it sits on.
 *
 * What was REMOVED (2026-08-07): the vertical letter-chain model —
 * `buildTowerColumn`, `cellAltitudes`, `sharedConnectorLen`, `blendColors`,
 * `hexToHsl`. It rendered the tower as a single column of one-letter-per-row
 * tiles and tinted each Shiritori connector the blend of its two neighbouring
 * words. The Shiritori chain was retired (see `validateTowerWord`), which left
 * the connector-blend describing a mechanic that no longer existed and the
 * tower drawn as a 1-tile-wide spire. A word is now ONE horizontal floor —
 * see `towerFloor.ts`.
 */

/** HSL → packed 24-bit RGB int (Pixi-friendly). */
export function hslToHex(h: number, s: number, l: number): number {
  const hue = (((h % 360) + 360) % 360) / 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

/** Vibrant neo-brutalist saturation/lightness — bright enough for dark glyphs. */
const WORD_S = 0.72; // richer, less candy-bright — founder: tiles read too childish
const WORD_L = 0.5;
/** Golden angle: consecutive words land ~137.5° apart on the wheel → maximal,
 *  non-repeating hue separation so no two adjacent words ever look alike. */
const GOLDEN_ANGLE = 137.508;

/** Deterministic, distinct colour for the Nth word in the chain. */
export function wordColor(index: number): number {
  return hslToHex((index * GOLDEN_ANGLE) % 360, WORD_S, WORD_L);
}

/** Glyph colour that stays legible on a given tile fill (relative luminance). */
export function textColorOn(hex: number): number {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? 0x14141f : 0xfffef0;
}

/** Packed 24-bit RGB int → HSL ({ h: 0–360, s/l: 0–1 }). Inverse of
 *  {@link hslToHex}; used to assert material/grading properties. */
export function hexToHsl(hex: number): { h: number; s: number; l: number } {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}
