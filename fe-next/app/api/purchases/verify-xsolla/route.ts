import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { captureApiError } from '@/utils/sentry';

/**
 * Xsolla webhook verification endpoint.
 *
 * Validates incoming Xsolla payment webhooks using HMAC-SHA1 signature.
 * Xsolla sends the signature in the Authorization header as:
 *   Authorization: Signature <hmac-sha1-hex>
 *
 * The HMAC is computed over the raw request body using XSOLLA_WEBHOOK_SECRET.
 *
 * POST /api/purchases/verify-xsolla
 * Returns: 200 on valid signature, 401 on invalid, 500 on error
 *
 * Env: XSOLLA_WEBHOOK_SECRET - project webhook secret from Xsolla dashboard
 */

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.XSOLLA_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Xsolla] XSOLLA_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook verification not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    // Extract signature from Authorization header
    const authHeader = request.headers.get('authorization') ?? '';
    const signatureMatch = authHeader.match(/^Signature\s+(.+)$/i);
    if (!signatureMatch) {
      return NextResponse.json(
        { error: 'Missing or malformed Authorization header' },
        { status: 401 }
      );
    }
    const receivedSignature = signatureMatch[1];

    // Compute expected HMAC-SHA1 signature
    const expectedSignature = crypto
      .createHmac('sha1', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Signature valid — parse the webhook payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const notificationType = payload.notification_type;

    // Handle different notification types
    switch (notificationType) {
      case 'payment': {
        // Payment completed — grant the purchased item
        const transaction = payload.transaction as Record<string, unknown> | undefined;
        const orderId = transaction?.id;
        console.log(`[Xsolla] Payment received: order=${orderId}`);
        // TODO: Grant purchased item to user via Supabase
        // TODO: Call CrazyGames trackOrder() analytics
        break;
      }
      case 'refund': {
        // Payment refunded — revoke the purchased item
        const transaction = payload.transaction as Record<string, unknown> | undefined;
        const orderId = transaction?.id;
        console.log(`[Xsolla] Refund received: order=${orderId}`);
        // TODO: Revoke purchased item
        break;
      }
      case 'user_validation': {
        // Xsolla checking if user exists — respond 200 to confirm
        break;
      }
      default: {
        console.log(`[Xsolla] Unknown notification type: ${notificationType}`);
      }
    }

    // Xsolla expects 200 with no body or simple JSON
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/purchases/verify-xsolla'
    );
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
