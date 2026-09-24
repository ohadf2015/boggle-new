'use client';

import { forwardRef, useId } from 'react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { LevelUnlock } from '@/lib/avatar/unlocks';
import { CUTOUT_CLASS } from './avatarCutout';
import { handColor, type RevealAttitude } from './revealAttitude';
import type { RevealTheme } from './revealTheme';
import {
  BoxBack,
  BoxFront,
  ColorBackdrop,
  FlyingLid,
  FxGlyphs,
  GripHand,
  LightShafts,
  RIM_Y,
  ThumbsUp,
} from './RevealStageArt';

const VIEW = '0 0 200 214';
const VIEW_H = 214;
/** Width / height of the stage box. */
export const STAGE_ASPECT = 200 / VIEW_H;
/** The avatar below the rim is inside the box: clip it off, whatever the pop animation does. */
const ABOVE_RIM = `inset(-60% -60% ${((1 - RIM_Y / VIEW_H) * 100).toFixed(2)}% -60%)`;

export interface RevealStageProps {
  unlock: LevelUnlock;
  attitude: RevealAttitude;
  /** The avatar as staged (attitudeConfig): wearing the part, pulling the item's face. */
  wearing: CustomAvatarConfig;
  theme: RevealTheme;
}

function isDark(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.2;
}

/**
 * The hero of the reveal: the player's own avatar popping out of a reward box
 * dressed in the rarity, hands on the rim (or a thumbs-up), pulling the item's
 * face, with the item's own effect floating around and light pouring out of
 * the box. Four stacked SVG layers share one viewBox: back (light, lid,
 * backdrop, box opening) → avatar → box front + hands → effects. The avatar
 * layer is static (its rim-light filter rasterizes once); only its wrapper
 * moves, so the pop stays on the compositor.
 */
const RevealStage = forwardRef<HTMLDivElement, RevealStageProps>(function RevealStage(
  { unlock, attitude, wearing, theme },
  ref,
) {
  const uid = `lcr${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { box } = theme;
  const skin = handColor(wearing);
  const layer = 'absolute inset-0 w-full h-full overflow-visible';

  return (
    <div
      ref={ref}
      data-testid="unlock-reveal-scene"
      data-fx={attitude.fx}
      data-pose={attitude.pose}
      className="relative w-full"
      style={{ aspectRatio: `200 / ${VIEW_H}` }}
    >
      <svg viewBox={VIEW} className={layer} aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-glow`} cx="100" cy="120" r="104" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={box.glow} />
            <stop offset="0.36" stopColor={theme.hex} stopOpacity="0.55" />
            <stop offset="1" stopColor={theme.hex} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="118" r="104" fill={`url(#${uid}-glow)`} />
        <LightShafts color={box.glow} />
        {attitude.backdrop && <ColorBackdrop color={unlock.partId} ring={theme.hex} dark={isDark(unlock.partId)} />}
        <FlyingLid box={box} />
        <BoxBack box={box} uid={uid} />
      </svg>

      <div className="absolute inset-0" style={{ clipPath: ABOVE_RIM }}>
        <div className="lcr-anim lcr-emerge absolute inset-0">
          <svg viewBox={VIEW} className={`${CUTOUT_CLASS} ${layer}`} aria-hidden="true">
            <defs>
              <filter id={`${uid}-lit`} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
                {/* rim light: the burst behind throws a thin line of light on the top edges */}
                <feMorphology in="SourceAlpha" operator="erode" radius="0.9" result="er" />
                <feOffset in="er" dx="0" dy="1.6" result="erd" />
                <feComposite in="SourceAlpha" in2="erd" operator="out" result="edge" />
                <feGaussianBlur in="edge" stdDeviation="0.7" result="edgeb" />
                <feComposite in="edgeb" in2="SourceAlpha" operator="in" result="edgein" />
                <feFlood floodColor={box.rim} floodOpacity="0.8" />
                <feComposite in2="edgein" operator="in" result="rim" />
                {/* key light from the top left, falling off toward the box */}
                <feDiffuseLighting in="SourceAlpha" surfaceScale="0" diffuseConstant="1.18" lightingColor="#fff" result="light">
                  <fePointLight x="62" y="18" z="120" />
                </feDiffuseLighting>
                <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="lit" />
                <feMerge>
                  <feMergeNode in="lit" />
                  <feMergeNode in="rim" />
                </feMerge>
              </filter>
            </defs>
            <g filter={`url(#${uid}-lit)`}>
              <g transform={`rotate(${attitude.tilt} 100 128)`}>
                <g transform="translate(22 2)">
                  <AvatarRenderer config={wearing} size={156} disableEffects forceTier="free" />
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <svg viewBox={VIEW} className={layer} aria-hidden="true">
        <BoxFront box={box} star={theme.hex} uid={uid} />
        <GripHand x={57} skin={skin} />
        {attitude.pose === 'grip' && <GripHand x={143} skin={skin} flip />}
      </svg>

      <svg viewBox={VIEW} className={layer} aria-hidden="true">
        <FxGlyphs kind={attitude.fx} accent={theme.hex} withThumb={attitude.pose === 'thumbsUp'} />
        {attitude.pose === 'thumbsUp' && <ThumbsUp skin={skin} />}
      </svg>
    </div>
  );
});

export default RevealStage;
