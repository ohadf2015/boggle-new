import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
  computeSocialTier,
  resolveSocialCapabilities,
  type SocialCapabilities,
} from '@/lib/families/socialPolicy';

/**
 * Families Policy neutral age screen — persists a self-declared birth YEAR and
 * returns the resolved social tier + capabilities so the client can update UI.
 * Birth year (not full DOB) minimises child PII. Server is authoritative.
 */
const bodySchema = z.object({
  birthYear: z.number().int(),
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
    const currentYear = new Date().getUTCFullYear();
    if (
      !parsed.success ||
      parsed.data.birthYear < 1900 ||
      parsed.data.birthYear > currentYear
    ) {
      return NextResponse.json({ error: 'Invalid birth year' }, { status: 400 });
    }

    const { birthYear } = parsed.data;
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({ birth_year: birthYear, age_verified_at: nowIso, updated_at: nowIso })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update profiles.birth_year:', error);
      return NextResponse.json({ error: 'Failed to save age' }, { status: 500 });
    }

    const tier = computeSocialTier(birthYear, currentYear);
    const capabilities: SocialCapabilities = resolveSocialCapabilities(tier);

    return NextResponse.json({ success: true, tier, capabilities });
  } catch (err) {
    console.error('POST /api/account/age error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
