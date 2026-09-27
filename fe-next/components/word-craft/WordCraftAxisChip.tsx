'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Axis } from '@/lib/word-craft/placement';

export interface WordCraftAxisChipProps {
  axis: Axis;
  /** Tap to flip H↔V; ignored when axis is null. */
  onFlip?: () => void;
  labelHorizontal: string;
  labelVertical: string;
  ariaLabel: string;
}

/**
 * Compact chip showing the axis inferred from current pending tiles.
 * Renders nothing when fewer than 2 pending tiles exist (axis null).
 */
function WordCraftAxisChipImpl({
  axis,
  onFlip,
  labelHorizontal,
  labelVertical,
  ariaLabel,
}: WordCraftAxisChipProps) {
  if (!axis) return null;
  const isH = axis === 'h';
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={ariaLabel}
      data-wc-axis-chip={axis}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 shrink-0',
        'rounded-neo border-neo-thick border-black bg-neo-yellow text-neo-navy',
        'shadow-hard-sm font-neo-display font-black uppercase tracking-wider text-xs',
        'transition-transform active:scale-95 hover:-translate-y-0.5',
      )}
    >
      <span aria-hidden className="text-base leading-none">
        {isH ? '→' : '↓'}
      </span>
      <span>{isH ? labelHorizontal : labelVertical}</span>
    </button>
  );
}

export const WordCraftAxisChip = memo(WordCraftAxisChipImpl);
