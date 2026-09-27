'use client';

import { memo } from 'react';
import { Gem, Crown } from 'lucide-react';
import type { GemColor, GemRarity } from '@/lib/word-craft/gems/types';
import { cn } from '@/lib/utils';

const COLOR_CLASS: Record<GemColor, { fill: string; stroke: string; ring: string }> = {
  amber:    { fill: 'fill-neo-yellow',  stroke: 'stroke-black',  ring: 'ring-neo-yellow' },
  ruby:     { fill: 'fill-neo-pink',    stroke: 'stroke-black',  ring: 'ring-neo-pink' },
  sapphire: { fill: 'fill-neo-cyan',    stroke: 'stroke-black',  ring: 'ring-neo-cyan' },
  emerald:  { fill: 'fill-neo-lime',    stroke: 'stroke-black',  ring: 'ring-neo-lime' },
};

const SIZE_PX: Record<GemRarity, number> = { 1: 14, 2: 18, 3: 22 };

export interface GemIconProps {
  color: GemColor;
  rarity: GemRarity;
  /** Override the auto rarity-based size in px */
  sizePx?: number;
  /** Add a hard outer ring to draw eye (used by board overlay) */
  withRing?: boolean;
  /** Optional className for layout */
  className?: string;
  'aria-label'?: string;
  /** Stable data-gem-id for animation tracking */
  dataGemId?: string;
}

function GemIconImpl({ color, rarity, sizePx, withRing, className, 'aria-label': ariaLabel, dataGemId }: GemIconProps) {
  const c = COLOR_CLASS[color];
  const size = sizePx ?? SIZE_PX[rarity];
  return (
    <span
      data-gem-id={dataGemId}
      data-gem-color={color}
      data-gem-rarity={rarity}
      aria-label={ariaLabel ?? `${color} ${rarity === 3 ? 'crown' : rarity === 2 ? 'shard' : 'chip'}`}
      className={cn(
        'relative inline-flex items-center justify-center',
        withRing && `rounded-full ring-2 ring-inset ${c.ring} bg-neo-navy/90 p-0.5 shadow-hard-sm`,
        className,
      )}
      style={{ width: size + 4, height: size + 4 }}
    >
      <Gem
        width={size}
        height={size}
        className={cn(c.fill, c.stroke)}
        strokeWidth={2}
        aria-hidden
      />
      {rarity === 3 ? (
        <Crown
          width={size * 0.45}
          height={size * 0.45}
          className="absolute -top-1 left-1/2 -translate-x-1/2 fill-neo-yellow stroke-black"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
    </span>
  );
}

export const GemIcon = memo(GemIconImpl);
