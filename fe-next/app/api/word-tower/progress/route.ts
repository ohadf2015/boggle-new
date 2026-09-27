import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

export const runtime = 'nodejs';

// Resume blob — versioned so later phases (bombs, versus) can extend it safely.
const StateSchema = z
  .object({
    version: z.number(),
    anchorLetter: z.string().max(4),
    combo: z.number().int().min(0).max(1_000_000),
    scramblesLeft: z.number().int().min(0).max(50),
    bombCharge: z.number().min(0).max(100_000),
    heightM: z.number().min(0).max(1e9),
    floorsCount: z.number().int().min(0).max(1e8),
    longestWord: z.string().max(64),
    floors: z
      .array(z.object({ word: z.string().max(64), len: z.number().int(), meters: z.number() }))
      .max(60),
    usedWords: z.array(z.string().max(64)).max(220),
  })
  .passthrough();

const BodySchema = z.object({
  heightM: z.number().min(0).max(1e9),
  floors: z.number().int().min(0).max(1e8),
  longestCombo: z.number().int().min(0).max(1_000_000),
  longestWord: z.string().max(64).optional(),
  highestBiome: z.string().max(32).optional(),
  state: StateSchema,
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const { data, error } = await supabase
      .from('word_tower_progress')
      .select('best_height_m, best_floors, current_height_m, current_floors, current_state, longest_combo, longest_word, highest_biome')
      .eq('player_id', user.id)
      .maybeSingle();

    if (error) {
      captureApiError(error as unknown as Error, 'word-tower-progress-get');
      return NextResponse.json({ error: 'failed to load' }, { status: 500 });
    }

    return NextResponse.json({ progress: data ?? null });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-progress-get');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkApiRateLimit(request, 'word-tower-progress-post', { maxRequests: 60, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const b = parsed.data;

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    // Upsert: monotonic best_* / totals are clamped by the BEFORE UPDATE trigger.
    const { error } = await supabase
      .from('word_tower_progress')
      .upsert(
        {
          player_id: user.id,
          best_height_m: b.heightM,
          best_floors: b.floors,
          current_height_m: b.heightM,
          current_floors: b.floors,
          current_state: b.state,
          longest_combo: b.longestCombo,
          longest_word: b.longestWord ?? null,
          highest_biome: b.highestBiome ?? null,
        },
        { onConflict: 'player_id' },
      );

    if (error) {
      captureApiError(error as unknown as Error, 'word-tower-progress-post');
      return NextResponse.json({ error: 'failed to save' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-progress-post');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
