/**
 * ayeT-Studios web OFFERWALL — client config + gating.
 *
 * The offerwall is the pay-per-action complement to the rewarded-video adapter
 * (lib/ads/ayetVideoAds.ts): the user completes an offer (install / signup / survey)
 * and ayeT posts a verified S2S conversion to /api/offerwall/ayet, which credits coins.
 * Coins are NEVER granted client-side here — this module only builds the offerwall URL
 * and decides whether to surface the CTA. See docs/2026-06-05-web-offerwall-ayet-spec.md.
 *
 * Ships dark: gated on `NEXT_PUBLIC_AYET_OFFERWALL_ENABLED=true` + a configured adslot.
 * Web only (the caller adds the !native / !crazygames gate). Auth-only at OPEN time —
 * `external_identifier` must be the Supabase user id so the webhook knows whom to credit;
 * guests instead get routed to signup by the CTA.
 */
const OFFERWALL_BASE = 'https://www.ayetstudios.com/offers/web_offerwall';

/** Configured web offerwall adslot id. Empty = stay dark. */
export function getAyetOfferwallAdslot(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT) {
    return process.env.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT;
  }
  return '';
}

/** True only when explicitly enabled AND an adslot is configured. */
export function isAyetOfferwallConfigured(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED === 'true' &&
    getAyetOfferwallAdslot() !== ''
  );
}

/** Dev/staging override — `?ayet_ow_test=1` or `window.__ayetOfferwallTest`. */
export function hasOfferwallTestFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { __ayetOfferwallTest?: boolean };
  if (w.__ayetOfferwallTest === true) return true;
  return typeof location !== 'undefined' && /[?&]ayet_ow_test=1/.test(location.search);
}

/**
 * Offerwall URL keyed to the authed user. Returns '' when unconfigured or no user id
 * (so the modal never loads a bare, un-attributable offerwall whose conversions can't
 * be credited).
 */
export function getAyetOfferwallUrl(userId: string): string {
  if (!isAyetOfferwallConfigured() || !userId) return '';
  const adslot = encodeURIComponent(getAyetOfferwallAdslot());
  return `${OFFERWALL_BASE}/${adslot}?external_identifier=${encodeURIComponent(userId)}`;
}

/**
 * Whether to surface the offerwall CTA. Auth is intentionally NOT required here —
 * guests still see it and get routed to signup (an acquisition lever); auth is only
 * enforced when the modal actually opens.
 */
export function isOfferwallAvailable(ctx: {
  configured: boolean;
  isProd: boolean;
  hasTestFlag: boolean;
  isNative: boolean;
  isCrazyGames: boolean;
}): boolean {
  return (
    ctx.configured &&
    (ctx.isProd || ctx.hasTestFlag) &&
    !ctx.isNative &&
    !ctx.isCrazyGames
  );
}
