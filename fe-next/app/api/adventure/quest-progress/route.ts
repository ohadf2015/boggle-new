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

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    // Validate all values are non-negative numbers with bounded keys and values
    const progress = chapterQuestProgress as Record<string, number>;
    const MAX_QUEST_KEYS = 30; // 10 worlds × 3 chapters max
    const MAX_QUEST_VALUE = 10000;
    const entries = Object.entries(progress);
    if (entries.length > MAX_QUEST_KEYS) {
      return NextResponse.json({ error: 'Too many quest keys' }, { status: 400 });
    }
    for (const [key, value] of entries) {
      if (typeof key !== 'string' || key.length > 50 || typeof value !== 'number' || value < 0 || value > MAX_QUEST_VALUE) {
        return NextResponse.json({ error: 'Invalid quest progress values' }, { status: 400 });
      }
    }

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
      // Cap words per request to prevent inflation
      const MAX_WORDS_PER_REQUEST = 50;
      const MAX_ALBUM_SIZE = 5000;
      const existingAlbum = new Set((existing?.word_album as string[]) ?? []);
      let added = 0;
      for (const word of wordAlbum) {
        if (added >= MAX_WORDS_PER_REQUEST) break;
        if (existingAlbum.size >= MAX_ALBUM_SIZE) break;
        if (typeof word === 'string' && word.length >= 3 && word.length <= 15) {
          existingAlbum.add(word.toUpperCase());
          added++;
        }
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
