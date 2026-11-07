import { getAnonClient } from '@/utils/supabase/anon';

/** True when `word` (already normalized for its language) is a promoted community word. */
export async function checkCommunityWord(word: string, language: string): Promise<boolean> {
  const supabase = getAnonClient();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('word_scores')
      .select('id')
      .eq('word', word)
      .eq('language', language)
      .eq('is_potentially_valid', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[community-word] lookup error:', error.message);
      return false;
    }
    return data !== null;
  } catch {
    return false;
  }
}
