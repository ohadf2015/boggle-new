import { capped, getWeeklyScoresAbove, getWeeklyStanding, type BlastBoardEntry } from './blastLeaderboard';
import { BLAST_LADDER_SIZE } from './blastLadderSize';

export interface NamedBlastScore {
  name: string;
  score: number;
}

type SupabaseLike = any;

interface ProfileRow {
  id: string;
  username?: string | null;
  display_name?: string | null;
  is_test_account?: boolean | null;
  is_admin?: boolean | null;
}

/** Resolve weekly-board user ids to display names; rows without a profile are dropped. */
export async function nameBoardEntries(
  supabase: SupabaseLike,
  entries: readonly BlastBoardEntry[],
): Promise<NamedBlastScore[]> {
  if (entries.length === 0) return [];
  try {
    const lookup = supabase
      .from('profiles')
      .select('id, username, display_name, is_test_account, is_admin')
      .in('id', entries.map((e) => e.userId)) as Promise<{ data: ProfileRow[] | null }>;
    const { data } = await capped(lookup, { data: null });
    const names = new Map<string, string>();
    for (const row of data ?? []) {
      const name = row.display_name || row.username;
      if (name && !row.is_test_account && !row.is_admin) names.set(row.id, name);
    }
    return entries.flatMap((e) => {
      const name = names.get(e.userId);
      return name ? [{ name, score: e.score }] : [];
    });
  } catch {
    return [];
  }
}

export interface BlastLadder {
  rank: number | null;
  total: number | null;
  /** Nearest weekly scores above the player, closest first. */
  rivals: NamedBlastScore[];
}

export async function loadBlastLadder(
  supabase: SupabaseLike,
  userId: string,
  lang: string,
  difficulty: string,
): Promise<BlastLadder> {
  const standing = await getWeeklyStanding(userId, lang, difficulty);
  const above = await getWeeklyScoresAbove(standing?.score ?? 0, lang, difficulty, BLAST_LADDER_SIZE);
  return {
    rank: standing?.rank ?? null,
    total: standing?.total ?? null,
    rivals: await nameBoardEntries(supabase, above),
  };
}
