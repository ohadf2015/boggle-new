'use client';

import { memo } from 'react';
import type { EquipBurst } from '@/lib/avatar/equipBurst';
import '@/styles/avatar-equip-burst.css';

interface Props {
  burst: EquipBurst | null;
  /** Bump to re-fire the one-shot animation on each equip. */
  fireKey: number;
}

/**
 * One-shot particle spray fired over the avatar preview when a part is equipped
 * or bought. Tier-scaled (see planEquipBurst) so premium buys feel rewarding.
 * Purely decorative — hidden under reduced-motion.
 */
const AvatarEquipBurst = memo<Props>(({ burst, fireKey }) => {
  if (!burst || burst.particles <= 0) return null;
  const n = burst.particles;
  return (
    <div key={fireKey} className="avatar-equip-burst" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const ang = (i / n) * Math.PI * 2;
        const dist = 44 + (i % 3) * 9;
        const size = burst.celebrate && i % 4 === 0 ? 7 : 4;
        return (
          <span
            key={i}
            className="aeb-p"
            style={{
              '--tx': `${Math.cos(ang) * dist}px`,
              '--ty': `${Math.sin(ang) * dist}px`,
              width: size,
              height: size,
              background: burst.color,
              animationDelay: `${(i % 5) * 12}ms`,
            } as React.CSSProperties}
          />
        );
      })}
      {burst.celebrate && (
        <span className="aeb-ring" style={{ borderColor: burst.color }} />
      )}
    </div>
  );
});

AvatarEquipBurst.displayName = 'AvatarEquipBurst';

export default AvatarEquipBurst;
