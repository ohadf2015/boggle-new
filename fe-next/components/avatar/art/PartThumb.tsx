'use client';

/**
 * Cheap picker thumbnail: ONE small SVG that draws only the layers a part
 * needs (head + that part, cropped to where it lives), in the player's own
 * colors. No rarity backdrop, no filters, no animation, no mood — a grid of
 * 40 of these costs a fraction of 40 full avatars.
 */
import { memo, useId } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { mapLegacyPart, resolveAvatarConfig } from '@/lib/avatar/legacyMap';
import { safeId, type ArtCtx } from './kit';
import { buildCtx } from './ctx';
import { Ears, HeadShape, headFor } from './heads';
import { Body } from './bodies';
import { BROWS, NOSES } from './faceBits';
import { MOUTHS } from './mouths';
import { FACIAL_HAIR } from './facialHair';
import { accDef, eyeDef, hairDef } from './registry';

export type ThumbCategory =
  | 'base' | 'hair' | 'eyes' | 'eyebrows' | 'noseStyle' | 'mouth' | 'facialHair' | 'accessory' | 'bodyStyle';

export interface PartThumbProps {
  category: ThumbCategory;
  id: string;
  /** the player's current config (colors, face) */
  config: CustomAvatarConfig;
  size?: number;
  className?: string;
}

const VIEW: Record<ThumbCategory, string> = {
  base: '14 8 72 72',
  hair: '4 -4 92 92',
  eyes: '27 36 46 26',
  eyebrows: '27 31 46 26',
  noseStyle: '36 43 28 22',
  mouth: '33 49 34 24',
  facialHair: '20 38 60 56',
  accessory: '2 -4 96 96',
  bodyStyle: '10 56 80 48',
};

function Face({ ctx, cfg, parts }: { ctx: ArtCtx; cfg: CustomAvatarConfig; parts: { eyes?: boolean; mouth?: boolean; brows?: boolean; nose?: boolean } }) {
  const head = headFor(cfg.base);
  return (
    <g>
      <Ears ctx={ctx} head={head} />
      <HeadShape ctx={ctx} head={head} />
      {parts.nose && !head.ownNose && NOSES[cfg.noseStyle ?? 'button']?.(ctx)}
      {parts.mouth && (MOUTHS[cfg.mouth] ?? MOUTHS.smile)(ctx)}
      {parts.eyes && eyeDef(cfg.eyes).render(ctx)}
      {parts.brows && (BROWS[cfg.eyebrows ?? 'none'] ?? BROWS.none)(ctx)}
    </g>
  );
}

function Layers({ category, ctx, cfg }: { category: ThumbCategory; ctx: ArtCtx; cfg: CustomAvatarConfig }) {
  const head = headFor(cfg.base);
  const all = { eyes: true, mouth: true, brows: true, nose: true };
  switch (category) {
    case 'base':
      return (
        <g>
          {head.behind?.(ctx)}
          <Face ctx={ctx} cfg={cfg} parts={all} />
          {head.top?.(ctx)}
        </g>
      );
    case 'hair': {
      const hair = hairDef(cfg.hair);
      return (
        <g>
          {hair.back?.(ctx)}
          <Face ctx={ctx} cfg={cfg} parts={all} />
          {hair.front?.(ctx)}
        </g>
      );
    }
    case 'eyes':
      return (
        <g>
          <Face ctx={ctx} cfg={cfg} parts={{}} />
          {eyeDef(cfg.eyes).render(ctx)}
          {eyeDef(cfg.eyes).over?.(ctx)}
        </g>
      );
    case 'eyebrows':
      return <Face ctx={ctx} cfg={cfg} parts={{ eyes: true, brows: true }} />;
    case 'noseStyle':
      return <Face ctx={ctx} cfg={cfg} parts={{ nose: true }} />;
    case 'mouth':
      return <Face ctx={ctx} cfg={cfg} parts={{ mouth: true, nose: true }} />;
    case 'facialHair':
      return (
        <g>
          <Face ctx={ctx} cfg={cfg} parts={{ eyes: true, nose: true }} />
          {FACIAL_HAIR[cfg.facialHair ?? 'none']?.(ctx)}
          {(MOUTHS[cfg.mouth] ?? MOUTHS.smile)(ctx)}
        </g>
      );
    case 'accessory': {
      const acc = accDef(cfg.accessory);
      return (
        <g>
          {acc.layer === 'back' && acc.render(ctx)}
          {acc.layer !== 'front' && <Body ctx={ctx} style={cfg.bodyStyle ?? 'default'} />}
          {acc.layer === 'neck' && acc.render(ctx)}
          <Face ctx={ctx} cfg={cfg} parts={all} />
          {acc.layer === 'front' && acc.render(ctx)}
        </g>
      );
    }
    case 'bodyStyle':
      return (
        <g>
          <Body ctx={ctx} style={cfg.bodyStyle ?? 'default'} />
          <Face ctx={ctx} cfg={cfg} parts={{ mouth: true }} />
        </g>
      );
    default:
      return null;
  }
}

export const PartThumb = memo(function PartThumb({ category, id, config, size = 48, className }: PartThumbProps) {
  const uid = safeId(`t${useId()}`);
  const drawnId = mapLegacyPart(category, id);
  // Thumbs show the part on the player's face; show a bare head for hair/hat
  // cells so the part itself is what reads.
  const base = resolveAvatarConfig({
    ...config,
    [category]: drawnId,
    ...(category === 'facialHair' ? { gender: 'male' } : {}),
  });
  const cfg: CustomAvatarConfig = category === 'accessory' ? { ...base, hair: 'none' } : base;
  const ctx = buildCtx(cfg, uid, false);
  return (
    <svg
      viewBox={VIEW[category]}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      data-part={`${category}:${drawnId}`}
    >
      <Layers category={category} ctx={ctx} cfg={cfg} />
    </svg>
  );
});
