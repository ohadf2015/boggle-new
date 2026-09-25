/**
 * THE avatar compositor — one server-safe renderer for every surface.
 *
 * No hooks, no contexts, no CSS imports, no browser APIs: the browser shell
 * (AvatarRenderer) and the Express PNG route (AvatarRendererSsr) both render
 * this exact tree. Idle life (blink, sparkle twinkle, ray spin) comes from
 * app/avatar-art.css via the .av-anim class when `animated`; the static frame is the hero frame.
 *
 * Layer order (back → front):
 *   bg → rarity backdrop → [character: back accessory → back hair → head
 *   behind-art → body → neck → neck accessory → ears → head → blush → nose →
 *   facial hair → mouth → eyes → brows → front hair → head top-art → front
 *   accessory] → rarity frame → mode frame → tier gem → reaction badge
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { resolveAvatarConfig } from '@/lib/avatar/legacyMap';
import { applyMood, getMoodAnimationClass, type AvatarMood } from '@/lib/avatar/avatarMood';
import type { AvatarOverlay } from '@/lib/avatar/avatarOverlay';
import { getConfigTier, tierToVisual, type Tier } from '@/lib/avatar/rarity';
import { BRAND, safeId, luminance } from './kit';
import { buildCtx } from './ctx';
import { Ears, HeadShape, headFor } from './heads';
import { Body } from './bodies';
import { BROWS, NOSES } from './faceBits';
import { MOUTHS } from './mouths';
import { FACIAL_HAIR } from './facialHair';
import { accDef, eyeDef, hairDef } from './registry';
import { RarityBackdrop, RarityFrame, TokenEdge } from './rarityFx';
import { OverlayBadge } from './OverlayBadge';
import { FACE_CROP } from '@/lib/avatar/faceCrop';

/** Game-mode color frame around avatar — matches brand palette */
export type AvatarMode = 'multiplayer' | 'singleplayer' | 'brain' | 'practice';

export const MODE_FRAME_COLOR: Record<AvatarMode, string> = {
  multiplayer: '#FF1493',
  singleplayer: '#00FFFF',
  brain: '#8B5CF6',
  practice: '#BFFF00',
};

export { FACE_CROP };
const FACE_DECOR = `translate(${FACE_CROP.x} ${FACE_CROP.y}) scale(${FACE_CROP.size / 100})`;

