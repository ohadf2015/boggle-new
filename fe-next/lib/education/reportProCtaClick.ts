/**
 * Fire-and-forget server twins for the Teacher Pro trial card (see
 * app/api/education/pro-cta-click and app/api/education/pro-offer-impression).
 * Browser PostHog is consent-gated; these record for every signed-in teacher.
 * `keepalive` lets a tap finish while the link navigates away. Never throws.
 */
function post(path: string, body: Record<string, unknown>): void {
  try {
    if (typeof fetch !== 'function') return;
    void fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch {
    /* analytics must never block */
  }
}

export function reportProCtaClick(args: { placement: string; locale: string; cta: string }): void {
  post('/api/education/pro-cta-click', args);
}

export type ProOfferStage = 'rendered' | 'viewed';
export type ProOfferKind = 'trial' | 'keep_after_trial' | 'paid';

export function reportProOfferImpression(args: {
  placement: string;
  locale: string;
  cta: string;
  offer: ProOfferKind;
  stage: ProOfferStage;
}): void {
  post('/api/education/pro-offer-impression', args);
}

/**
 * Tap on a Teacher Pro offer -> `edu_pro_offer_clicked` (server, cookie-free).
 * sendBeacon first: it survives the navigation to /teacher/upgrade or Polar checkout
 * and carries the same-origin session cookie. Falls back to keepalive fetch.
 */
export function reportProOfferClick(args: { placement: string; locale: string; cta: string; offer: ProOfferKind }): void {
  const path = '/api/education/pro-offer-click';
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(args)], { type: 'application/json' });
      if (navigator.sendBeacon(path, blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }
  post(path, args);
}
