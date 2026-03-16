'use client';

import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { BASE_PARTS } from './parts/BaseParts';
import { EYE_PARTS } from './parts/EyeParts';
import { MOUTH_PARTS } from './parts/MouthParts';
import { HAIR_PARTS, HAIR_FRONT_PARTS } from './parts/HairParts';
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
/** Styles that render their main body behind the head */
const BACK_LAYER_STYLES = ['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids', 'bun', 'bangs', 'twintails', 'mullet'];

const AvatarRenderer = memo<AvatarRendererProps>(({ config, size = 64, className = '' }) => {
  const BasePart = BASE_PARTS[config.base] ?? BASE_PARTS.round;
  const EyePart = EYE_PARTS[config.eyes] ?? EYE_PARTS.round;
  const MouthPart = MOUTH_PARTS[config.mouth] ?? MOUTH_PARTS.smile;
  const HairPart = HAIR_PARTS[config.hair] ?? HAIR_PARTS.none;
  const HairFrontPart = HAIR_FRONT_PARTS[config.hair] ?? null;
  const AccessoryPart = ACCESSORY_PARTS[config.accessory] ?? ACCESSORY_PARTS.none;
  const BodyPart = BODY_PARTS[config.gender ?? 'male'];
  const isBackStyle = BACK_LAYER_STYLES.includes(config.hair);

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

      {/* Hair back layer (bulk/volume behind the head) */}
      {isBackStyle && <HairPart fill={config.hairColor} />}

      {/* Face base */}
      <BasePart fill={config.skinColor} />

      {/* Cheek blush (subtle) */}
      <circle cx="34" cy="54" r="5" fill="#FF6B6B" opacity="0.15" />
      <circle cx="66" cy="54" r="5" fill="#FF6B6B" opacity="0.15" />

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
            <line x1="35" y1="37" x2="33" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="38" y1="36" x2="37" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="41" y1="36" x2="42" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            {/* Right eye lashes */}
            <line x1="57" y1="37" x2="55" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="60" y1="36" x2="59" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="63" y1="36" x2="64" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        )
      )}

      {/* Mouth */}
      <MouthPart />

      {/* Hair front layer — bangs/framing strands ON TOP of face */}
      {isBackStyle && HairFrontPart && <HairFrontPart fill={config.hairColor} />}

      {/* Hair that sits entirely on top (spiky, buzz, mohawk, etc.) */}
      {!isBackStyle && config.hair !== 'none' && <HairPart fill={config.hairColor} />}

      {/* Accessories (always on top) */}
      <AccessoryPart fill={config.accessoryColor} />
    </svg>
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;
