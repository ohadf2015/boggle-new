'use client';

import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarRenderer from './AvatarRenderer';

type PartType = 'base' | 'eyes' | 'eyebrows' | 'mouth' | 'hair' | 'accessory' | 'facialHair' | 'nose';

interface PartPreviewProps {
  partType: PartType;
  partName: string;
  config: CustomAvatarConfig;
  size?: number;
}

/** Map a builder part-type to the matching CustomAvatarConfig key. */
const PART_KEY: Record<PartType, keyof CustomAvatarConfig> = {
  base: 'base',
  eyes: 'eyes',
  eyebrows: 'eyebrows',
  mouth: 'mouth',
  hair: 'hair',
  accessory: 'accessory',
  facialHair: 'facialHair',
  nose: 'noseStyle',
};

/**
 * Small parts occupy a few pixels on a full face at the 48px grid size, so we
 * zoom into their region. Big-silhouette parts (base/hair/accessory/facialHair)
 * read fine full-face. `cy` is the feature's vertical centre in the 0–100 viewBox.
 */
const ZOOM: Partial<Record<PartType, { scale: number; cy: number }>> = {
  eyes: { scale: 1.75, cy: 39 },
  eyebrows: { scale: 1.75, cy: 33 },
  mouth: { scale: 1.9, cy: 60 },
  nose: { scale: 1.9, cy: 52 },
};

/**
 * Picker thumbnail: shows the part composited on the player's OWN face, so they
 * see exactly how it looks equipped ("how it looks on ME"). Previously rendered
 * the bare part on a headless blob, which made premium parts look cheap right at
 * the moment of the buy decision. Small parts are zoomed so they stay legible.
 */
const PartPreview = memo<PartPreviewProps>(({ partType, partName, config, size = 48 }) => {
  const previewConfig: CustomAvatarConfig = {
    ...config,
    [PART_KEY[partType]]: partName,
  } as CustomAvatarConfig;

  // Effects off — the tier shimmer/sparkle is owned by the grid cell, not the
  // thumbnail, so previews stay crisp and cheap in a dense grid.
  const avatar = <AvatarRenderer config={previewConfig} size={size} disableEffects circular />;

  const zoom = ZOOM[partType];
  if (!zoom) return avatar;

  // Render the face larger inside a fixed box and translate to centre the feature.
  const inner = size * zoom.scale;
  const offsetX = (size - inner) / 2;
  const offsetY = size / 2 - (zoom.cy / 100) * inner;
  return (
    <div
      data-testid="part-preview-zoom"
      style={{ position: 'relative', width: size, height: size, overflow: 'hidden', borderRadius: size * 0.18 }}
    >
      <div style={{ position: 'absolute', left: offsetX, top: offsetY, width: inner, height: inner }}>
        <AvatarRenderer config={previewConfig} size={inner} disableEffects circular />
      </div>
    </div>
  );
});

PartPreview.displayName = 'PartPreview';

export default PartPreview;
