'use client';

import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { BASE_PARTS } from './parts/BaseParts';
import { EYE_PARTS } from './parts/EyeParts';
import { MOUTH_PARTS } from './parts/MouthParts';
import { HAIR_PARTS } from './parts/HairParts';
import { ACCESSORY_PARTS } from './parts/AccessoryParts';

interface AvatarRendererProps {
  config: CustomAvatarConfig;
  size?: number;
  className?: string;
}

/**
 * Renders a custom avatar from a CustomAvatarConfig as composable SVG layers.
 * Layer order: background -> hair(back) -> base(face) -> eyes -> mouth -> accessory -> hair(front)
 */
const AvatarRenderer = memo<AvatarRendererProps>(({ config, size = 64, className = '' }) => {
  const BasePart = BASE_PARTS[config.base] ?? BASE_PARTS.round;
  const EyePart = EYE_PARTS[config.eyes] ?? EYE_PARTS.round;
  const MouthPart = MOUTH_PARTS[config.mouth] ?? MOUTH_PARTS.smile;
  const HairPart = HAIR_PARTS[config.hair] ?? HAIR_PARTS.none;
  const AccessoryPart = ACCESSORY_PARTS[config.accessory] ?? ACCESSORY_PARTS.none;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Custom avatar"
      data-testid="custom-avatar"
    >
      {/* Background */}
      <rect x="0" y="0" width="100" height="100" rx="16" fill={config.bgColor} />

      {/* Hair back layer (for styles that go behind the head) */}
      {['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave'].includes(config.hair) ? (
        <HairPart fill={config.hairColor} />
      ) : null}

      {/* Face base */}
      <BasePart fill={config.skinColor} />

      {/* Cheek blush (subtle) */}
      <circle cx="32" cy="54" r="5" fill="#FF6B6B" opacity="0.15" />
      <circle cx="68" cy="54" r="5" fill="#FF6B6B" opacity="0.15" />

      {/* Eyes */}
      <EyePart />

      {/* Mouth */}
      <MouthPart />

      {/* Hair front layer (for styles that go on top) */}
      {!['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'none'].includes(config.hair) ? (
        <HairPart fill={config.hairColor} />
      ) : null}

      {/* Accessories (always on top) */}
      <AccessoryPart fill={config.accessoryColor} />
    </svg>
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;
