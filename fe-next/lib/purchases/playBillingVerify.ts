/**
 * Remove-Ads IAP — Google Play Billing purchase verification (server side).
 *
 * The SECURITY BOUNDARY for the Android purchase: the client sends a `purchaseToken`, which we
 * NEVER trust — we verify it against the Google Play Developer API and only then grant the
 * `profiles.ads_removed` entitlement. Ships dark until the service-account env is set.
 *
 * See docs/2026-06-08-play-billing-remove-ads-spec.md. The native purchase flow (Capacitor
 * billing plugin) is a device-gated follow-up; only this server verify is tested here.
 */
import { createSign } from 'crypto';

const ANDROIDPUBLISHER_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

/** True only when all service-account env vars are present (else the route stays dark/503). */
export function isPlayBillingConfigured(): boolean {
  return !!(
    process.env.GOOGLE_PLAY_SA_CLIENT_EMAIL?.trim() &&
    process.env.GOOGLE_PLAY_SA_PRIVATE_KEY?.trim() &&
    process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim()
  );
}

export interface PlayPurchase {
  valid: boolean;
  /** purchaseState: 0 Purchased, 1 Canceled, 2 Pending. */
  purchaseState: number;
  orderId: string;
}

/**
 * Validate the Google `purchases.products.get` response. `valid` iff purchaseState===0
 * (Purchased). Errors on a malformed response (missing state / missing orderId).
 */
export function parsePlayPurchase(api: Record<string, unknown>): PlayPurchase | { error: string } {
  const purchaseState = api.purchaseState;
  if (typeof purchaseState !== 'number') return { error: 'missing purchaseState' };
  const orderId = typeof api.orderId === 'string' ? api.orderId : '';
  // A purchased product MUST carry an orderId (our idempotency key); pending/canceled may not.
  if (purchaseState === 0 && !orderId) return { error: 'missing orderId' };
  return { valid: purchaseState === 0, purchaseState, orderId };
}

const b64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Mint a short-lived Google OAuth access token from the service account (JWT-bearer grant).
 * Returns '' when unconfigured. Uses RS256 over the SA private key.
 */
export async function getPlayAccessToken(nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const email = process.env.GOOGLE_PLAY_SA_CLIENT_EMAIL?.trim();
  const key = process.env.GOOGLE_PLAY_SA_PRIVATE_KEY?.trim().replace(/\\n/g, '\n');
  if (!email || !key) return '';

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: email,
    scope: PLAY_SCOPE,
    aud: OAUTH_TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  }));
  const signingInput = `${header}.${claims}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(key);
  const jwt = `${signingInput}.${b64url(signature)}`;

  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  if (!resp.ok) return '';
  const json = (await resp.json()) as { access_token?: string };
  return json.access_token ?? '';
}

/**
 * Verify a purchase token against the Google Play Developer API. Returns the parsed purchase
 * or `{ error }` on a non-2xx (bad/expired/refunded token) or malformed response.
 */
export async function verifyPlayPurchase(input: {
  packageName: string;
  productId: string;
  token: string;
  accessToken: string;
}): Promise<PlayPurchase | { error: string }> {
  const url = `${ANDROIDPUBLISHER_BASE}/applications/${encodeURIComponent(input.packageName)}/purchases/products/${encodeURIComponent(input.productId)}/tokens/${encodeURIComponent(input.token)}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${input.accessToken}` } });
  if (!resp.ok) return { error: `play_api_${resp.status}` };
  const json = (await resp.json()) as Record<string, unknown>;
  return parsePlayPurchase(json);
}
