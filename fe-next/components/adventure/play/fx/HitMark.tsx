'use client';

/**
 * Last-hit sticker: once the cast's big number has popped, the damage + praise stamp
 * themselves onto the target's corner and STAY there until the next word lands
 * (settling a little smaller after a beat). Pointer-events none, body portal, so it
 * never blocks play and survives the stage's shake transforms.
 */
import { createPortal } from 'react-dom';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { TIER_STYLE, type HitTier } from './hitTier';

export interface HitMarkData {
  id: number;
  pts: number;
  tier: HitTier;
  bannerKey: string;
  combat: boolean;
  spot: { x: number; y: number };
}

export default function HitMark({ mark }: { mark: HitMarkData }) {
  const { t } = useLanguageSafe();
  if (typeof document === 'undefined') return null;
  const style = TIER_STYLE[mark.tier];
  const size = mark.tier === 'crit' ? 50 : mark.tier === 'big' ? 40 : 30;
  return createPortal(
    <div key={mark.id} className="adv-hit-mark pointer-events-none fixed z-[65]" aria-hidden
      data-testid="adv-hit-mark" data-tier={mark.tier}
      style={{ left: mark.spot.x, top: mark.spot.y }}>
      <span className="adv-hit-mark-num tabular-nums" dir="ltr" style={{ fontSize: size, color: style.fill }}>
        {mark.combat ? `-${mark.pts}` : `+${mark.pts}`}
      </span>
      <span className="adv-hit-mark-praise" style={{ background: style.banner }}>{t(mark.bannerKey)}</span>
    </div>,
    document.body,
  );
}
