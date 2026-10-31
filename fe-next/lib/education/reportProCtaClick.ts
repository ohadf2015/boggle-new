/**
 * Fire-and-forget server twins for the Teacher Pro trial card (see
 * app/api/education/pro-cta-click and app/api/education/pro-offer-impression).
 * Browser PostHog is consent-gated; these record for every signed-in teacher.
 * `keepalive` lets a tap finish while the link navigates away. Never throws.
 */
import { firstProOfferReport, type ProOfferFormat } from '@/lib/education/pro/proOfferSession';

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

type OfferArgs = { placement: string; locale: string; cta: string; offer: ProOfferKind; format?: ProOfferFormat };

/** `format` rides on the body only when it is not the default full card (older payloads stay byte-identical). */
function body<T extends OfferArgs>(args: T): Omit<T, 'format'> & { format?: ProOfferFormat } {
  const { format, ...rest } = args;
  return format && format !== 'card' ? { ...rest, format } : rest;
}

/**
 * `rendered` / `viewed` server twin. Sent at most once per placement, format and
 * stage per browser session per teacher (`userId`), so a re-render or remount
 * never inflates impressions (proOfferSession.ts).
 */
export function reportProOfferImpression(
  args: OfferArgs & { stage: ProOfferStage },
  opts: { userId?: string | null } = {},
): void {
  if (!firstProOfferReport(opts.userId, args.placement, args.format ?? 'card', args.stage)) return;
  post('/api/education/pro-offer-impression', body(args));
}

/**
 * Tap on a Teacher Pro offer -> `edu_pro_offer_clicked` (server, cookie-free).
 * sendBeacon first: it survives the navigation to /teacher/upgrade or Polar checkout
 * and carries the same-origin session cookie. Falls back to keepalive fetch.
 */
export function reportProOfferClick(args: OfferArgs): void {
  const path = '/api/education/pro-offer-click';
  const payload = body(args);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (navigator.sendBeacon(path, blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }
  post(path, payload);
}
