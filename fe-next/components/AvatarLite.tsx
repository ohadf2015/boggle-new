'use client';

import { cn } from '@/lib/utils';

/**
 * First-paint stand-in for `Avatar`. The real renderer drags in ~477 KiB of
 * inline SVG parts (chunk 65990) onto every route that import()s it — even
 * behind next/dynamic. Landing / HomeHub must not touch that graph.
 *
 * This paints a sized circle from `customAvatar.bgColor` / `skinColor` (or a
 * seeded palette). No SVG parts, no AvatarRenderer, no builder.
 */
const PALETTE = ['#FF6B35', '#8B5CF6', '#00897B', '#3B82F6', '#C62828', '#FFD700'] as const;

const SIZE_PX = { sm: 32, md: 40, lg: 48, xl: 64, '2xl': 80 } as const;

export type AvatarLiteSize = keyof typeof SIZE_PX;

export interface AvatarLiteConfig {
  bgColor?: string | null;
  skinColor?: string | null;
}

function seedColor(seed?: string | null): string {
  if (!seed) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

export default function AvatarLite({
  userId,
  customAvatar,
  size = 'sm',
  pixelSize,
  className,
}: {
  userId?: string;
  customAvatar?: AvatarLiteConfig | null;
  size?: AvatarLiteSize;
  pixelSize?: number;
  className?: string;
}) {
  const px = pixelSize ?? SIZE_PX[size];
  const bg = customAvatar?.bgColor || customAvatar?.skinColor || seedColor(userId);
  return (
    <div
      data-testid="avatar-lite"
      data-user-id={userId ?? ''}
      data-has-custom={customAvatar ? 'true' : 'false'}
      className={cn('rounded-full border-2 border-neo-black shrink-0', className)}
      style={{ width: px, height: px, backgroundColor: bg }}
      aria-hidden
    />
  );
}
