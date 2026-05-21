import { NextResponse } from 'next/server';
import sharp from 'sharp';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getSupabaseAdmin } from '@/lib/email';
import logger from '@/backend/utils/logger';

/**
 * GET /api/avatar/png/[playerId]
 *
 * Renders a player's `avatar_config` (JSONB) to a PNG so FCM/Web Push
 * imageUrl can show their actual face — not the mascot fallback.
 *
 * Pipeline: avatar_config → <AvatarRenderer> → SVG string (renderToStaticMarkup)
 *   → sharp → PNG buffer. Tier effects and blink animation disabled (PNG
 *   captures a single frame and animations would create dead artifacts).
 *
 * Caching: 1-day browser, 7-day shared (CDN), stale-while-revalidate so a
 * user changing their avatar gets fresh-on-next-fetch without blocking
 * push delivery on a 200ms render miss.
 *
 * Failure mode: any render/db error returns 404 (FCM then silently drops
 * the imageUrl and the push still delivers with mascot fallback) — never
 * 500, so a cron tick never breaks because one user's avatar is malformed.
 */
export const runtime = 'nodejs';

const PNG_SIZE = 256;
const CACHE_CONTROL =
  'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

interface RouteParams {
  params: Promise<{ playerId: string }>;
}

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export async function GET(_req: Request, { params }: RouteParams) {
  const { playerId } = await params;

  if (!UUID_RE.test(playerId)) {
    return new NextResponse('invalid playerId', { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return new NextResponse('db unavailable', { status: 404 });

    const res = await supabase
      .from('profiles')
      .select('avatar_config')
      .eq('id', playerId)
      .maybeSingle();

    const config = res.data?.avatar_config as CustomAvatarConfig | null | undefined;
    if (!config || typeof config !== 'object') {
      return new NextResponse('no avatar_config', { status: 404 });
    }

    const [{ default: React }, { renderToStaticMarkup }, { default: AvatarRendererSsr }] =
      await Promise.all([
        import('react'),
        import('react-dom/server'),
        import('@/components/avatar/AvatarRendererSsr'),
      ]);

    const svg = renderToStaticMarkup(
      React.createElement(AvatarRendererSsr, {
        config,
        size: PNG_SIZE,
        circular: true,
      })
    );

    const png = await sharp(Buffer.from(svg))
      .resize(PNG_SIZE, PNG_SIZE)
      .png({ compressionLevel: 9 })
      .toBuffer();

    // NextResponse expects BodyInit — Buffer is a Uint8Array at runtime but
    // its TS type isn't assignable directly. Cast through Uint8Array.
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': CACHE_CONTROL,
      },
    });
  } catch (err) {
    logger.error?.('AVATAR_PNG', `render failed for ${playerId}: ${(err as Error).message}`);
    return new NextResponse('render error', { status: 404 });
  }
}
