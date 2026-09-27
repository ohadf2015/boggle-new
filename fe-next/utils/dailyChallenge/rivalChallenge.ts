/**
 * Daily Challenge Rival Comparison
 *
 * Utilities for parsing rival data from share URLs and comparing scores
 */

export interface RivalData {
  name: string;
  emoji: string;
  score: number;
  puzzleNumber: number;
}

/**
 * Parse rival challenge parameters from URL search params
 *
 * @param params - URL search params object
 * @param todaysPuzzleNumber - The puzzle number for today (to reject stale links)
 * @returns Parsed rival data or null if invalid/stale
 */
export function parseRivalFromParams(
  params: Record<string, string | string[] | undefined>,
  todaysPuzzleNumber: number
): RivalData | null {
  try {
    // Extract and validate required params
    const name = typeof params.whName === 'string' ? params.whName : undefined;
    const emoji = typeof params.whEmoji === 'string' ? params.whEmoji : undefined;
    const scoreStr = typeof params.whScore === 'string' ? params.whScore : undefined;
    const puzzleStr = typeof params.whPuzzle === 'string' ? params.whPuzzle : undefined;

    // Check all required params are present
    if (name === undefined || emoji === undefined || scoreStr === undefined || puzzleStr === undefined) {
      return null;
    }

    // Parse numeric values
    const score = parseInt(scoreStr, 10);
    const puzzleNumber = parseInt(puzzleStr, 10);

    // Validate numeric conversions
    if (isNaN(score) || isNaN(puzzleNumber)) {
      return null;
    }

    // Reject stale puzzle links (not today's puzzle)
    if (puzzleNumber !== todaysPuzzleNumber) {
      return null;
    }

    return {
      name,
      emoji,
      score,
      puzzleNumber,
    };
  } catch {
    return null;
  }
}
