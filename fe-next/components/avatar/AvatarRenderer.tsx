'use client';

import { memo, useId } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { darken } from './parts/avatarDesignConstants';
import AvatarUidContext from './AvatarUidContext';
import AvatarEyeColorContext from './AvatarEyeColorContext';
import { BASE_PARTS } from './parts/BaseParts';
import { EYE_PARTS } from './parts/EyeParts';
import { MOUTH_PARTS } from './parts/MouthParts';
import { HAIR_PARTS, HAIR_FRONT_PARTS } from './parts/HairParts';
import { ACCESSORY_PARTS } from './parts/AccessoryParts';
import { EYEBROW_PARTS } from './parts/EyebrowParts';
import { FACIAL_HAIR_PARTS } from "./parts/FacialHairParts";
import { NOSE_PARTS } from './parts/NoseParts';
import { BODY_PARTS } from './parts/BodyParts';
import AvatarTierEffects, { type Tier } from './AvatarTierEffects';

/** Game-mode color frame around avatar — matches brand palette */
export type AvatarMode = 'multiplayer' | 'singleplayer' | 'brain' | 'practice';

const MODE_FRAME_COLOR: Record<AvatarMode, string> = {
  multiplayer: '#FF1493', // neo-pink
  singleplayer: '#00FFFF', // neo-cyan
  brain: '#8B5CF6', // neo-purple
  practice: '#BFFF00', // neo-lime
};

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
  /** Game-mode color frame: pink/cyan/purple/lime ring around avatar */
  mode?: AvatarMode;
}

/**
 * Renders a custom avatar from a CustomAvatarConfig as composable SVG layers.
 * Layer order: background -> body -> hair(back) -> face shadow -> base(face) ->
 *   chin shadow -> nose -> blush -> eyebrows -> eyes -> blink -> lashes -> mouth ->
 *   facial hair -> hair(front) -> accessory
 */
/** Styles that render their main body behind the head */
const BACK_LAYER_STYLES = new Set(['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids', 'bun', 'bangs', 'twintails', 'mullet', 'flame', 'galaxy', 'neon', 'curly', 'straight', 'spaceBuns', 'cornrows', 'wolfCut', 'curtainBangs', 'halfUp', 'himecut', 'lob', 'shag', 'curlyBangs', 'sideSwept', 'heartBuns', 'sideBow', 'milkmaidBraids', 'butterflyClips', 'lowPigtailsBow', 'princessBraid', 'sideBraidBow', 'ponytail']);

/** Accessories that render behind the face (ears, wings, etc.) */
const BACK_ACCESSORY_STYLES = new Set(['monkeyEars']);

/** Non-human bases that skip cheek blush & face depth effects */
const SKIP_BLUSH_BASES = new Set(['skull', 'dragonHead', 'diamond', 'shield', 'triangle', 'catFace']);

/** Bases with their own nose anatomy — skip NosePart overlay */
const SKIP_NOSE_BASES = new Set(['skull', 'dragonHead']);

/** Bases that use the standard circle shape (get circular depth effects) */
const CIRCULAR_BASES = new Set(['round', 'blob']);

/** Bases that use elliptical shape */
const ELLIPTICAL_BASES = new Set(['oval', 'oblong', 'pear', 'rectangular']);

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
  'closed', 'squint',
]);

/** Eye styles where hardcoded lash positions don't align — skip generic female lashes */
const SKIP_FEMALE_LASHES_EYES = new Set([
  'none', 'lashes', 'monocleEye', 'crossEyed', 'wingedLiner', 'smokyEye',
]);

