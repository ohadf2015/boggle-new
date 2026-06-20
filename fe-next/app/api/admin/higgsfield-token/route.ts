/**
 * Higgsfield token admin endpoint (ADMIN ONLY) — rotate the prod token LIVE.
 *
 * Device-login tokens expire. To refresh prod without a redeploy: run
 * `higgsfield auth token` locally and PUT the value here. Stored in `app_secrets`
 * (service-role-only) and picked up within the resolver's ~30s cache.
 *
 *   GET  → { configured, valid, plan?, credits? }  (never returns the token)
 *   PUT  → { token }  upserts the token
 *
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B §6b).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getHiggsfieldToken, setHiggsfieldToken, clearHiggsfieldTokenCache } from '@/lib/avatar/higgsfieldToken';
import { captureApiError } from '@/utils/sentry';

const HF_API_BASE = process.env.HIGGSFIELD_API_BASE || 'https://fnf.higgsfield.ai';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = await getHiggsfieldToken();
    if (!token) return NextResponse.json({ configured: false, valid: false });

    // Probe the account endpoint to confirm the token is still live.
    const res = await fetch(`${HF_API_BASE}/agents/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ configured: true, valid: false, status: res.status });
    const data = (await res.json().catch(() => ({}))) as { credits?: number; subscription_plan_type?: string };
    return NextResponse.json({
      configured: true,
      valid: true,
      plan: data.subscription_plan_type ?? null,
      credits: typeof data.credits === 'number' ? data.credits : null,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/admin/higgsfield-token', { method: 'GET' });
    return NextResponse.json({ error: 'Token check failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success || !auth.user) return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkApiRateLimit(request, 'higgsfield-token-set', { maxRequests: 10, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json().catch(() => null);
    const token = body?.token;
    if (typeof token !== 'string' || token.length < 20) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    await setHiggsfieldToken(token.trim(), auth.user.id);
    clearHiggsfieldTokenCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/admin/higgsfield-token', { method: 'PUT' });
    return NextResponse.json({ error: 'Failed to store token' }, { status: 500 });
  }
}
