import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { NextRequest, NextResponse } from 'next/server';
import { handleGetBlastProgress, handleClaimBlastProgress, type BlastProgressPayload, type SupabaseLike } from './_handlers';

const VALID_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { currentLevel?: number; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const defaultLocale = VALID_LOCALES.includes(body.locale as (typeof VALID_LOCALES)[number])
    ? (body.locale as string)
    : 'en';

  const { data, status } = await handleClaimBlastProgress(
    user.id,
    supabase as unknown as SupabaseLike,
    Number(body.currentLevel),
    defaultLocale,
  );
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest) {
  // Local JWT verify (sub-ms) when fetchWithAuth sends a Bearer; cookie fallback
  // otherwise. Read-only. The cookie client is still used for the data read.
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createClient();

  const localeParam = new URL(req.url).searchParams.get('locale');
  const defaultLocale = VALID_LOCALES.includes(localeParam as (typeof VALID_LOCALES)[number])
    ? (localeParam as string)
    : 'en';

  const { data, status } = await handleGetBlastProgress(
    user.id,
    supabase as unknown as SupabaseLike,
    defaultLocale,
  );
  return NextResponse.json(data, { status });
}
