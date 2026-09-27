import { useRef, useState, useEffect, useCallback } from 'react';
import { detectOvertakes, type RankedPlayer } from '@/lib/multiplayer/overtakeDetection';

export interface OvertakeAlert {
  /** Player who most recently passed me. */
  passedBy: string;
  /** How many players passed me in this update (>=1). */
  count: number;
}

const COOLDOWN_MS = 4000;
const AUTO_CLEAR_MS = 2800;

/**
 * Tracks the current player's live rank and surfaces a transient "someone passed
 * you" alert. Returns the always-current 1-based rank plus a debounced alert
 * (cooldown between alerts, auto-clears) so the mobile cue is informative, not
 * spammy — important because recurring rush tiles cause frequent rank churn.
 */
export function useOvertakeAlert(
  leaderboard: RankedPlayer[],
  currentUsername: string,
): { myRank: number; alert: OvertakeAlert | null } {
  const prevRef = useRef<RankedPlayer[]>([]);
  const lastAlertTimeRef = useRef<number>(0);
  const [myRank, setMyRank] = useState(0);
  const [alert, setAlert] = useState<OvertakeAlert | null>(null);

  const clearAlert = useCallback(() => setAlert(null), []);

  useEffect(() => {
    const prev = prevRef.current;
    const { myRank: rank, overtakenBy } = detectOvertakes(prev, leaderboard, currentUsername);
    prevRef.current = leaderboard;

    if (rank !== myRank) setMyRank(rank);

    if (overtakenBy.length === 0) return;

    const now = Date.now();
    if (now - lastAlertTimeRef.current < COOLDOWN_MS) return;
    lastAlertTimeRef.current = now;

    // Name the player nearest above me (last one in the list passed by) for the cue.
    setAlert({ passedBy: overtakenBy[overtakenBy.length - 1], count: overtakenBy.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboard, currentUsername]);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(clearAlert, AUTO_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [alert, clearAlert]);

  return { myRank, alert };
}
