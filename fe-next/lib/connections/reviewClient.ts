/**
 * Admin review tool — client API wrappers (Bearer-token auth for admin routes).
 */
import { createClient } from '@/utils/supabase/client';
import type { Verdict } from './review';

const BASE = '/api/admin/connections-puzzles/reviews';

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await createClient().auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export interface ReviewRecord {
  puzzle_id: string;
  language: string;
  verdict: Verdict;
  note: string | null;
  reviewed_at: string;
}
export interface FeedbackStat {
  puzzle_id: string;
  likes: number;
  dislikes: number;
  gaveups: number;
  total: number;
}

export async function fetchReviews(): Promise<{ reviews: ReviewRecord[]; feedback: FeedbackStat[] }> {
  try {
    const res = await fetch(BASE, { headers: await authHeaders() });
    if (!res.ok) return { reviews: [], feedback: [] };
    return (await res.json()) as { reviews: ReviewRecord[]; feedback: FeedbackStat[] };
  } catch {
    return { reviews: [], feedback: [] };
  }
}

export interface SaveVerdict {
  puzzleId: string;
  language: string;
  word1: string;
  word2: string;
  bridge: string;
  verdict: Verdict;
  note?: string;
}

export async function saveReviews(verdicts: SaveVerdict[]): Promise<{ ok: boolean; saved: number; error?: string }> {
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ verdicts }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, saved: 0, error: json.error };
    return { ok: true, saved: json.saved ?? verdicts.length };
  } catch {
    return { ok: false, saved: 0, error: 'network' };
  }
}
