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
import { FACIAL_HAIR_PARTS } from './parts/FacialHairParts';
import { NOSE_PARTS } from './parts/NoseParts';
import { BODY_PARTS } from './parts/BodyParts';

// Server-renderable clone of AvatarRenderer — no 'use client', no useId().
// Use only from API routes / react-dom/server renderToStaticMarkup contexts.
// Client UI must continue to use AvatarRenderer (supports tier effects + blink).

const BACK_LAYER_STYLES = new Set(['long', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids', 'bun', 'bangs', 'twintails', 'mullet', 'flame', 'galaxy', 'neon', 'curly', 'straight', 'spaceBuns', 'cornrows', 'wolfCut', 'curtainBangs', 'halfUp', 'himecut', 'lob', 'shag', 'curlyBangs', 'sideSwept', 'heartBuns', 'sideBow', 'milkmaidBraids', 'butterflyClips', 'lowPigtailsBow', 'princessBraid', 'sideBraidBow', 'ponytail']);
const BACK_ACCESSORY_STYLES = new Set(['monkeyEars']);
const SKIP_BLUSH_BASES = new Set(['skull', 'dragonHead', 'diamond', 'shield', 'triangle', 'catFace']);
const SKIP_NOSE_BASES = new Set(['skull', 'dragonHead']);
const SKIP_FEMALE_LASHES_EYES = new Set(['none', 'lashes', 'monocleEye', 'crossEyed', 'wingedLiner', 'smokyEye']);
const CIRCULAR_BASES = new Set(['round', 'blob']);
const ELLIPTICAL_BASES = new Set(['oval', 'oblong', 'pear', 'rectangular']);

function getBlushColor(skinColor: string): string {
  const r = parseInt(skinColor.slice(1, 3), 16);
  const g = parseInt(skinColor.slice(3, 5), 16);
  const b = parseInt(skinColor.slice(5, 7), 16);
  const lightness = (r + g + b) / (255 * 3);
  return lightness > 0.6 ? '#FF6B6B' : '#E84080';
}

interface AvatarRendererSsrProps {
  config: CustomAvatarConfig;
  size?: number;
  circular?: boolean;
}

export default function AvatarRendererSsr({ config, size = 256, circular = true }: AvatarRendererSsrProps) {
  // Static ID: safe because each PNG render is isolated to a single SVG document.
  const uid = 'ssr';
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
  const bodyKey = config.bodyStyle && config.bodyStyle !== 'default' ? config.bodyStyle : (config.gender ?? 'male');
  const BodyPart = BODY_PARTS[bodyKey as keyof typeof BODY_PARTS] ?? BODY_PARTS.male;

  const isBackStyle = BACK_LAYER_STYLES.has(config.hair);
  const isBackAccessory = BACK_ACCESSORY_STYLES.has(config.accessory);
  const blushColor = getBlushColor(config.skinColor);
  const showDepth = !SKIP_BLUSH_BASES.has(config.base);
  const skinShadow = darken(config.skinColor, 0.3);

  return (
    <AvatarUidContext.Provider value={uid}>
    <AvatarEyeColorContext.Provider value={config.eyeColor || '#4A6FA5'}>
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Avatar: ${config.base} face, ${config.eyes} eyes, ${config.hair} hair`}
      data-testid="custom-avatar-ssr"
    >
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
        <pattern id={halftoneId} data-halftone="" patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="1.5" cy="1.5" r="0.7" fill="#000" />
        </pattern>
      </defs>

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

      <BodyPart fill={config.skinColor} shirtColor={config.shirtColor} />
      {isBackAccessory && <AccessoryPart fill={config.accessoryColor} />}
      {isBackStyle && <HairPart fill={config.hairColor} />}

      <g filter={`url(#${faceShadowId})`}>
        <BasePart fill={config.skinColor} />
      </g>

      {showDepth && CIRCULAR_BASES.has(config.base) && (
        <ellipse cx="50" cy="73" rx="12" ry="3" fill={skinShadow} opacity="0.2" />
      )}
      {showDepth && ELLIPTICAL_BASES.has(config.base) && (
        <ellipse cx="50" cy="77" rx="10" ry="3" fill={skinShadow} opacity="0.18" />
      )}
      {showDepth && config.base === 'square' && (
        <ellipse cx="50" cy="75" rx="14" ry="3" fill={skinShadow} opacity="0.15" />
      )}

      {!SKIP_NOSE_BASES.has(config.base) && <NosePart fill={config.skinColor} />}

      {showDepth && (
        <>
          <circle cx="34" cy="50" r="6" fill={blushColor} opacity="0.22" />
          <circle cx="66" cy="50" r="6" fill={blushColor} opacity="0.22" />
        </>
      )}

      {config.eyebrows && config.eyebrows !== 'none' && <EyebrowPart fill={config.hairColor} />}
      {config.eyes !== 'none' && <EyePart />}

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

      {config.mouth !== 'none' && <MouthPart />}
      {config.facialHair && config.facialHair !== 'none' && <FacialHairPart fill={config.hairColor} />}
      {isBackStyle && HairFrontPart && <HairFrontPart fill={config.hairColor} />}
      {!isBackStyle && config.hair !== 'none' && <HairPart fill={config.hairColor} />}
      {!isBackAccessory && <AccessoryPart fill={config.accessoryColor} />}
    </svg>
    </AvatarEyeColorContext.Provider>
    </AvatarUidContext.Provider>
  );
}
