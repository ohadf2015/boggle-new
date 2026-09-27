/**
 * Decides which celebration sound (if any) the post-drill progression overlay
 * should play when it opens.
 *
 * The in-drill "drill complete" sound already fired moments earlier, so playing
 * a sound on every overlay would double up and feel noisy. We reserve the
 * overlay's triumphant audio for genuine milestones:
 *   - a level promotion  -> the big level-up modal jingle
 *   - a personal best     -> the achievement sting
 * Everything else stays silent.
 */
export type ProgressionSoundKind = 'levelUp' | 'personalBest' | null;

export function pickProgressionSound(opts: {
  levelUp?: { newLevel: number; previousLevel: number } | null;
  improvement?: { isPersonalBest?: boolean } | null;
}): ProgressionSoundKind {
  // Only when a real promotion happened — mirrors the overlay's banner gate
  // (newLevel > previousLevel), so the jingle never plays without the banner.
  if (opts.levelUp && opts.levelUp.newLevel > opts.levelUp.previousLevel) {
    return 'levelUp';
  }
  if (opts.improvement?.isPersonalBest) return 'personalBest';
  return null;
}
