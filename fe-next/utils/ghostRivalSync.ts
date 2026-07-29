/**
 * Ghost Rival score sync — fire-and-forget POST to /api/ghost-rival.
 *
 * Called after authenticated games to increment the player's weekly
 * score in their rivalry. Silently swallows all errors so it never
 * blocks the results page or surfaces transient network issues to
 * the user.
 */
export async function syncGhostRivalScore(
  userId: string,
  points: number
): Promise<void> {
  if (!userId) return;
  if (!(points > 0)) return;

  try {
    await fetch('/api/ghost-rival', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, points }),
    });
  } catch {
    // fire-and-forget: swallow network errors
  }
}
