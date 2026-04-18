/**
 * Shared design constants for all avatar SVG parts.
 * Ensures visual consistency across base, eyes, mouth, hair, accessories, and body.
 *
 * Anchor points (within viewBox 0 0 100 100):
 *   Face center: cx=50, cy=52
 *   Eye line:    cy=42, left cx=38, right cx=62
 *   Mouth line:  cy≈60 (range 57-70)
 *   Hair origin:  top of head, y≈14-30
 *   Body:        y≈68-100
 *   Blush:       cx=34/66, cy=50, r=6
 */

/** Outer stroke — face outline, hair silhouette, body, head accessories */
export const STROKE_OUTER = 2.8;

/** Inner stroke — eyes, mouth, facial accessories (glasses, monocle) */
export const STROKE_INNER = 2.2;

/** Detail stroke — subtle lines, highlights, secondary elements */
export const STROKE_DETAIL = 1.2;

/** Standard anchor coordinates */
export const ANCHORS = {
  faceCenter: { cx: 50, cy: 52 },
  eyeLeft: { cx: 38, cy: 42 },
  eyeRight: { cx: 62, cy: 42 },
  mouth: { cx: 50, cy: 60 },
  neckTop: 68,
  bodyBottom: 100,
} as const;

// ── Color utilities ──────────────────────────────────────

/** Darken a hex color by mixing toward black */
export function darken(hex: string, amount = 0.25): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, Math.round(r * (1 - amount)));
  const dg = Math.max(0, Math.round(g * (1 - amount)));
  const db = Math.max(0, Math.round(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color by mixing toward white */
export function lighten(hex: string, amount = 0.25): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}
