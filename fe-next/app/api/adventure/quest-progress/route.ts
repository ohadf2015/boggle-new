/**
 * Adventure Quest Progress API
 *
 * POST - Persist chapter quest progress (map of questId → current count).
 * Lightweight fire-and-forget endpoint — client sends full progress map,
 * server merges with existing data (keeping highest values).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-quest-progress', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { chapterQuestProgress } = body;

    if (!chapterQuestProgress || typeof chapterQuestProgress !== 'object') {
      return NextResponse.json({ error: 'Invalid quest progress data' }, { status: 400 });
    }

    // Validate all values are non-negative numbers and keys are strings
    const progress = chapterQuestProgress as Record<string, number>;
    for (const [key, value] of Object.entries(progress)) {
      if (typeof key !== 'string' || typeof value !== 'number' || value < 0) {
        return NextResponse.json({ error: 'Invalid quest progress values' }, { status: 400 });
      }
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing data for merge
    const { data: existing } = await supabase
      .from('player_progression')
      .select('chapter_quest_progress, word_album')
      .eq('user_id', userId)
      .single();

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Merge quest progress (keep highest values to prevent regression)
    const existingProgress = (existing?.chapter_quest_progress as Record<string, number>) ?? {};
    const merged: Record<string, number> = { ...existingProgress };
    for (const [key, value] of Object.entries(progress)) {
      merged[key] = Math.max(merged[key] ?? 0, value);
    }
    updatePayload.chapter_quest_progress = merged;

    // Merge word album if provided (union of existing + new words)
    const wordAlbum = body.wordAlbum;
    if (Array.isArray(wordAlbum)) {
      const existingAlbum = new Set((existing?.word_album as string[]) ?? []);
      for (const word of wordAlbum) {
        if (typeof word === 'string') existingAlbum.add(word.toUpperCase());
      }
      updatePayload.word_album = Array.from(existingAlbum);
    }

    const { error: updateError } = await supabase
      .from('player_progression')
      .update(updatePayload)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[ADVENTURE QUEST API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save quest progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/quest-progress', { method: 'POST' });
    console.error('[ADVENTURE QUEST API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
