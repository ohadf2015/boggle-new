/**
 * Tests for daily challenge leaderboard rank reassignment.
 *
 * Background: the `daily_puzzle_leaderboard` SQL view partitions
 * ROW_NUMBER() by (puzzle_date, language) — but it includes guest rows.
 * Once the API filters out guests (`.not('player_id', 'is', null)`),
 * the view-assigned rank_position can start at 2, 3, … leaving gaps.
 *
 * To guarantee each language's leaderboard starts at rank 1,
 * the route rerank the filtered rows sequentially (index + 1).
 *
 * This test documents the pure rerank logic used in both daily puzzle
 * and Word Hunt routes.
 */

interface LeaderboardRow {
  player_id: string;
  language: string;
  score: number;
  rank_position: number;
}

function rerankSequential<T extends { rank_position: number }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, rank_position: index + 1 }));
}

describe('daily leaderboard rerank', () => {
  it('starts rank at 1 when view-assigned ranks have gaps from filtered guests', () => {
    // View partitioned by language; guests removed. First auth player was rank 3.
    const filtered: LeaderboardRow[] = [
      { player_id: 'a', language: 'he', score: 900, rank_position: 3 },
      { player_id: 'b', language: 'he', score: 800, rank_position: 5 },
      { player_id: 'c', language: 'he', score: 700, rank_position: 6 },
    ];

    const reranked = rerankSequential(filtered);

    expect(reranked.map((r) => r.rank_position)).toEqual([1, 2, 3]);
  });

  it('is independent across languages — each starts at 1 in its own response', () => {
    const he = rerankSequential<LeaderboardRow>([
      { player_id: 'a', language: 'he', score: 500, rank_position: 2 },
      { player_id: 'b', language: 'he', score: 400, rank_position: 4 },
    ]);
    const en = rerankSequential<LeaderboardRow>([
      { player_id: 'x', language: 'en', score: 9000, rank_position: 7 },
    ]);

    // Hebrew #1 has 500 points even though English #1 has 9000.
    expect(he[0].rank_position).toBe(1);
    expect(en[0].rank_position).toBe(1);
  });

  it('returns empty array unchanged', () => {
    expect(rerankSequential<LeaderboardRow>([])).toEqual([]);
  });

  it('computes auth-only rank by counting auth players above in the view', () => {
    // Simulates the submit/stats logic: given a player's view-rank and
    // all auth players' view-ranks, compute the sequential auth-only rank.
    function computeAuthRank(
      playerViewRank: number,
      allAuthViewRanks: number[]
    ): number {
      const authAbove = allAuthViewRanks.filter((r) => r < playerViewRank).length;
      return authAbove + 1;
    }

    // View has guests at ranks 1, 2, 4. Auth players at 3, 5, 6.
    const authViewRanks = [3, 5, 6];

    // Auth player at view-rank 3 → auth-only rank 1
    expect(computeAuthRank(3, authViewRanks)).toBe(1);
    // Auth player at view-rank 5 → auth-only rank 2
    expect(computeAuthRank(5, authViewRanks)).toBe(2);
    // Auth player at view-rank 6 → auth-only rank 3
    expect(computeAuthRank(6, authViewRanks)).toBe(3);
  });

  it('preserves ordering and other row fields', () => {
    const rows: LeaderboardRow[] = [
      { player_id: 'a', language: 'en', score: 100, rank_position: 9 },
      { player_id: 'b', language: 'en', score: 90, rank_position: 10 },
    ];

    const reranked = rerankSequential(rows);

    expect(reranked[0]).toMatchObject({ player_id: 'a', score: 100, rank_position: 1 });
    expect(reranked[1]).toMatchObject({ player_id: 'b', score: 90, rank_position: 2 });
  });
});
