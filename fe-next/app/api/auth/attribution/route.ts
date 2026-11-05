import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sanitizeReferrerDomain, sanitizeLandingPath } from '@/lib/auth/attributionSanitize';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import {
  SIGNUP_EVENT_FLAG,
  countryFromRequestHeaders,
  decideAttributionWrite,
  metaString,
  type SignupUser,
} from '@/lib/auth/signupAttributionApply';
import { normalizeCountry, normalizeLanguage } from '@/lib/auth/emailSignupMeta';

/**
 * POST /api/auth/attribution (t_a80f937b, email parity t_9eb9ad5f)
 *
 * Persists first-touch attribution onto the caller's own profile at account
 * creation. Server-side and never-overwrites: a column is only written when
 * the profile's current value is NULL, so the OAuth callback, email-confirm
 * return and the handle_new_user trigger can all race without clobbering
 * each other. Attribution columns are intentionally NOT in the privileged
 * guard list, but the write still goes through the service role so client
 * roles never touch them directly. user_role is privileged — only a
 * teacher intent stashed in user_metadata at signUp (not the POST body)
 * may promote student → teacher here.
 *
 * Privacy: referrer is stored as DOMAIN only and landing_path keeps utm_*
 * params but no other query string — the client sanitizes before sending and
 * this route re-sanitizes defensively.
 *
 * t_b6131f7d — this route is also the SINGLE source of Growth Radar's
 * growth:signup_completed. The client emitters deliberately feed neither GR
 * pipe. The event fires when this request is the first writer of
 * signup_surface, and on the email catch-up (trigger already wrote the
 * surface from options.data, so the column is non-null but no event exists
 * yet). Deduped by user_metadata.signup_completed_emitted. method is
 * email|google so funnels can split by provider.
 */

const bodySchema = z.object({
  utm_source: z.string().max(200).nullish(),
  utm_medium: z.string().max(200).nullish(),
  utm_campaign: z.string().max(200).nullish(),
  referrer_domain: z.string().max(200).nullish(),
  landing_path: z.string().max(500).nullish(),
  signup_surface: z.string().max(100).nullish(),
  language: z.string().max(16).nullish(),
  country_code: z.string().max(8).nullish(),
});

type AdminWithAuth = {
  from: (table: string) => {
    select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> } };
    update: (values: Record<string, string>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
  };
  auth?: { admin?: { updateUserById?: (id: string, attrs: { data: Record<string, unknown> }) => Promise<unknown> } };
};

async function markSignupEventEmitted(admin: AdminWithAuth, userId: string): Promise<void> {
  const updateUser = admin.auth?.admin?.updateUserById;
  if (!updateUser) return;
  try {
    await updateUser(userId, { data: { [SIGNUP_EVENT_FLAG]: true } });
  } catch {
    // A missed flag can double-emit the same distinctId. Persons stay unique.
  }
}

export async function POST(request: Request) {
  const { supabase, token } = await createRequestClient(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? undefined);
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  // Anonymous classroom-guest sessions are not signups (t_b6131f7d).
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

  const admin = createAdminClient() as AdminWithAuth | null;
  if (!admin) {
    console.error('[attribution] service role client unavailable');
    return NextResponse.json({ ok: false, error: 'server misconfigured' }, { status: 500 });
  }

  const { data: profile, error: readError } = await admin
    .from('profiles')
    .select('utm_source, utm_medium, utm_campaign, referrer, landing_path, signup_surface, language, country_code, user_role, is_test_account')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) {
    console.error('[attribution] profile read failed:', readError.message);
    return NextResponse.json({ ok: false, error: 'read failed' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'profile not found' }, { status: 404 });
  }

  const signupUser = user as SignupUser;
  const meta = signupUser.user_metadata ?? null;
  const body = parsed.data;
  // Body wins; user_metadata (stashed at signUp, survives a different browser)
  // fills gaps; CDN country fills country when neither knew it.
  const referrerRaw = body.referrer_domain ?? metaString(meta, 'referrer_domain');
  const landingRaw = body.landing_path ?? metaString(meta, 'landing_path');
  const incoming: Record<string, string | null | undefined> = {
    utm_source: body.utm_source ?? metaString(meta, 'utm_source'),
    utm_medium: body.utm_medium ?? metaString(meta, 'utm_medium'),
    utm_campaign: body.utm_campaign ?? metaString(meta, 'utm_campaign'),
    referrer: referrerRaw ? sanitizeReferrerDomain(referrerRaw) : null,
    landing_path: landingRaw ? sanitizeLandingPath(landingRaw) : null,
    signup_surface: body.signup_surface ?? metaString(meta, 'signup_surface'),
    language: normalizeLanguage(body.language ?? metaString(meta, 'language')),
    country_code: normalizeCountry(body.country_code ?? metaString(meta, 'country_code') ?? countryFromRequestHeaders(request)),
  };

  const decision = decideAttributionWrite({ profile, incoming, user: signupUser });

  if (Object.keys(decision.update).length > 0) {
    const { error: updateError } = await admin.from('profiles').update(decision.update).eq('id', user.id);
    if (updateError) {
      console.error('[attribution] profile update failed:', updateError.message);
      return NextResponse.json({ ok: false, error: 'update failed' }, { status: 500 });
    }
  }

  if (decision.emit && decision.source) {
    captureEduServerEvents([
      {
        distinctId: user.id,
        event: 'growth:signup_completed',
        properties: {
          source: decision.source,
          method: decision.method,
          utm_source: decision.update.utm_source ?? (profile.utm_source as string | null) ?? null,
          utm_medium: decision.update.utm_medium ?? (profile.utm_medium as string | null) ?? null,
          utm_campaign: decision.update.utm_campaign ?? (profile.utm_campaign as string | null) ?? null,
          referrer_domain: decision.update.referrer ?? (profile.referrer as string | null) ?? null,
          is_test_account: profile.is_test_account === true,
        },
      },
    ]);
    await markSignupEventEmitted(admin, user.id);
  }

  return NextResponse.json({ ok: true, applied: Object.keys(decision.update) });
}
