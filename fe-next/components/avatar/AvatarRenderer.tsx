'use client';

import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { BASE_PARTS } from './parts/BaseParts';
import { EYE_PARTS } from './parts/EyeParts';
import { MOUTH_PARTS } from './parts/MouthParts';
import { HAIR_PARTS } from './parts/HairParts';
import { ACCESSORY_PARTS } from './parts/AccessoryParts';
import { BODY_PARTS } from './parts/BodyParts';

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
  const BodyPart = BODY_PARTS[config.gender ?? 'male'];

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

      {/* Body (shoulders/torso at bottom) */}
      <BodyPart fill={config.skinColor} />

      {/* Hair back layer (for styles that go behind the head) */}
      {['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids', 'bun', 'bangs', 'twintails', 'mullet'].includes(config.hair) ? (
        <HairPart fill={config.hairColor} />
      ) : null}

      {/* Face base */}
      <BasePart fill={config.skinColor} />

      {/* Cheek blush (subtle) */}
      <circle cx="32" cy="54" r="5" fill="#FF6B6B" opacity="0.15" />
      <circle cx="68" cy="54" r="5" fill="#FF6B6B" opacity="0.15" />

      {/* Eyes */}
      <EyePart />

      {/* Female lashes overlay — adds lashes to all eye styles */}
      {(config.gender ?? 'male') === 'female' && config.eyes !== 'lashes' && (
        config.eyes === 'cyclops' ? (
          <g>
            <line x1="46" y1="34" x2="44" y2="31" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="50" y1="33" x2="50" y2="30" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="54" y1="34" x2="56" y2="31" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* Left eye lashes */}
            <line x1="34" y1="37" x2="32" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="37" y1="36" x2="36" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="40" y1="36" x2="41" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            {/* Right eye lashes */}
            <line x1="58" y1="37" x2="56" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="61" y1="36" x2="60" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="64" y1="36" x2="65" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        )
      )}

      {/* Mouth */}
      <MouthPart />

      {/* Hair front layer (for styles that go on top) */}
      {!['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids', 'bun', 'bangs', 'twintails', 'none'].includes(config.hair) ? (
        <HairPart fill={config.hairColor} />
      ) : null}

      {/* Accessories (always on top) */}
      <AccessoryPart fill={config.accessoryColor} />
    </svg>
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;
