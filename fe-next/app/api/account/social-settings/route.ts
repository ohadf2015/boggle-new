import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
  computeSocialTier,
  resolveSocialCapabilities,
  ADULT_CAPABILITIES,
  type SocialCapabilities,
} from '@/lib/families/socialPolicy';

/**
 * Families Policy — adult management of social features (self-service).
 *
 * Lets an adult enable/disable specific social capabilities for THEIR OWN
 * account. Authorization is derived from the caller's server-stored
 * `profiles.birth_year` — never from the request body — so a child account
 * cannot self-elevate by declaring an adult birth year. A child's social
 * features must instead be managed through the verified guardian flow
 * (parental controls), not this self-service endpoint.
 */
const CAP_KEYS = Object.keys(ADULT_CAPABILITIES) as (keyof SocialCapabilities)[];

const bodySchema = z.object({
  override: z
    .record(z.string(), z.boolean())
    .refine((o) => Object.keys(o).length > 0 && Object.keys(o).every((k) => CAP_KEYS.includes(k as keyof SocialCapabilities)), {
      message: 'override must contain only known capability keys',
    }),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
    }

    const currentYear = new Date().getUTCFullYear();

    // Authorize from the caller's SERVER-STORED identity, never the request body.
    // (Trusting a body-supplied birth year let a child self-elevate to adult.)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('birth_year')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to read profiles.birth_year:', profileError);
      return NextResponse.json({ error: 'Failed to load account' }, { status: 500 });
    }

    const tier = computeSocialTier(profile?.birth_year ?? null, currentYear);
    if (tier !== 'adult') {
      return NextResponse.json({ error: 'Adult verification required' }, { status: 403 });
    }

    const override = parsed.data.override as Partial<SocialCapabilities>;
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({ social_features_override: override, updated_at: nowIso })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update profiles.social_features_override:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    const capabilities = resolveSocialCapabilities(tier, override);

    return NextResponse.json({ success: true, tier, capabilities });
  } catch (err) {
    console.error('POST /api/account/social-settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
