/**
 * Shared word-promotion helpers.
 *
 * `word_scores` is the canonical signal for community-approved words
 * (rows with net likes ≥ 10 are accepted at validation time). Both the
 * manual admin-approve flow and the auto-promotion pipeline need to
 * write the same row shape; this module consolidates that write.
 */

export type PromotionSubmitter = 'admin_approved' | 'auto_promoted';

export interface PromoteOptions {
  votes: number;
  submitter: PromotionSubmitter;
}

interface UpsertResult {
  error: { message: string } | null;
}

interface SupabaseLike {
  from(table: string): {
    upsert(row: Record<string, unknown>, opts: { onConflict: string }): PromiseLike<UpsertResult> | UpsertResult;
  };
}

/**
 * Upsert a word into `word_scores` so it is accepted in gameplay.
 * Votes vary by caller (auto = fixed 10, admin = count-scaled).
 */
export async function promoteWordToScores(
  supabase: SupabaseLike,
  word: string,
  language: string,
  { votes, submitter }: PromoteOptions
): Promise<void> {
  const { error } = await supabase.from('word_scores').upsert(
    {
      word,
      language,
      likes_count: votes,
      dislikes_count: 0,
      first_submitter: submitter,
      last_voted_at: new Date().toISOString(),
      // word_scores_promote_on_threshold() only flips this on 2+ DISTINCT
      // real word_votes rows, which this path never writes (the word was
      // already externally verified or admin-approved, not peer-voted) —
      // set it explicitly or the row silently never validates live.
      is_potentially_valid: true,
    },
    { onConflict: 'word,language' }
  );

  if (error) {
    throw new Error(error.message);
  }
}