export interface AvatarArtProps {
  config: CustomAvatarConfig;
  /** unique per avatar instance in the document (fragment ids) */
  uid: string;
  size?: number;
  className?: string;
  circular?: boolean;
  mode?: AvatarMode;
  mood?: AvatarMood;
  overlay?: AvatarOverlay | null;
  tierMarker?: boolean;
  forceTier?: Tier;
  /** idle motion (blink, twinkle). Off for SSR / PNG / disableEffects. */
  animated?: boolean;
  /** draw the rarity frame ring (off → rays + sparkles only) */
  rarityFrame?: boolean;
  testId?: string;
  /** 'face' frames the head for small tiles; the container draws the ring. */
  crop?: 'full' | 'face';
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function AvatarArt({
  config, uid: rawUid, size = 64, className = '', circular = false, mode, mood, overlay, tierMarker,
  forceTier, animated = false, rarityFrame = true, testId = 'custom-avatar', crop = 'full',
}: AvatarArtProps) {
  const face = crop === 'face';
  const uid = safeId(rawUid);
  const withMood = applyMood(config, mood);
  const cfg = resolveAvatarConfig(withMood);
  const ctx = buildCtx(cfg, uid, animated);
  const head = headFor(cfg.base);
  const eyes = eyeDef(cfg.eyes);
  const hair = hairDef(cfg.hair);
  const acc = accDef(cfg.accessory);
  const tier: Tier = forceTier ?? getConfigTier(config);
  const visual = tierToVisual(tier);
  const moodClass = getMoodAnimationClass(mood);
  const scope = `av-${uid}`;
  const shadowId = `fs${uid}`;
  const halftoneId = `ht${uid}`;
  const markerTier = tierMarker && !mode && !overlay ? tier : 'free';
  const showGem = markerTier === 'epic' || markerTier === 'legendary';
  const hairT = head.hairScale && head.hairScale !== 1 ? `translate(50 0) scale(${head.hairScale} 1) translate(-50 0)` : undefined;
  const blinkDelay = -((hashNum(uid + cfg.eyes) % 50) / 10);
  const bgShape = circular
    ? <circle cx="50" cy="50" r="50" fill={cfg.bgColor} />
    : <rect x="0" y="0" width="100" height="100" rx="16" fill={cfg.bgColor} />;

  const decor = (
    <>
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

      {showGem && (
        <g data-tier-gem={markerTier}>
          <polygon points="80,6 92,18 80,30 68,18" fill="#000" />
          <polygon points="80,8.5 89.5,18 80,27.5 70.5,18" fill={markerTier === 'legendary' ? '#FFD700' : '#A855F7'} />
          <polygon points="80,8.5 89.5,18 80,18" fill="#fff" opacity="0.25" />
          <polygon points="80,8.5 70.5,18 80,18" fill="#fff" opacity="0.55" />
          <circle cx="76.5" cy="13.5" r="1.1" fill="#fff" opacity="0.9" />
        </g>
      )}

      {overlay && <OverlayBadge overlay={overlay} />}
    </>
  );

  return (
    <svg
      viewBox={face ? `${FACE_CROP.x} ${FACE_CROP.y} ${FACE_CROP.size} ${FACE_CROP.size}` : '0 0 100 100'}
      width={size}
      height={size}
      className={`${scope} ${animated ? 'av-anim' : ''} ${className} ${moodClass}`.replace(/\s+/g, ' ').trim()}
      role="img"
      aria-label={`Avatar: ${cfg.base} face, ${cfg.eyes} eyes, ${cfg.hair} hair`}
      data-testid={testId}
      data-mood={mood ?? 'idle'}
      data-rarity={visual}
    >
      <defs>
        <filter id={shadowId} x="-10%" y="-10%" width="125%" height="125%">
          <feOffset dx="2" dy="2" in="SourceAlpha" result="offset" />
          <feFlood floodColor="#000" floodOpacity="0.45" />
          <feComposite in2="offset" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={halftoneId} data-halftone="" patternUnits="userSpaceOnUse" width="5" height="5">
          <circle cx="1.25" cy="1.25" r="0.6" fill="#000" />
        </pattern>
        <clipPath id={`${uid}-frame`}>
          {circular ? <circle cx="50" cy="50" r="50" /> : <rect x="0" y="0" width="100" height="100" rx="16" />}
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-frame)`}>
        {bgShape}
        <RarityBackdrop tier={visual} uid={uid} circular={circular} />
        <rect x="0" y="0" width="100" height="100" fill={`url(#${halftoneId})`} opacity="0.07" />
        <circle cx="50" cy="104" r="40" fill={luminance(cfg.bgColor) > 0.5 ? '#000' : '#FFF'} opacity="0.07" />

        <g filter={`url(#${shadowId})`}>
          <g className={animated ? 'av-bob' : undefined}>
            {acc.layer === 'back' && acc.render(ctx)}
            {acc.back?.(ctx)}
            {hair.back && <g transform={hairT}>{hair.back(ctx)}</g>}
            {head.behind?.(ctx)}
            <Body ctx={ctx} style={cfg.bodyStyle ?? 'default'} />
            {acc.layer === 'neck' && acc.render(ctx)}
            <Ears ctx={ctx} head={head} />
            <HeadShape ctx={ctx} head={head} />
            {!head.noBlush && (
              <g fill={BRAND.pink} opacity="0.28">
                <ellipse cx="35" cy="57.5" rx="3.8" ry="2.3" />
                <ellipse cx="65" cy="57.5" rx="3.8" ry="2.3" />
              </g>
            )}
            {!head.ownNose && NOSES[cfg.noseStyle ?? 'button']?.(ctx)}
            {cfg.gender === 'male' && FACIAL_HAIR[cfg.facialHair ?? 'none']?.(ctx)}
            {(MOUTHS[cfg.mouth] ?? MOUTHS.smile)(ctx)}
            <g
              className={animated && eyes.blink ? 'av-blink' : undefined}
              style={animated && eyes.blink ? { animationDelay: `${blinkDelay}s` } : undefined}
            >
              {eyes.render(ctx)}
            </g>
            {(BROWS[cfg.eyebrows ?? 'none'] ?? BROWS.none)(ctx)}
            {hair.front && <g transform={hairT}>{hair.front(ctx)}</g>}
            {eyes.over?.(ctx)}
            {head.top?.(ctx)}
            {acc.layer === 'front' && acc.render(ctx)}
          </g>
        </g>
      </g>

      <RarityFrame tier={visual} uid={uid} circular={circular} showRing={rarityFrame && !mode && !face} />
      {visual === 'common' && circular && rarityFrame && !mode && !face && <TokenEdge />}

      {/* Badges are drawn for the full token; a face crop maps them into its window. */}
      {face && (mode || showGem || overlay)
        ? <g transform={FACE_DECOR}>{decor}</g>
        : decor}
    </svg>
  );
}
