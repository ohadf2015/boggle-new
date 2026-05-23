import { createClient } from '@/utils/supabase/server';
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

// Minimal shape we need from the Supabase client — keeps the handler testable
// without dragging in the full generated DB types.
type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
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

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
