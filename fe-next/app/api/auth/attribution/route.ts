import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sanitizeReferrerDomain, sanitizeLandingPath } from '@/lib/auth/attributionSanitize';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';

/**
 * POST /api/auth/attribution (t_a80f937b)
 *
 * Persists first-touch attribution onto the caller's own profile at account
 * creation. Server-side and never-overwrites: a column is only written when
 * the profile's current value is NULL, so the OAuth callback, email-confirm
 * return and the handle_new_user trigger can all race without clobbering
 * each other. Attribution columns are intentionally NOT in the privileged
 * guard list, but the write still goes through the service role so client
 * roles never touch them directly.
 *
 * Privacy: referrer is stored as DOMAIN only and landing_path keeps utm_*
 * params but no other query string — the client sanitizes before sending and
 * this route re-sanitizes defensively.
 *
 * t_b6131f7d — this route is also the SINGLE source of Growth Radar's
 * growth:signup_completed. The client emitters (maybeTrackSignupCompleted /
 * trackSignupFunnel) deliberately feed neither GR pipe (no window.gr mirror,
 * no growth: copy in PostHog — GR's PostHog ingest imports every growth:*
 * event), because per-device localStorage dedupe counted one account once per
 * browser. The first-writer-wins signup_surface write below happens exactly
 * once per account, so the event is emitted only from the request that
 * applies signup_surface. Anonymous sessions (classroom guest students) are
 * not signups: they get no write and no event.
 */

const bodySchema = z.object({
  utm_source: z.string().max(200).nullish(),
  utm_medium: z.string().max(200).nullish(),
  utm_campaign: z.string().max(200).nullish(),
  referrer_domain: z.string().max(200).nullish(),
  landing_path: z.string().max(500).nullish(),
  signup_surface: z.string().max(100).nullish(),
});

export async function POST(request: Request) {
  const { supabase, token } = await createRequestClient(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? undefined);
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  // Anonymous classroom-guest sessions are not signups (t_b6131f7d): no
  // attribution write (the columns must stay NULL so a future anonymous →
  // permanent upgrade can win the first-writer slot) and no GR signup event.
  if (user.is_anonymous === true) {
    return NextResponse.json({ ok: true, applied: [] });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error('[attribution] service role client unavailable');
    return NextResponse.json({ ok: false, error: 'server misconfigured' }, { status: 500 });
  }

  const { data: profile, error: readError } = await admin
    .from('profiles')
    .select('utm_source, utm_medium, utm_campaign, referrer, landing_path, signup_surface, is_test_account')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) {
    console.error('[attribution] profile read failed:', readError.message);
    return NextResponse.json({ ok: false, error: 'read failed' }, { status: 500 });
  }
  if (!profile) {
    // Trigger hasn't created the row yet — client may retry; nothing to write.
    return NextResponse.json({ ok: false, error: 'profile not found' }, { status: 404 });
  }

  const body = parsed.data;
  const incoming: Record<string, string | null | undefined> = {
    utm_source: body.utm_source,
    utm_medium: body.utm_medium,
    utm_campaign: body.utm_campaign,
    referrer: body.referrer_domain ? sanitizeReferrerDomain(body.referrer_domain) : null,
    landing_path: body.landing_path ? sanitizeLandingPath(body.landing_path) : null,
    signup_surface: body.signup_surface,
  };

  // Never overwrite non-null values — first writer wins per column.
  const update: Record<string, string> = {};
  for (const [column, value] of Object.entries(incoming)) {
    const current = (profile as Record<string, unknown>)[column];
    if ((current === null || current === undefined) && value) {
      update[column] = value;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, applied: [] });
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update(update)
    .eq('id', user.id);

  if (updateError) {
    console.error('[attribution] profile update failed:', updateError.message);
    return NextResponse.json({ ok: false, error: 'update failed' }, { status: 500 });
  }

  // t_b6131f7d: the request that wins the signup_surface first-write is the
  // account's ONE Growth Radar signup. Emitting here — server-side, once per
  // account id — replaces the client mirror whose per-device dedupe counted
  // the same account again on every new browser. Goes through
  // captureEduServerEvents so $host is stamped (Growth Radar's PostHog ingest
  // attributes by host) and transport failures are swallowed — analytics must
  // never break the auth flow. A second device / a reload reads signup_surface
  // as non-null above and never reaches this line.
  if (update.signup_surface) {
    captureEduServerEvents([
      {
        distinctId: user.id,
        event: 'growth:signup_completed',
        properties: {
          source: update.signup_surface,
          utm_source: update.utm_source,
          utm_medium: update.utm_medium,
          utm_campaign: update.utm_campaign,
          referrer_domain: update.referrer,
          is_test_account:
            (profile as Record<string, unknown>).is_test_account === true,
        },
      },
    ]);
  }

  return NextResponse.json({ ok: true, applied: Object.keys(update) });
}
