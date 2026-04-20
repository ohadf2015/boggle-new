import { createClient } from '@/utils/supabase/client';
import type { PuzzleRating } from './types';

export interface SubmitFeedbackInput {
  puzzleId: string;
  locale: string;
  rating: PuzzleRating;
  gaveUp: boolean;
}

export async function submitConnectionsFeedback(input: SubmitFeedbackInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('connections_feedback').insert({
      puzzle_id: input.puzzleId,
      locale: input.locale,
      rating: input.rating,
      gave_up: input.gaveUp,
      user_id: auth?.user?.id ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}
