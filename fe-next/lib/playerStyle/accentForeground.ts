/**
 * Pick a readable text/icon color (black or white) to sit on top of an accent
 * background, using the WCAG 2.x relative-luminance contrast formula.
 *
 * Why max-contrast rather than a luminance cutoff: borderline accents (mid
 * blues/greens) sit right on any naive threshold. We compute the contrast ratio
 * against BOTH black and white and return whichever is higher — that's the
 * choice most likely to clear AA, and it's the same amount of code.
 *
 * Consumed by applyAccentVar to set `--accent-foreground` alongside `--accent`,
 * so any `bg-accent text-accent-foreground` surface stays legible no matter
 * which player style is active.
 */

const BLACK = '#000000';
const WHITE = '#ffffff';

/** Parse a hex string (`#rgb`, `#rrggbb`, with/without `#`) → [r,g,b] 0-255, or null. */
function parseHex(input: string): [number, number, number] | null {
  const hex = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return [r, g, b];
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return null;
}

/** sRGB channel (0-1) → linear-light value, per WCAG. */
function linearize(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0 = black, 1 = white) of an [r,g,b] 0-255 color. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const R = linearize(r / 255);
  const G = linearize(g / 255);
  const B = linearize(b / 255);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Return `#000000` or `#ffffff` — whichever has the higher WCAG contrast ratio
 * against the given accent hex. Malformed input falls back to black (safe on the
 * light lime default).
 */
export function pickAccentForeground(accentHex: string): string {
  const rgb = parseHex(accentHex);
  if (!rgb) return BLACK;

  const L = relativeLuminance(rgb);
  // Contrast ratio = (Llighter + 0.05) / (Ldarker + 0.05).
  const contrastWithWhite = (1 + 0.05) / (L + 0.05);
  const contrastWithBlack = (L + 0.05) / 0.05;
  return contrastWithBlack >= contrastWithWhite ? BLACK : WHITE;
}
