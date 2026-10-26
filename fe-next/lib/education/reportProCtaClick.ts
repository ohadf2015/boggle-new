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
