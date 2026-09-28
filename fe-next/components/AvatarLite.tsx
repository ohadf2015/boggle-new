'use client';

import { cn } from '@/lib/utils';
import { AVATAR_RENDER_VERSION } from '@/lib/avatar/renderVersion';
import { computeAvatarSeedHash } from '@/lib/avatar/configHash';
import { FACE_CROP_MAX_PX, faceCropImageStyle } from '@/lib/avatar/faceCrop';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

const FACE_STYLE = faceCropImageStyle();

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

/**
 * Prefer passing the FULL `avatar_config`. Disc paint only needs colors, but
 * the PNG cache-bust hashes every visual field — a hair/eyes edit with the
 * same bg/skin must still change the URL or the 1-day browser cache keeps the
 * old face.
 */
export type AvatarLiteConfig = Partial<CustomAvatarConfig> & {
  bgColor?: string | null;
  skinColor?: string | null;
};

// Mirrors backend/routes/avatarPng.ts SEED_RE.
const SEED_RE = /^[A-Za-z0-9_-]{1,64}$/;
// Bust token in the path (WebView-safe); keep charset URL-path friendly.
const BUST_RE = /^[a-f0-9]{1,16}$/i;

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function seedColor(seed?: string | null): string {
  if (!seed) return PALETTE[0];
  return PALETTE[parseInt(hash(seed), 16) % PALETTE.length];
}

/**
 * PNG URL for a player id or guest seed. Bust lives in the PATH (`/v/:bust`)
 * so Android WebView / caches that ignore query strings still drop the
 * previous face after a save. Covers render-version (art redraws), every
 * visual config field (not just colors), and optional `revision`
 * (e.g. profile.updated_at). Null only without a usable id.
 */
export function avatarPngSrc(
  userId: string | null | undefined,
  customAvatar: AvatarLiteConfig | null | undefined,
  renderVersion: string = AVATAR_RENDER_VERSION,
  revision?: string | null,
): string | null {
  if (!userId || !SEED_RE.test(userId)) return null;
  const visual = computeAvatarSeedHash(customAvatar);
  const bust = hash(`${renderVersion}|${visual}|${revision ?? ''}`);
  // Defense: never emit a bust that wouldn't match the route's param check.
  if (!BUST_RE.test(bust)) return `/api/avatar/png/${userId}/v/${hash(bust)}`;
  return `/api/avatar/png/${userId}/v/${bust}`;
}

export default function AvatarLite({
  userId,
  customAvatar,
  size = 'sm',
  pixelSize,
  className,
  revision,
}: {
  userId?: string;
  customAvatar?: AvatarLiteConfig | null;
  size?: AvatarLiteSize;
  pixelSize?: number;
  className?: string;
  /** Optional save/update stamp (e.g. profile.updated_at) to force a new PNG URL. */
  revision?: string | null;
}) {
  const px = pixelSize ?? SIZE_PX[size];
  const bg = (typeof customAvatar?.bgColor === 'string' && customAvatar.bgColor)
    || (typeof customAvatar?.skinColor === 'string' && customAvatar.skinColor)
    || seedColor(userId);
  const src = avatarPngSrc(userId, customAvatar, AVATAR_RENDER_VERSION, revision);
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
          key={src}
          src={src}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          // Same face window as the SVG path; also crops the PNG's own token ring.
          style={px <= FACE_CROP_MAX_PX ? FACE_STYLE : undefined}
          // A 404 can land before hydration, when onError isn't attached yet — catch it on mount.
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) el.style.display = 'none';
          }}
          onLoad={(e) => {
            e.currentTarget.style.display = '';
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
