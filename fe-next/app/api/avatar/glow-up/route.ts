/**
 * Avatar Glow-Up API (ADMIN ONLY for now).
 *
 * POST — generate a premium AI hero portrait of the caller's built avatar.
 * Flow: admin-gate → validate config → rasterize the sent SVG → Higgsfield
 * (Nano Banana, reference-anchored) → persist render url + status + seed hash.
 *
 * Additive: the portrait is shown only on hero surfaces (selectAvatarDisplay);
 * the live SVG avatar is unchanged everywhere else.
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { customAvatarSchema } from '@/shared/types/customAvatar';
import { computeAvatarSeedHash } from '@/lib/avatar/glowUpSeed';
import { rasterizeSvgToPng, getServerGlowUpProvider } from '@/lib/avatar/glowUpProvider.server';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  // Admin-only gate (rollout: admin → rewarded-ad beta → general).
  const auth = await verifyAdminAuth(request);
  if (!auth.success || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generation is expensive — keep the limit tight even for admins.
  const rl = checkApiRateLimit(request, 'avatar-glow-up', { maxRequests: 10, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.svgString !== 'string' || body.svgString.length === 0) {
      return NextResponse.json({ error: 'Missing avatar svg' }, { status: 400 });
    }

    const parsedConfig = customAvatarSchema.safeParse(body.config);
    if (!parsedConfig.success) {
      return NextResponse.json({ error: 'Invalid avatar config' }, { status: 400 });
    }
    const config = parsedConfig.data;

    // SVG → PNG reference, then Higgsfield generation (server-only provider).
    const referencePng = await rasterizeSvgToPng(body.svgString, 512);
    const { url } = await getServerGlowUpProvider().generate({ referencePng });

    const seedHash = computeAvatarSeedHash(config);

    // Persist is BEST-EFFORT so the admin preview always returns even if the
    // glow-up columns aren't migrated yet. `persisted` tells the client whether
    // cross-surface display (profile/win) will see this render.
    let persisted = false;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_render_url: url,
          avatar_render_status: 'ready',
          avatar_render_seed_hash: seedHash,
        })
        .eq('id', auth.user.id);
      if (updateError) {
        captureApiError(
          new Error(`glow-up persist failed (apply migration 20260620120000?): ${updateError.message}`),
          '/api/avatar/glow-up',
          { method: 'POST' },
        );
      } else {
        persisted = true;
      }
    }

    return NextResponse.json({ url, seedHash, status: 'ready', persisted });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    captureApiError(err, '/api/avatar/glow-up', { method: 'POST' });
    // Admin-only route: surface the actual cause so the operator can tell a
    // config gap (e.g. "No Higgsfield token", binary not on PATH) from a real
    // bug. The generic message left every failure indistinguishable.
    return NextResponse.json(
      { error: `Glow-up generation failed: ${err.message}` },
      { status: 500 },
    );
  }
}
