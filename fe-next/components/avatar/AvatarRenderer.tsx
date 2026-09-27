'use client';

import { memo, useId } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { AvatarMood } from '@/lib/avatar/avatarMood';
import type { AvatarOverlay } from '@/lib/avatar/avatarOverlay';
import type { Tier } from '@/lib/avatar/rarity';
import AvatarArt, { type AvatarMode } from './art/AvatarArt';
import AvatarTierEffects from './AvatarTierEffects';
import '@/styles/avatar-mood-animations.css';

export type { AvatarMode };

interface AvatarRendererProps {
  config: CustomAvatarConfig;
  size?: number;
  className?: string;
  /** Static render: no idle life (blink/twinkle) and no tier wrapper. For grids/rosters. */
  disableEffects?: boolean;
  /** Override tier for preview purposes */
  forceTier?: Tier;
  /** Use circular background (for circular containers like profile avatars) */
  circular?: boolean;
  /** Game-mode color frame: pink/cyan/purple/lime ring around avatar */
  mode?: AvatarMode;
  /** Transient reaction (expression swap + wrapper animation); fires even with disableEffects. */
  mood?: AvatarMood;
  /** Loud reaction badge (alert/flame) at the top-right. */
  overlay?: AvatarOverlay | null;
  /** Static epic/legendary gem baked into the SVG (opt-in, for rosters/leaderboards). */
  tierMarker?: boolean;
  /** 'face' frames the head for small tiles (see AvatarArt FACE_CROP). */
  crop?: 'full' | 'face';
}

/**
 * Browser shell around the one server-safe compositor (art/AvatarArt). Adds a
 * per-instance id, idle life and the mood CSS. The Express PNG route renders
 * the same AvatarArt through AvatarRendererSsr, so client and PNG never drift.
 */
const AvatarRenderer = memo<AvatarRendererProps>(({ config, size = 64, className = '', disableEffects, forceTier, circular, mode, mood, overlay, tierMarker, crop }) => {
  const uid = useId();
  const svg = (
    <AvatarArt
      config={config}
      uid={uid}
      size={size}
      className={className}
      circular={circular}
      mode={mode}
      mood={mood}
      overlay={overlay}
      tierMarker={tierMarker}
      forceTier={forceTier}
      animated={!disableEffects}
      crop={crop}
    />
  );
  if (disableEffects) return svg;
  return (
    <AvatarTierEffects config={config} className={className} forceTier={forceTier}>
      {svg}
    </AvatarTierEffects>
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;
