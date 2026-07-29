import { memo } from 'react';

export interface BlastCakeOverlayProps {
  hp: number;
  maxHp: number;
  isAnchor: boolean;
}

/**
 * 3x3 cake-bomb visual. Anchor cell renders the HP pip ring above the tile;
 * satellites just paint the pink wash so the whole cluster reads as one unit.
 */
export const BlastCakeOverlay = memo(function BlastCakeOverlay({ hp, maxHp, isAnchor }: BlastCakeOverlayProps) {
  return (
    <div
      data-testid="blast-cake-overlay"
      className="pointer-events-none absolute inset-0 rounded-neo bg-neo-pink/30 ring-2 ring-neo-pink"
      aria-hidden="true"
    >
      {isAnchor && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5">
          {Array.from({ length: maxHp }, (_, i) => {
            const filled = i < hp;
            return (
              <span
                key={i}
                data-testid={filled ? 'blast-cake-hp-pip-filled' : `blast-cake-hp-pip-empty-${i}`}
                className={`h-1.5 w-1.5 rounded-full border border-black ${filled ? 'bg-neo-pink' : 'bg-neo-navy'}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

export default BlastCakeOverlay;
