import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createClient } from '@/utils/supabase/server';
import { isWordMasteryEnabledFor } from '@/lib/wordMastery/access';
import {
  buildMasteryLists,
  deriveAttemptsFromSessions,
  toMasteryUpsertRows,
  type GameSessionWordRow,
  type MasteryListRow,
} from '@/lib/wordMastery';

const CACHE_LIMIT = 200;
const SESSION_BACKFILL_LIMIT = 50;

export async function GET(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = await isWordMasteryEnabledFor(user.id);
  if (!enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const language = new URL(request.url).searchParams.get('language');

  let query = supabase
    .from('player_word_mastery')
    .select('word, status, score, language')
    .eq('player_id', user.id);

  if (language) {
    query = query.eq('language', language);
  }

  const { data: cacheRows, error: cacheError } = await query
    .order('score', { ascending: true })
    .limit(CACHE_LIMIT);

  if (cacheError) {
    return NextResponse.json({ error: 'Failed to load word mastery' }, { status: 500 });
  }

  let rows = (cacheRows ?? []) as MasteryListRow[];

  if (rows.length === 0) {
    let sessionQuery = supabase
      .from('game_sessions')
      .select('words_found, clues_used, duration_seconds, language, completed')
      .eq('user_id', user.id)
      .eq('completed', true);

    if (language) {
      sessionQuery = sessionQuery.eq('language', language);
    }

    const { data: sessions } = await sessionQuery
      .order('started_at', { ascending: false })
      .limit(SESSION_BACKFILL_LIMIT);

    const derived = deriveAttemptsFromSessions((sessions ?? []) as GameSessionWordRow[]);
    const upserts = toMasteryUpsertRows(user.id, derived);
    if (upserts.length > 0) {
      await supabase.from('player_word_mastery').upsert(upserts, {
        onConflict: 'player_id,word,language',
      });
      rows = upserts.map(({ word, status, score, language: lang }) => ({
        word,
        status,
        score,
        language: lang,
      }));
    }
  }

  const lists = buildMasteryLists(rows);
  return NextResponse.json({
    mastered: lists.mastered,
    learning: lists.learning,
  });
}
