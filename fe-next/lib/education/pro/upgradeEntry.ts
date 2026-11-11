import { PRO_OFFER_PLACEMENTS } from './proOfferPlacements';

const TAG = /^[a-z0-9_]{1,40}$/;

/** The `?source=` an upsell link or email put on the upgrade URL, or null when it is not a plain tag. */
export function entrySourceTag(raw: unknown): string | null {
  return typeof raw === 'string' && TAG.test(raw) ? raw : null;
}

/** True when the teacher got here by tapping an in-product Pro offer, so the plan choice is already made. */
export function isProOfferEntry(source: string | null): boolean {
  return source !== null && PRO_OFFER_PLACEMENTS.has(source);
}
