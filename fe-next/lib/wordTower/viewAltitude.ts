/**
 * Word Tower — viewed altitude from committed height + user pan (pure).
 *
 * The decoration layers (sky biome, clouds, parallax props) should reflect the
 * altitude the camera is currently *looking at*, not just the committed top of
 * the climb. When the player pans down to review lower floors, the sky/clouds/
 * props must follow — otherwise scrolling only slides the tiles and the
 * backdrop stays frozen at the top biome (the "scrolling just changes the
 * colour a bit" bug).
 *
 * Height grows per accepted word (variable metres), so there is no fixed
 * metres-per-pixel to convert a pan offset into metres. Instead we interpolate
 * linearly along the rendered tower: the pan offset `panY ∈ [panMin, 0]` is a
 * fraction of the way from the top (`0`) down to the base (`panMin`), and the
 * base is ground (0 m). This is exact at both ends and a good approximation in
 * between (floors add broadly similar metres each).
 */
export function viewAltitudeFor(heightM: number, panY: number, panMin: number): number {
  // No pan room (tower fits the viewport) → always viewing the top.
  if (panMin >= 0) return heightM;
  // Fraction scrolled from top (0) to base (1); clamp out-of-range pans.
  const frac = Math.max(0, Math.min(1, panY / panMin));
  return Math.max(0, heightM * (1 - frac));
}
