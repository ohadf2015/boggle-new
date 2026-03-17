'use client';

import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { darken, lighten } from './parts/avatarDesignConstants';
import { BASE_PARTS } from './parts/BaseParts';
import { EYE_PARTS } from './parts/EyeParts';
import { MOUTH_PARTS } from './parts/MouthParts';
import { HAIR_PARTS, HAIR_FRONT_PARTS } from './parts/HairParts';
import { ACCESSORY_PARTS } from './parts/AccessoryParts';
import { EYEBROW_PARTS } from './parts/EyebrowParts';
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
 * Layer order: background -> body -> hair(back) -> face shadow -> base(face) ->
 *   forehead highlight -> chin shadow -> blush -> eyes -> lashes -> mouth ->
 *   hair(front) -> accessory
 */
/** Styles that render their main body behind the head */
const BACK_LAYER_STYLES = ['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids', 'bun', 'bangs', 'twintails', 'mullet', 'flame', 'galaxy', 'neon', 'curly'];

/** Accessories that render behind the face (ears, wings, etc.) */
const BACK_ACCESSORY_STYLES = new Set(['monkeyEars']);

/** Non-human bases that skip cheek blush & face depth effects */
const SKIP_BLUSH_BASES = new Set(['skull', 'dragonHead', 'diamond', 'shield']);

/** Bases that use the standard circle shape (get circular depth effects) */
const CIRCULAR_BASES = new Set(['round', 'blob']);

/** Bases that use elliptical shape */
const ELLIPTICAL_BASES = new Set(['oval']);

/** Get a blush color that works with the skin tone — warm pink for light skin, deeper rose for dark */
function getBlushColor(skinColor: string): string {
  const r = parseInt(skinColor.slice(1, 3), 16);
  const g = parseInt(skinColor.slice(3, 5), 16);
  const b = parseInt(skinColor.slice(5, 7), 16);
  const lightness = (r + g + b) / (255 * 3);
  return lightness > 0.6 ? '#FF6B6B' : '#E84080';
}

/** Eyes that are closed/non-standard and shouldn't get blink animation */
const SKIP_BLINK_EYES = new Set([
  'none', 'sleepy', 'happy', 'dizzy', 'cool', 'wink',
  'galaxy', 'flame', 'robot', 'void', 'infinity', 'laser',
  'hypno', 'alien', 'crying', 'money', 'hearts', 'star',
]);

const AvatarRenderer = memo<AvatarRendererProps>(({ config, size = 64, className = '', disableEffects, forceTier, circular }) => {
  const BasePart = BASE_PARTS[config.base] ?? BASE_PARTS.round;
  const EyePart = EYE_PARTS[config.eyes] ?? EYE_PARTS.round;
  const MouthPart = MOUTH_PARTS[config.mouth] ?? MOUTH_PARTS.smile;
  const HairPart = HAIR_PARTS[config.hair] ?? HAIR_PARTS.none;
  const HairFrontPart = HAIR_FRONT_PARTS[config.hair] ?? null;
  const AccessoryPart = ACCESSORY_PARTS[config.accessory] ?? ACCESSORY_PARTS.none;
  const EyebrowPart = EYEBROW_PARTS[config.eyebrows ?? 'none'] ?? EYEBROW_PARTS.none;
  const BodyPart = BODY_PARTS[config.gender ?? 'male'];
  const isBackStyle = BACK_LAYER_STYLES.includes(config.hair);
  const isBackAccessory = BACK_ACCESSORY_STYLES.has(config.accessory);
  const blushColor = getBlushColor(config.skinColor);
  const showDepth = !SKIP_BLUSH_BASES.has(config.base);
  const skinShadow = darken(config.skinColor, 0.15);
  const skinHighlight = lighten(config.skinColor, 0.2);
  const canBlink = !SKIP_BLINK_EYES.has(config.eyes) && !disableEffects;

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
      {/* Shared filter definitions */}
      <defs>
        <filter id="faceShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.18" />
        </filter>
        <radialGradient id="faceHighlight" cx="42%" cy="32%" r="45%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {canBlink && (
          <clipPath id="blinkClip">
            <rect x="0" y="0" width="100" height="100">
              <animate
                attributeName="height"
                values="100;100;100;48;100;100;100;100;100;100;100;100;100;100;48;100;100;100;100;100"
                dur="6s"
                repeatCount="indefinite"
              />
            </rect>
          </clipPath>
        )}
      </defs>

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

      {/* Face base with drop shadow for depth */}
      <g filter="url(#faceShadow)">
        <BasePart fill={config.skinColor} />
      </g>

      {/* Forehead highlight — subtle 3D curvature on human faces */}
      {showDepth && CIRCULAR_BASES.has(config.base) && (
        <ellipse cx="44" cy="40" rx="14" ry="10" fill={skinHighlight} opacity="0.12" />
      )}
      {showDepth && ELLIPTICAL_BASES.has(config.base) && (
        <ellipse cx="44" cy="38" rx="12" ry="12" fill={skinHighlight} opacity="0.12" />
      )}
      {showDepth && config.base === 'heart' && (
        <ellipse cx="44" cy="42" rx="10" ry="8" fill={skinHighlight} opacity="0.1" />
      )}
      {showDepth && config.base === 'hexagon' && (
        <ellipse cx="44" cy="38" rx="12" ry="8" fill={skinHighlight} opacity="0.1" />
      )}
      {showDepth && config.base === 'square' && (
        <ellipse cx="42" cy="36" rx="14" ry="8" fill={skinHighlight} opacity="0.1" />
      )}

      {/* Chin shadow — depth below the face */}
      {showDepth && CIRCULAR_BASES.has(config.base) && (
        <ellipse cx="50" cy="72" rx="16" ry="5" fill={skinShadow} opacity="0.18" />
      )}
      {showDepth && ELLIPTICAL_BASES.has(config.base) && (
        <ellipse cx="50" cy="76" rx="14" ry="5" fill={skinShadow} opacity="0.16" />
      )}
      {showDepth && config.base === 'square' && (
        <ellipse cx="50" cy="74" rx="18" ry="4" fill={skinShadow} opacity="0.14" />
      )}

      {/* Cheek blush (skin-tone-aware) — skip for non-human face shapes */}
      {showDepth && (
        <>
          <circle cx="34" cy="50" r="6" fill={blushColor} opacity="0.15" />
          <circle cx="66" cy="50" r="6" fill={blushColor} opacity="0.15" />
        </>
      )}

      {/* Eyebrows — rendered above the eyes */}
      {config.eyebrows && config.eyebrows !== 'none' && <EyebrowPart />}

      {/* Eyes — with periodic blink for standard eye types */}
      {config.eyes !== 'none' && (
        canBlink ? (
          <g clipPath="url(#blinkClip)">
            <EyePart />
          </g>
        ) : (
          <EyePart />
        )
      )}

      {/* Blink lid line — thin skin-colored line that appears during blink */}
      {canBlink && config.eyes !== 'none' && (
        <g>
          <line x1="33" y1="48" x2="43" y2="48" stroke={config.skinColor} strokeWidth="2.5" strokeLinecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0;0;0.9;0;0;0;0;0;0;0;0;0;0;0.9;0;0;0;0;0" dur="6s" repeatCount="indefinite" />
          </line>
          <line x1="57" y1="48" x2="67" y2="48" stroke={config.skinColor} strokeWidth="2.5" strokeLinecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0;0;0.9;0;0;0;0;0;0;0;0;0;0;0.9;0;0;0;0;0" dur="6s" repeatCount="indefinite" />
          </line>
        </g>
      )}

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