const AvatarRenderer = memo<AvatarRendererProps>(({ config, size = 64, className = '', disableEffects, forceTier, circular, mode }) => {
  const uid = useId();
  const faceShadowId = `fs${uid}`;
  const halftoneId = `ht${uid}`;
  const BasePart = BASE_PARTS[config.base] ?? BASE_PARTS.round;
  const EyePart = EYE_PARTS[config.eyes] ?? EYE_PARTS.round;
  const MouthPart = MOUTH_PARTS[config.mouth] ?? MOUTH_PARTS.smile;
  const HairPart = HAIR_PARTS[config.hair] ?? HAIR_PARTS.none;
  const HairFrontPart = HAIR_FRONT_PARTS[config.hair] ?? null;
  const AccessoryPart = ACCESSORY_PARTS[config.accessory] ?? ACCESSORY_PARTS.none;
  const EyebrowPart = EYEBROW_PARTS[config.eyebrows ?? 'none'] ?? EYEBROW_PARTS.none;
  const FacialHairPart = FACIAL_HAIR_PARTS[config.facialHair ?? 'none'] ?? FACIAL_HAIR_PARTS.none;
  const NosePart = NOSE_PARTS[config.noseStyle ?? 'kawaii'] ?? NOSE_PARTS.kawaii;
  const bodyKey = config.bodyStyle && config.bodyStyle !== 'default'
    ? config.bodyStyle
    : (config.gender ?? 'male');
  const BodyPart = BODY_PARTS[bodyKey as keyof typeof BODY_PARTS] ?? BODY_PARTS.male;
  const isBackStyle = BACK_LAYER_STYLES.has(config.hair);
  const isBackAccessory = BACK_ACCESSORY_STYLES.has(config.accessory);
  const blushColor = getBlushColor(config.skinColor);
  const showDepth = !SKIP_BLUSH_BASES.has(config.base);
  const skinShadow = darken(config.skinColor, 0.3);
  const canBlink = !SKIP_BLINK_EYES.has(config.eyes) && !disableEffects;

  const svgElement = (
    <AvatarUidContext.Provider value={uid}>
    <AvatarEyeColorContext.Provider value={config.eyeColor || '#4A6FA5'}>
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Avatar: ${config.base} face, ${config.eyes} eyes, ${config.hair} hair`}
      data-testid="custom-avatar"
    >
      {/* Shared filter definitions — neo-brutalist hard offset shadow (NO blur) */}
      <defs>
        <filter id={faceShadowId} x="-10%" y="-10%" width="120%" height="130%">
          <feOffset dx="2" dy="2" in="SourceAlpha" result="offset" />
          <feFlood floodColor="#000" floodOpacity="0.55" />
          <feComposite in2="offset" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern
          id={halftoneId}
          data-halftone=""
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <circle cx="1.5" cy="1.5" r="0.7" fill="#000" />
        </pattern>
      </defs>

      {/* Background — solid color + halftone dot overlay (brand texture) */}
      {circular ? (
        <>
          <circle cx="50" cy="50" r="50" fill={config.bgColor} />
          <circle cx="50" cy="50" r="50" fill={`url(#${halftoneId})`} opacity="0.08" />
        </>
      ) : (
        <>
          <rect x="0" y="0" width="100" height="100" rx="16" fill={config.bgColor} />
          <rect x="0" y="0" width="100" height="100" rx="16" fill={`url(#${halftoneId})`} opacity="0.08" />
        </>
      )}

      {/* Body (shoulders/torso at bottom) */}
      <BodyPart fill={config.skinColor} shirtColor={config.shirtColor} />

      {/* Back-layer accessories (ears, etc. — behind the face) */}
      {isBackAccessory && <AccessoryPart fill={config.accessoryColor} />}

      {/* Hair back layer (bulk/volume behind the head) */}
      {isBackStyle && <HairPart fill={config.hairColor} />}

      {/* Face base with drop shadow for depth */}
      <g filter={`url(#${faceShadowId})`}>
        <BasePart fill={config.skinColor} />
      </g>

      {/* Chin shadow — subtle depth at jawline/body junction */}
      {showDepth && CIRCULAR_BASES.has(config.base) && (
        <ellipse cx="50" cy="73" rx="12" ry="3" fill={skinShadow} opacity="0.2" />
      )}
      {showDepth && ELLIPTICAL_BASES.has(config.base) && (
        <ellipse cx="50" cy="77" rx="10" ry="3" fill={skinShadow} opacity="0.18" />
      )}
      {showDepth && config.base === 'square' && (
        <ellipse cx="50" cy="75" rx="14" ry="3" fill={skinShadow} opacity="0.15" />
      )}

      {/* Nose — always render (defaults to kawaii); skull/dragonHead have own nose anatomy */}
      {!SKIP_NOSE_BASES.has(config.base) && <NosePart fill={config.skinColor} />}

      {/* Cheek blush (skin-tone-aware) — skip for non-human face shapes */}
      {showDepth && (
        <>
          <circle cx="34" cy="50" r="6" fill={blushColor} opacity="0.22" />
          <circle cx="66" cy="50" r="6" fill={blushColor} opacity="0.22" />
        </>
      )}

      {/* Eyebrows — rendered above the eyes */}
      {config.eyebrows && config.eyebrows !== 'none' && <EyebrowPart fill={config.hairColor} />}

      {/* Eyes */}
      {config.eyes !== 'none' && <EyePart />}

      {/* Blink — skin-colored ellipses grow over each eye at cy=42 */}
      {canBlink && config.eyes !== 'none' && (
        <g>
          <ellipse cx="38" cy="42" rx="8.5" ry="0" fill={config.skinColor}>
            <animate attributeName="ry" values="0;0;0;7.5;0;0;0;0;0;0;0;0;0;0;7.5;0;0;0;0;0" dur="6s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="62" cy="42" rx="8.5" ry="0" fill={config.skinColor}>
            <animate attributeName="ry" values="0;0;0;7.5;0;0;0;0;0;0;0;0;0;0;7.5;0;0;0;0;0" dur="6s" repeatCount="indefinite" />
          </ellipse>
          <line x1="30" y1="42" x2="46" y2="42" stroke="#000" strokeWidth="1.5" strokeLinecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0;0;0.7;0;0;0;0;0;0;0;0;0;0;0.7;0;0;0;0;0" dur="6s" repeatCount="indefinite" />
          </line>
          <line x1="54" y1="42" x2="70" y2="42" stroke="#000" strokeWidth="1.5" strokeLinecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0;0;0.7;0;0;0;0;0;0;0;0;0;0;0.7;0;0;0;0;0" dur="6s" repeatCount="indefinite" />
          </line>
        </g>
      )}

      {/* Female lashes overlay — skip misaligned styles */}
      {config.gender === 'female' && config.eyes !== 'none' && (
        config.eyes === 'cyclops' ? (
          <g>
            <line x1="46" y1="34" x2="44" y2="31" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="50" y1="33" x2="50" y2="30" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="54" y1="34" x2="56" y2="31" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        ) : !SKIP_FEMALE_LASHES_EYES.has(config.eyes) ? (
          <g>
            <line x1="35" y1="37" x2="33" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="38" y1="36" x2="37" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="41" y1="36" x2="42" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="57" y1="37" x2="55" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="60" y1="36" x2="59" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="63" y1="36" x2="64" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        ) : null
      )}

      {/* Mouth */}
      {config.mouth !== 'none' && <MouthPart />}

      {/* Facial hair */}
      {config.facialHair && config.facialHair !== 'none' && (
        <FacialHairPart fill={config.hairColor} />
      )}

      {/* Hair front layer — bangs/framing strands ON TOP of face */}
      {isBackStyle && HairFrontPart && <HairFrontPart fill={config.hairColor} />}

      {/* Hair that sits entirely on top (spiky, buzz, mohawk, etc.) */}
      {!isBackStyle && config.hair !== 'none' && <HairPart fill={config.hairColor} />}

      {/* Accessories (on top, unless it's a back-layer accessory already rendered) */}
      {!isBackAccessory && <AccessoryPart fill={config.accessoryColor} />}

      {/* Mode-color frame — black underlay (brutalist border) + colored stripe on top */}
      {mode && (
        circular ? (
          <g data-mode-frame="" stroke={MODE_FRAME_COLOR[mode]}>
            <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="5" />
            <circle cx="50" cy="50" r="48" fill="none" stroke={MODE_FRAME_COLOR[mode]} strokeWidth="3" />
          </g>
        ) : (
          <g data-mode-frame="" stroke={MODE_FRAME_COLOR[mode]}>
            <rect x="2" y="2" width="96" height="96" rx="14" fill="none" stroke="#000" strokeWidth="5" />
            <rect x="2" y="2" width="96" height="96" rx="14" fill="none" stroke={MODE_FRAME_COLOR[mode]} strokeWidth="3" />
          </g>
        )
      )}
    </svg>
    </AvatarEyeColorContext.Provider>
    </AvatarUidContext.Provider>
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
