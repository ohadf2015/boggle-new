import { memo } from 'react';

export interface BlastChocolateOverlayProps {
  active: boolean;
}

/**
 * Brown swirl + halftone painted on a chocolate cell. Standard cells get nothing.
 * Inline radial gradients evoke the CC chocolate-blocker without shipping a sprite.
 */
export const BlastChocolateOverlay = memo(function BlastChocolateOverlay({ active }: BlastChocolateOverlayProps) {
  if (!active) return null;
  return (
    <div
      data-testid="blast-chocolate-overlay"
      className="pointer-events-none absolute inset-0 rounded-neo bg-[#3a1f0e] ring-2 ring-[#5b3a1c]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 30% 30%, rgba(91,58,28,0.6) 0 6%, transparent 7%), radial-gradient(circle at 70% 70%, rgba(91,58,28,0.6) 0 5%, transparent 6%)',
      }}
      aria-hidden="true"
    />
  );
});

export default BlastChocolateOverlay;
