import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createClient } from '@/utils/supabase/server';
import { generateRandomTable } from '@/backend/utils/gameUtils';
import { isWordMasteryEnabledFor } from '@/lib/wordMastery/access';
import { pickWeakestWords, type WeakWordRow } from '@/lib/wordMastery';
import type { Language } from '@/types';

const SEED_LIMIT = 8;
const GRID_SIZE = 4;
const SUPPORTED_LANGUAGES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = await isWordMasteryEnabledFor(user.id);
  if (!enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let language: Language = 'en';
  try {
    const body = (await request.json()) as { language?: string };
    if (body.language && SUPPORTED_LANGUAGES.has(body.language)) {
      language = body.language as Language;
    }
  } catch {
    // default language
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('player_word_mastery')
    .select('word, score, status')
    .eq('player_id', user.id)
    .eq('status', 'learning')
    .eq('language', language)
    .order('score', { ascending: true })
    .limit(SEED_LIMIT);

  if (error) {
    return NextResponse.json({ error: 'Failed to load learning words' }, { status: 500 });
  }

  const seedWords = pickWeakestWords((data ?? []) as WeakWordRow[], SEED_LIMIT).filter(
    (word) => word.length >= 2 && word.length <= GRID_SIZE * GRID_SIZE,
  );

  if (seedWords.length === 0) {
    return NextResponse.json({ error: 'No learning words to practice' }, { status: 400 });
  }

  try {
    const grid = generateRandomTable(GRID_SIZE, GRID_SIZE, language, seedWords);
    return NextResponse.json({ grid, seedWords });
  } catch {
    return NextResponse.json({ error: 'Failed to generate practice grid' }, { status: 500 });
  }
}
