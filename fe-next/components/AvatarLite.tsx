'use client';

import { cn } from '@/lib/utils';
import { AVATAR_RENDER_VERSION } from '@/lib/avatar/renderVersion';

/**
 * First-paint stand-in for `Avatar`: keeps the art library off the landing /
 * HomeHub first-paint graph.
 *
 * This paints a sized circle from `customAvatar.bgColor` / `skinColor` (or a
 * seeded palette), then overlays the face as a server-rendered PNG
 * (`/api/avatar/png/[id]`) drawn by the same compositor as `Avatar`. The
 * route falls back to the seeded face `Avatar` uses, so guests and players
 * without a config match too. `onError` hides the img and the circle remains.
 */
const PALETTE = ['#FF6B35', '#8B5CF6', '#00897B', '#3B82F6', '#C62828', '#FFD700'] as const;

const SIZE_PX = { sm: 32, md: 40, lg: 48, xl: 64, '2xl': 80 } as const;

export type AvatarLiteSize = keyof typeof SIZE_PX;

export interface AvatarLiteConfig {
  bgColor?: string | null;
  skinColor?: string | null;
}

// Mirrors backend/routes/avatarPng.ts SEED_RE.
const SEED_RE = /^[A-Za-z0-9_-]{1,64}$/;

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function seedColor(seed?: string | null): string {
  if (!seed) return PALETTE[0];
  return PALETTE[parseInt(hash(seed), 36) % PALETTE.length];
}

/**
 * PNG URL for a player id or guest seed. `v` busts the 1-day browser cache
 * when the player edits their avatar AND the 7-day CDN cache when the art
 * changes (AVATAR_RENDER_VERSION). Null only without a usable id.
 */
export function avatarPngSrc(
  userId: string | null | undefined,
  customAvatar: AvatarLiteConfig | null | undefined,
  renderVersion: string = AVATAR_RENDER_VERSION,
): string | null {
  if (!userId || !SEED_RE.test(userId)) return null;
  return `/api/avatar/png/${userId}?v=${hash(`${renderVersion}|${JSON.stringify(customAvatar ?? null)}`)}`;
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
  const src = avatarPngSrc(userId, customAvatar);
  return (
    <div
      data-testid="avatar-lite"
      data-user-id={userId ?? ''}
      data-has-custom={customAvatar ? 'true' : 'false'}
      className={cn('rounded-full border-2 border-neo-black shrink-0 overflow-hidden', className)}
      style={{ width: px, height: px, backgroundColor: bg }}
      aria-hidden
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- already a sized PNG; the optimizer would re-encode it
        <img
          src={src}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          // A 404 can land before hydration, when onError isn't attached yet — catch it on mount.
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) el.style.display = 'none';
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
