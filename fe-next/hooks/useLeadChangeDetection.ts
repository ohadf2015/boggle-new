import { useRef, useState, useEffect, useCallback } from 'react';

export interface LeadChangeEvent {
  type: 'took-lead' | 'lost-lead' | 'other-took-lead';
  newLeader: string;
  previousLeader?: string;
  /** Optional points margin over the runner-up, shown as a "(+N)" chip in
   *  LeadChangeBanner when present. The detection hook does not currently
   *  populate it; the banner guards every use with `!= null`, so it stays a
   *  no-op until a producer sets it. Declared here so the banner type-checks. */
  scoreGap?: number;
}

interface PlayerWithScore {
  username: string;
  score: number;
}

const COOLDOWN_MS = 5000;
const AUTO_CLEAR_MS = 2500;

/**
 * Detects lead changes in multiplayer leaderboard.
 * Only fires when the #1 position changes hands AND the current player is involved.
 * Requires ≥2 players with score > 0. Enforces a 5-second cooldown between events.
 * Auto-clears after 2.5s.
 */
export function useLeadChangeDetection(
  leaderboard: PlayerWithScore[],
  currentUsername: string
): LeadChangeEvent | null {
  const previousLeaderRef = useRef<string | null>(null);
  const lastEventTimeRef = useRef<number>(0);
  const [event, setEvent] = useState<LeadChangeEvent | null>(null);

  const clearEvent = useCallback(() => setEvent(null), []);

  useEffect(() => {
    // Need ≥2 players with score > 0
    const activePlayers = leaderboard.filter((p) => p.score > 0);
    if (activePlayers.length < 2) {
      // Still track leader for when competition starts
      if (leaderboard.length > 0) {
        previousLeaderRef.current = leaderboard[0].username;
      }
      return;
    }

    const currentLeader = leaderboard[0].username;
    const prevLeader = previousLeaderRef.current;

    // Update ref
    previousLeaderRef.current = currentLeader;

    // First time seeing a leader — no comparison
    if (prevLeader === null) return;

    // No change in leader
    if (currentLeader === prevLeader) return;

    // Check cooldown
    const now = Date.now();
    if (now - lastEventTimeRef.current < COOLDOWN_MS) return;

    lastEventTimeRef.current = now;

    // Determine event type based on current player involvement
    const type: LeadChangeEvent['type'] =
      currentLeader === currentUsername
        ? 'took-lead'
        : prevLeader === currentUsername
          ? 'lost-lead'
          : 'other-took-lead';

    setEvent({ type, newLeader: currentLeader, previousLeader: prevLeader });
  }, [leaderboard, currentUsername]);

  // Auto-clear after 2.5s
  useEffect(() => {
    if (!event) return;

    const timer = setTimeout(clearEvent, AUTO_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [event, clearEvent]);

  return event;
}
