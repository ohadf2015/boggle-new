'use client';

import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { BASE_PARTS } from './parts/BaseParts';
import { EYE_PARTS } from './parts/EyeParts';
import { MOUTH_PARTS } from './parts/MouthParts';
import { HAIR_PARTS, HAIR_FRONT_PARTS } from './parts/HairParts';
import { ACCESSORY_PARTS } from './parts/AccessoryParts';
import { BODY_PARTS } from './parts/BodyParts';
import AvatarTierEffects, { type Tier } from './AvatarTierEffects';

interface AvatarRendererProps {
  config: CustomAvatarConfig;
  size?: number;
  className?: string;
  /** Disable tier animations (useful in grids/thumbnails) */
  disableEffects?: boolean;
  /** Override tier for preview purposes */
  forceTier?: Tier;
  /** Use circular background (for circular containers like profile avatars) */
  circular?: boolean;
}

/**
 * Renders a custom avatar from a CustomAvatarConfig as composable SVG layers.
 * Layer order: background -> body -> hair(back) -> base(face) -> blush -> eyes -> lashes -> mouth -> hair(front) -> accessory
 */
/** Styles that render their main body behind the head */
const BACK_LAYER_STYLES = ['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids', 'bun', 'bangs', 'twintails', 'mullet', 'flame', 'galaxy', 'neon'];

/** Accessories that render behind the face (ears, wings, etc.) */
const BACK_ACCESSORY_STYLES = new Set(['monkeyEars']);

/** Non-human bases that skip cheek blush */
const SKIP_BLUSH_BASES = new Set(['skull', 'dragonHead', 'diamond', 'shield']);

/** Get a blush color that works with the skin tone — warm pink for light skin, deeper rose for dark */
function getBlushColor(skinColor: string): string {
  // Parse skin lightness from hex
  const r = parseInt(skinColor.slice(1, 3), 16);
  const g = parseInt(skinColor.slice(3, 5), 16);
  const b = parseInt(skinColor.slice(5, 7), 16);
  const lightness = (r + g + b) / (255 * 3);
  // Light skin: warm coral. Dark skin: deeper rose that shows on dark tones
  return lightness > 0.6 ? '#FF6B6B' : '#E84080';
}

const AvatarRenderer = memo<AvatarRendererProps>(({ config, size = 64, className = '', disableEffects, forceTier, circular }) => {
  const BasePart = BASE_PARTS[config.base] ?? BASE_PARTS.round;
  const EyePart = EYE_PARTS[config.eyes] ?? EYE_PARTS.round;
  const MouthPart = MOUTH_PARTS[config.mouth] ?? MOUTH_PARTS.smile;
  const HairPart = HAIR_PARTS[config.hair] ?? HAIR_PARTS.none;
  const HairFrontPart = HAIR_FRONT_PARTS[config.hair] ?? null;
  const AccessoryPart = ACCESSORY_PARTS[config.accessory] ?? ACCESSORY_PARTS.none;
  const BodyPart = BODY_PARTS[config.gender ?? 'male'];
  const isBackStyle = BACK_LAYER_STYLES.includes(config.hair);
  const isBackAccessory = BACK_ACCESSORY_STYLES.has(config.accessory);
  const blushColor = getBlushColor(config.skinColor);

  const svgElement = (
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
      {circular ? (
        <circle cx="50" cy="50" r="50" fill={config.bgColor} />
      ) : (
        <rect x="0" y="0" width="100" height="100" rx="16" fill={config.bgColor} />
      )}

      {/* Body (shoulders/torso at bottom) */}
      <BodyPart fill={config.skinColor} shirtColor={config.shirtColor} />

      {/* Back-layer accessories (ears, etc. — behind the face) */}
      {isBackAccessory && <AccessoryPart fill={config.accessoryColor} />}

      {/* Hair back layer (bulk/volume behind the head) */}
      {isBackStyle && <HairPart fill={config.hairColor} />}

      {/* Face base */}
      <BasePart fill={config.skinColor} />

      {/* Cheek blush (skin-tone-aware) — skip for non-human face shapes */}
      {!SKIP_BLUSH_BASES.has(config.base) && (
        <>
          <circle cx="34" cy="54" r="5" fill={blushColor} opacity="0.15" />
          <circle cx="66" cy="54" r="5" fill={blushColor} opacity="0.15" />
        </>
      )}

      {/* Eyes */}
      {config.eyes !== 'none' && <EyePart />}

      {/* Female lashes overlay — adds lashes to all eye styles */}
      {(config.gender ?? 'male') === 'female' && config.eyes !== 'lashes' && config.eyes !== 'none' && (
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
      {config.mouth !== 'none' && <MouthPart />}

      {/* Hair front layer — bangs/framing strands ON TOP of face */}
      {isBackStyle && HairFrontPart && <HairFrontPart fill={config.hairColor} />}

      {/* Hair that sits entirely on top (spiky, buzz, mohawk, etc.) */}
      {!isBackStyle && config.hair !== 'none' && <HairPart fill={config.hairColor} />}

      {/* Accessories (on top, unless it's a back-layer accessory already rendered) */}
      {!isBackAccessory && <AccessoryPart fill={config.accessoryColor} />}
    </svg>
  );

  if (disableEffects) return svgElement;

  return (
    <AvatarTierEffects config={config} className={className} forceTier={forceTier}>
      {svgElement}
    </AvatarTierEffects>
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;
