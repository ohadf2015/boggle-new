/**
 * Decide whether to mount the heavy PixiJS effects overlay (BlastEffectsCanvas).
 *
 * The overlay runs a continuous Pixi ticker + physics step + ambient-bokeh
 * emitter for the ENTIRE game, on top of the DOM board. On low-end devices
 * `enableComplexAnimations` is already false, so BlastFxBridge suppresses every
 * burst — yet the engine still mounts and burns frames producing effects that
 * are being thrown away. Reduced-motion users likewise don't want the motion.
 *
 * The DOM tile animations (clear / fall / appear in BlastTile) are independent
 * of this overlay, so skipping it keeps the game fully playable and readable —
 * it only drops the extra particle juice for the devices that can least afford
 * it. Pure + tiny so it's unit-testable and reused by the mount site.
 */
export interface BlastFxCanvasGate {
  enableComplexAnimations: boolean;
  prefersReducedMotion: boolean;
}

export function shouldMountBlastFxCanvas({
  enableComplexAnimations,
  prefersReducedMotion,
}: BlastFxCanvasGate): boolean {
  if (prefersReducedMotion) return false;
  return enableComplexAnimations;
}
