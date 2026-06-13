import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { NextRequest, NextResponse } from 'next/server';

const VALID_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export type BlastProgressPayload = {
  currentLevel: number;
  maxLevelCleared: number;
  coins: number;
  chestNumber: number;
  chestProgress: number;
  unlocksSeen: Record<string, unknown>;
  locale: string;
};

// Largest level a guest claim may bump the resume position to. Guards against a
// tampered localStorage value parking the player on an absurd generated level.
const MAX_CLAIM_LEVEL = 1000;

// Minimal shape we need from the Supabase client — keeps the handler testable
// without dragging in the full generated DB types.
type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>;
    };
  };
};

/**
 * Read the player's saved Blast v2 progress so the client can resume at
 * current_level with real coins/chest state (Plan 3b).
 *
 * Read-only: when no row exists yet (brand-new player) we return defaults and
 * deliberately do NOT create the row — that's clear-level's job on first clear.
 * Auth is enforced by the GET wrapper; this handler takes a validated userId.
 */
export async function handleGetBlastProgress(
  userId: string,
  supabase: SupabaseLike,
  defaultLocale = 'en',
): Promise<{ data: BlastProgressPayload; status: number }> {
  try {
    const { data } = await supabase
      .from('blast_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return {
        status: 200,
        data: {
          currentLevel: 1,
          maxLevelCleared: 0,
          coins: 0,
          chestNumber: 1,
          chestProgress: 0,
          unlocksSeen: {},
          locale: defaultLocale,
        },
      };
    }

    return {
      status: 200,
      data: {
        currentLevel: (data.current_level as number) ?? 1,
        maxLevelCleared: (data.max_level_cleared as number) ?? 0,
        coins: (data.total_coins_earned_blast as number) ?? 0,
        chestNumber: (data.current_chest_number as number) ?? 1,
        chestProgress: Number(data.current_chest_progress ?? 0),
        unlocksSeen: (data.unlocks_seen as Record<string, unknown>) ?? {},
        locale: (data.locale as string) ?? defaultLocale,
      },
    };
  } catch {
    return {
      status: 500,
      data: {
        currentLevel: 1,
        maxLevelCleared: 0,
        coins: 0,
        chestNumber: 1,
        chestProgress: 0,
        unlocksSeen: {},
        locale: defaultLocale,
      },
    };
  }
}

/**
 * Claim a logged-out player's resume position when they sign in: bump
 * current_level up to the level they reached as a guest.
 *
 * SECURITY: this only moves the *resume position* (current_level). It never
 * touches max_level_cleared, which gates the veteran path and any future
 * ranking. Skipping ahead therefore grants nothing — you forfeit the coins of
 * the skipped levels — so trusting the client's claimed level is safe. The
 * claim is still clamped to [1, MAX_CLAIM_LEVEL] to reject tampered values.
 */
export async function handleClaimBlastProgress(
  userId: string,
  supabase: SupabaseLike,
  claimLevel: number,
  defaultLocale = 'en',
): Promise<{ data: { currentLevel: number }; status: number }> {
  try {
    const { data } = await supabase
      .from('blast_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    const serverLevel = (data?.current_level as number) ?? (data ? 1 : 0);

    // Reject non-positive / non-integer / absurd claims — no-op back to server.
    if (!Number.isInteger(claimLevel) || claimLevel < 1 || claimLevel > MAX_CLAIM_LEVEL) {
      return { status: 200, data: { currentLevel: data ? serverLevel : 1 } };
    }

    if (!data) {
      // No row yet — create one at the claimed resume position. max_level_cleared
      // stays at its default 0 (no levels were actually cleared on the server).
      await supabase.from('blast_progress').insert({
        user_id: userId,
        current_level: claimLevel,
        locale: defaultLocale,
      });
      return { status: 200, data: { currentLevel: claimLevel } };
    }

    if (claimLevel <= serverLevel) {
      return { status: 200, data: { currentLevel: serverLevel } };
    }

    await supabase.from('blast_progress').update({ current_level: claimLevel }).eq('user_id', userId);
    return { status: 200, data: { currentLevel: claimLevel } };
  } catch {
    return { status: 500, data: { currentLevel: 1 } };
  }
}

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
