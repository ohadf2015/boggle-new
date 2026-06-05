import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';
import {
  AYET_SIGNATURE_HEADER,
  verifyAyetSignature,
  parseAyetPostback,
  computeAyetSignature,
} from '@/lib/ads/ayetOfferwallPostback';

/**
 * GET /api/offerwall/ayet — ayeT-Studios offerwall server-to-server conversion postback.
 *
 * This is the ONLY path that credits offerwall coins (the client iframe never does).
 * Order is the security contract: verify signature over the FULL received param set →
 * parse the subset we act on → idempotent service-role grant → 200.
 *
 * Status semantics (ayeT retries 12× over 1h on any non-200):
 *   503  ayeT not configured (no AYET_POSTBACK_SECRET / no service-role client) — dark.
 *   403  signature verification failed — forged/tampered; never retry-credit.
 *   400  validly-signed but malformed (missing required fields).
 *   500  transient RPC/internal error — let ayeT retry.
 *   200  handled (credited, deduped, or permanent profile-not-found) — stop retrying.
 *
 * ayeT signs the optional HMAC over the whole querystring keyed by the publisher API
 * key; see lib/ads/ayetOfferwallPostback.ts and docs/2026-06-05-web-offerwall-ayet-spec.md.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.AYET_POSTBACK_SECRET?.trim();
    if (!secret) {
      // Offerwall not provisioned yet — ships dark, flips by env.
      return NextResponse.json({ error: 'offerwall_not_configured' }, { status: 503 });
    }

    // Full received param set — the signature is computed over ALL of them, not our subset.
    const url = new URL(request.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => { params[key] = value; });

    const headerHash = request.headers.get(AYET_SIGNATURE_HEADER) ?? '';
    if (!verifyAyetSignature(params, headerHash, secret)) {
      if (process.env.AYET_POSTBACK_DEBUG === 'true') {
        // Flip-live diagnostic (checklist step 8): a 403 is otherwise opaque.
        console.warn('[ayet-offerwall] signature mismatch', {
          received: headerHash,
          computed: computeAyetSignature(params, secret),
        });
      }
      return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });
    }

    const parsed = parseAyetPostback(params);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'offerwall_not_configured' }, { status: 503 });
    }

    const { data, error } = await supabase.rpc('grant_offerwall_coins', {
      p_transaction_id: parsed.transactionId,
      p_user_id: parsed.userId,
      p_amount: Math.trunc(parsed.currencyAmount),
      p_payout_usd: parsed.payoutUsd,
      p_is_chargeback: parsed.isChargeback,
      p_offer_id: parsed.offerId ?? null,
      p_offer_name: parsed.offerName ?? null,
      p_network: 'ayet',
      p_raw: params,
    });

    if (error) {
      // Transient — make ayeT retry rather than silently dropping a real conversion.
      captureApiError(new Error(error.message), '/api/offerwall/ayet', {
        method: 'GET',
        userId: parsed.userId,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'grant_failed' }, { status: 500 });
    }

    const result = data?.[0] ?? { success: false, deduped: false, new_balance: 0 };

    getPostHogServer()?.capture({
      distinctId: parsed.userId,
      event: 'offerwall_conversion',
      properties: {
        network: 'ayet',
        amount: Math.trunc(parsed.currencyAmount),
        payout_usd: parsed.payoutUsd,
        is_chargeback: parsed.isChargeback,
        deduped: !!result.deduped,
        credited: !!result.success && !result.deduped,
        offer_id: parsed.offerId,
      },
    });

    // Both a real credit and a permanent profile-not-found are "handled" — ack so ayeT
    // stops retrying. Only transient DB errors (above) return non-200.
    return NextResponse.json(
      { success: !!result.success, deduped: !!result.deduped, newBalance: result.new_balance },
      { status: 200 },
    );
  } catch (err) {
    captureApiError(
      err instanceof Error ? err : new Error('Unknown offerwall postback error'),
      '/api/offerwall/ayet',
      { method: 'GET', statusCode: 500 },
    );
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
