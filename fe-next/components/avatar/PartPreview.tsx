'use client';

import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { BASE_PARTS } from './parts/BaseParts';
import { EYE_PARTS } from './parts/EyeParts';
import { EYEBROW_PARTS } from './parts/EyebrowParts';
import { MOUTH_PARTS } from './parts/MouthParts';
import { HAIR_PARTS } from './parts/HairParts';
import { ACCESSORY_PARTS } from './parts/AccessoryParts';
import { FACIAL_HAIR_PARTS } from './parts/FacialHairParts';

interface PartPreviewProps {
  partType: 'base' | 'eyes' | 'eyebrows' | 'mouth' | 'hair' | 'accessory' | 'facialHair';
  partName: string;
  config: CustomAvatarConfig;
  size?: number;
}

/**
 * Renders an isolated SVG preview of a single avatar part.
 * Shows the part on a neutral background so the user can see what it looks like.
 */
const PartPreview = memo<PartPreviewProps>(({ partType, partName, config, size = 48 }) => {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" rx="12" fill="#2a2a4e" />
      {renderPart(partType, partName, config)}
    </svg>
  );
});

function renderPart(partType: string, partName: string, config: CustomAvatarConfig) {
  switch (partType) {
    case 'base': {
      const Part = BASE_PARTS[partName as keyof typeof BASE_PARTS];
      return Part ? <Part fill={config.skinColor} /> : null;
    }
    case 'eyes': {
      // Show eyes on a subtle face silhouette for context
      const Part = EYE_PARTS[partName as keyof typeof EYE_PARTS];
      return Part ? (
        <>
          <circle cx="50" cy="52" r="32" fill="#d4a574" opacity="0.2" />
          <Part />
        </>
      ) : null;
    }
    case 'eyebrows': {
      const Part = EYEBROW_PARTS[partName as keyof typeof EYEBROW_PARTS];
      return Part ? (
        <g>
          <defs>
            <filter id="preview-invert">
              <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
            </filter>
          </defs>
          <circle cx="50" cy="52" r="32" fill={config.skinColor} opacity="0.35" />
          <g filter="url(#preview-invert)">
            <Part />
          </g>
        </g>
      ) : null;
    }
    case 'mouth': {
      const Part = MOUTH_PARTS[partName as keyof typeof MOUTH_PARTS];
      return Part ? (
        <>
          <circle cx="50" cy="52" r="32" fill="#d4a574" opacity="0.2" />
          <Part />
        </>
      ) : null;
    }
    case 'hair': {
      const Part = HAIR_PARTS[partName as keyof typeof HAIR_PARTS];
      if (!Part) return null;
      return (
        <>
          <circle cx="50" cy="52" r="32" fill="#d4a574" opacity="0.2" />
          <Part fill={config.hairColor} />
        </>
      );
    }
    case 'accessory': {
      const Part = ACCESSORY_PARTS[partName as keyof typeof ACCESSORY_PARTS];
      if (!Part) return null;
      return (
        <>
          <circle cx="50" cy="52" r="32" fill="#d4a574" opacity="0.2" />
          <Part fill={config.accessoryColor} />
        </>
      );
    }
    case 'facialHair': {
      const Part = FACIAL_HAIR_PARTS[partName as keyof typeof FACIAL_HAIR_PARTS];
      if (!Part) return null;
      return (
        <>
          <circle cx="50" cy="52" r="32" fill="#d4a574" opacity="0.2" />
          <Part fill={config.hairColor} />
        </>
      );
    }
    default:
      return null;
  }
}

PartPreview.displayName = 'PartPreview';

export default PartPreview;
