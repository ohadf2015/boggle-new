import { memo } from 'react';

export interface BlastJellyOverlayProps {
  layers: number;
}

/**
 * Translucent glaze rendered above a tile when its cell has jelly.
 * Layers 1 = light cyan, 2 = bold cyan + ring (player must hit twice).
 */
export const BlastJellyOverlay = memo(function BlastJellyOverlay({ layers }: BlastJellyOverlayProps) {
  if (layers <= 0) return null;
  const tone = layers >= 2 ? 'bg-neo-cyan/40 ring-2 ring-neo-cyan' : 'bg-neo-cyan/20';
  return (
    <div
      data-testid="blast-jelly-overlay"
      data-layers={layers}
      className={`pointer-events-none absolute inset-0 rounded-neo ${tone}`}
      aria-hidden="true"
    />
  );
});

export default BlastJellyOverlay;
