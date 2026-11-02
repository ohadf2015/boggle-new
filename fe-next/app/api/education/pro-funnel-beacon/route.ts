import { NextRequest, NextResponse } from 'next/server';
import { captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import logger from '@/utils/logger';

/**
 * POST /api/education/pro-funnel-beacon
 *
 * Server fallback for Teacher Pro CLIENT funnel steps when the browser bundle
 * was built without NEXT_PUBLIC_POSTHOG_KEY (lib/education/proFunnelBeacon.ts).
 * The client-side capture would sit in lazyPosthog's queue until dropped; this
 * endpoint re-emits the same event name server-side through
 * captureProFunnelServerEvent, which stamps `$host` — so the step lands in the
 * same dashboards the client copy would have.
 *
 * Abuse posture: this is an unauthenticated analytics sink, so it is strict
 * about shape — an event-name allowlist (only names proFunnelTelemetry can
 * emit), primitive-only props, bounded keys and string length. Anything else
 * is dropped with a 204: a beacon never argues with its caller.
 */

/**
 * Every client-side name proFunnelTelemetry.ts can emit, plus the
 * key-missing sentinel. A name not on this list is not a funnel step.
 */
const ALLOWED_EVENTS: ReadonlySet<string> = new Set([
  'trial_cta_view',
  'trial_cta_tap',
  'edu_pro_upgrade_clicked',
  'checkout_open',
  'pro_gate_viewed',
  'pro_upgrade_clicked',
  'pro_trial_preview_viewed',
  'pro_trial_preview_upgrade_clicked',
  'teacher_trial_upgrade_cta_viewed',
  'teacher_trial_upgrade_cta_clicked',
  'edu_pro_checkout_success_seen',
  'edu_pro_checkout_return_landed',
  'checkout_return_landed',
  'edu_pro_missed_homework_assigned',
  'teacher_pro_upgrade_click',
  'teacher_pro_checkout_started',
  'edu_pro_checkout_failed',
  'teacher_pro_checkout_redirect',
  'school_quote_requested',
  'trial_expired',
  'teacher_plan_gate_shown',
  'teacher_plan_gate_upgrade_click',
  'edu_pro_telemetry_client_key_missing',
]);

const MAX_PROPS = 20;
const MAX_STRING = 300;

/** Primitive-only, bounded — an analytics sink is not a document store. */
function sanitizeProps(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_PROPS) break;
    if (typeof k !== 'string' || k.length === 0 || k.length > 60) continue;
    if (typeof v === 'string') out[k] = v.slice(0, MAX_STRING);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean' || v === null) out[k] = v;
    // objects/arrays/functions dropped on purpose
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    let body: { event?: unknown; props?: unknown } = {};
    try {
      const raw = await request.text();
      if (raw.trim() && raw.length <= 4_000) body = JSON.parse(raw);
    } catch {
      body = {};
    }

    const event = typeof body.event === 'string' ? body.event : '';
    if (!ALLOWED_EVENTS.has(event)) {
      return new NextResponse(null, { status: 204 });
    }

    captureProFunnelServerEvent({
      distinctId: 'anonymous-beacon',
      event,
      properties: {
        ...sanitizeProps(body.props),
        product: 'teacher_pro',
        origin: 'client_beacon',
      },
    });
  } catch (err) {
    logger.warn('Exception in POST /api/education/pro-funnel-beacon:', err);
  }
  return new NextResponse(null, { status: 204 });
}
