export interface RGB {
  r: number;
  g: number;
  b: number;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = lig - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/** Parse a CSS color string into 0–255 RGB. Supports #hex, hsl(), rgb(), and a bare "r g b" triplet. */
export function parseColor(input: string): RGB {
  const str = input.trim();

  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  const hsl = str.match(/^hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%\s*\)$/i);
  if (hsl) return hslToRgb(parseFloat(hsl[1]), parseFloat(hsl[2]), parseFloat(hsl[3]));

  const rgbFn = str.match(/^rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*\)$/i);
  if (rgbFn) return { r: +rgbFn[1], g: +rgbFn[2], b: +rgbFn[3] };

  const triplet = str.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/);
  if (triplet) return { r: +triplet[1], g: +triplet[2], b: +triplet[3] };

  throw new Error(`Unparseable color: "${input}"`);
}

/** WCAG relative luminance (0–1). Accepts a color string or already-parsed RGB. */
export function relativeLuminance(color: string | RGB): number {
  const { r, g, b } = typeof color === 'string' ? parseColor(color) : color;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio (1–21), order-independent. */
export function contrastRatio(a: string | RGB, b: string | RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
