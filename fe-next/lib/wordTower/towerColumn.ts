/**
 * Word Tower — vertical letter-chain model (pure, renderer-agnostic).
 *
 * The tower is a Shiritori chain: floor N's last letter === floor N+1's first
 * letter (the "connector"). Rendered as a single vertical column of one-letter-
 * per-row tiles, each WORD gets its own colour and every connector letter is
 * tinted the blend of its two neighbouring word colours — so the chain reads as
 * a continuous ribbon climbing the screen, recolouring at each join.
 *
 * No Pixi / DOM imports here so it stays trivially unit-testable; the scene
 * consumes {@link buildTowerColumn} + {@link wordColor} + {@link blendColors}.
 */

/** One row of the tower. `letter` cells carry a glyph; `brick` cells are the
 *  spoiler-free versus rows (rival words are hidden, only height is shown). */
export type ColumnCell =
  | { kind: 'letter'; char: string; color: number; shared: boolean }
  | { kind: 'brick'; color: number };

// Vibrant neo-brutalist saturation/lightness — bright enough for dark glyphs,
// chroma high enough that hue-blended connectors still read as "both colours".
const WORD_S = 0.72; // richer, less candy-bright — founder: tiles read too childish
const WORD_L = 0.5;
// Golden angle: consecutive words land ~137.5° apart on the wheel → maximal,
// non-repeating hue separation so no two adjacent words ever look alike.
const GOLDEN_ANGLE = 137.508;

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

/** Packed 24-bit RGB int → HSL ({ h: 0–360, s/l: 0–1 }). */
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

/** Deterministic, distinct colour for the Nth word in the chain. */
export function wordColor(index: number): number {
  return hslToHex((index * GOLDEN_ANGLE) % 360, WORD_S, WORD_L);
}

/** Blend two colours in HSL along the shorter hue arc — keeps chroma so the
 *  result reads as "a combination of both", not a muddy RGB average. */
export function blendColors(a: number, b: number): number {
  if (a === b) return a; // exact identity (and dodges round-trip rounding)
  const ca = hexToHsl(a);
  const cb = hexToHsl(b);
  let dh = cb.h - ca.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return hslToHex(ca.h + dh * 0.5, (ca.s + cb.s) / 2, (ca.l + cb.l) / 2);
}

/** Glyph colour that stays legible on a given tile fill (relative luminance). */
export function textColorOn(hex: number): number {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? 0x14141f : 0xfffef0;
}

/**
 * Flatten the floor list into the global bottom→top column of cells. Consecutive
 * words share their connector letter, so it is emitted exactly once and tinted
 * the blend of the two words. Empty-word floors (versus spoiler-free) become a
 * single brick cell. Array index === stable global row index (the tower is
 * append-only), which the scene uses as its sprite-registry key.
 */
export function buildTowerColumn(floors: ReadonlyArray<{ word: string }>): ColumnCell[] {
  const cells: ColumnCell[] = [];
  floors.forEach((floor, i) => {
    const color = wordColor(i);
    const chars = Array.from(floor.word ?? '');

    if (chars.length === 0) {
      cells.push({ kind: 'brick', color });
      return;
    }

    // Shared connector with the previous word: 1 char normally, 2 when the chain
    // continued through a vowel ([before][vowel]). Detected by matching the prev
    // word's tail to this word's head — merge those leading tiles (blend tint)
    // rather than duplicate them, so the chain reads as one continuous ribbon.
    let start = 0;
    if (i > 0) {
      const prev = Array.from(floors[i - 1].word ?? '');
      const conn = sharedConnectorLen(prev, chars);
      for (let k = 0; k < conn; k++) {
        const cell = cells[cells.length - conn + k];
        if (cell && cell.kind === 'letter') { cell.color = blendColors(cell.color, color); cell.shared = true; }
      }
      start = conn;
    }
    for (let j = start; j < chars.length; j++) {
      cells.push({ kind: 'letter', char: chars[j], color, shared: false });
    }
  });
  return cells;
}

/**
 * Cumulative altitude (m) for each cell emitted by {@link buildTowerColumn},
 * returned as a parallel array (same length, same order). Each cell is placed at
 * the mid-point of its floor's metre band, so the scene can grade every tile by
 * the biome at *its own* height (the tower spans city→space simultaneously).
 * Mirrors buildTowerColumn's emission exactly — connector letters are merged
 * into the previous floor, so they are NOT re-counted here.
 */
export function cellAltitudes(floors: ReadonlyArray<{ word: string; meters: number }>): number[] {
  const alts: number[] = [];
  let base = 0; // altitude at the bottom of the current floor
  floors.forEach((floor, i) => {
    const meters = floor.meters ?? 0;
    const chars = Array.from(floor.word ?? '');
    if (chars.length === 0) {
      alts.push(base + meters / 2); // brick floor → one cell at mid-band
      base += meters;
      return;
    }
    const start = i > 0 ? sharedConnectorLen(Array.from(floors[i - 1].word ?? ''), chars) : 0;
    const emitted = chars.length - start;
    for (let j = 0; j < emitted; j++) {
      const frac = emitted > 0 ? (j + 0.5) / emitted : 0.5;
      alts.push(base + meters * frac);
    }
    base += meters;
  });
  return alts;
}

/** Length of the shared chain connector between consecutive words (0, 1, or 2). */
export function sharedConnectorLen(prev: string[], cur: string[]): number {
  const pn = prev.length, cn = cur.length;
  if (pn >= 2 && cn >= 2 && cur[0] === prev[pn - 2] && cur[1] === prev[pn - 1]) return 2;
  if (pn >= 1 && cn >= 1 && cur[0] === prev[pn - 1]) return 1;
  return 0;
}
