import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';
import {
  isPlayBillingConfigured,
  getPlayAccessToken,
  verifyPlayPurchase,
} from '@/lib/purchases/playBillingVerify';

/**
 * POST /api/purchases/remove-ads/play — verify a Google Play purchase token and grant the
 * Remove-Ads entitlement. Body: { purchaseToken, productId }.
 *
 * The client's token is NEVER trusted: we verify it against the Google Play Developer API,
 * require purchaseState=0 (Purchased), then call the idempotent grant_remove_ads RPC keyed on
 * the verified orderId. Ships dark (503) until the service-account env is set. See
 * docs/2026-06-08-play-billing-remove-ads-spec.md.
 *
 *   503 not configured · 401 unauthenticated · 400 missing fields / invalid purchase
 *   500 transient (token mint / RPC) · 200 granted | deduped
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPlayBillingConfigured()) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { purchaseToken?: string; productId?: string };
    const purchaseToken = body.purchaseToken?.trim();
    const productId = body.productId?.trim();
    if (!purchaseToken || !productId) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const accessToken = await getPlayAccessToken();
    if (!accessToken) {
      // Couldn't mint an SA token — transient/misconfig; let the client retry.
      return NextResponse.json({ error: 'auth_unavailable' }, { status: 500 });
    }

    const verified = await verifyPlayPurchase({
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME!.trim(),
      productId,
      token: purchaseToken,
      accessToken,
    });
    if ('error' in verified || !verified.valid) {
      return NextResponse.json({ error: 'invalid_purchase' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }

    const { data, error } = await admin.rpc('grant_remove_ads', {
      p_transaction_id: `play_${verified.orderId}`,
      p_user_id: user.id,
      p_provider: 'google_play',
      p_amount_usd: 0,
      p_is_refund: false,
      p_raw: {},
    });

    if (error) {
      captureApiError(new Error(error.message), '/api/purchases/remove-ads/play', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'grant_failed' }, { status: 500 });
    }

    const result = data?.[0] ?? { success: false, deduped: false, ads_removed: false };

    getPostHogServer()?.capture({
      distinctId: user.id,
      event: 'remove_ads_purchase',
      properties: { provider: 'google_play', deduped: !!result.deduped, ads_removed: !!result.ads_removed },
    });

    return NextResponse.json(
      { success: !!result.success, deduped: !!result.deduped, adsRemoved: !!result.ads_removed },
      { status: 200 },
    );
  } catch (err) {
    captureApiError(
      err instanceof Error ? err : new Error('Unknown play billing verify error'),
      '/api/purchases/remove-ads/play',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
