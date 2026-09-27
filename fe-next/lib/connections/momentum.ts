/**
 * Word Bridge momentum — the "make me want to solve one more" hook (pure).
 *
 * Drives a forward-pull HUD chip: a visible reward that's always just a few
 * solves away, plus escalating "on fire" streak hype. The reward cadence and
 * streak milestones also gate the celebration FX (confetti/sound) so the
 * payoff lands exactly when the bar fills.
 */

/** Solve this many puzzles in a session to bank a reward (and refill the bar). */
export const REWARD_EVERY = 5;

/** Streaks that earn an extra burst of celebration. */
export const STREAK_MILESTONES = [3, 5, 10, 15, 20, 30, 50];

/** True when a streak just crossed a celebration milestone. */
export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}

/** Escalation tier for messaging/FX intensity: 0 cold · 1 warm · 2 hot · 3 blazing. */
export function streakTier(streak: number): 0 | 1 | 2 | 3 {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

export type MomentumMessage =
  | { kind: 'start'; goal: number }
  | { kind: 'toReward'; remaining: number }
  | { kind: 'rewardEarned'; rewardNumber: number }
  | { kind: 'onFire'; streak: number };

export interface MomentumState {
  /** Puzzles left until the next reward milestone (always 1..REWARD_EVERY). */
  solvedToNextReward: number;
  /** 0..1 fill of the reward progress bar (1 on the solve that banks a reward). */
  progressFraction: number;
  /** This solve banked a reward milestone. */
  justReachedReward: boolean;
  streak: number;
  streakTier: 0 | 1 | 2 | 3;
  /** What to whisper to the player to pull them into the next puzzle. */
  message: MomentumMessage;
}

export interface MomentumInput {
  /** Correct solves accumulated this session. */
  solvedThisSession: number;
  /** Current consecutive-correct streak. */
  streak: number;
}

export function momentumState({ solvedThisSession, streak }: MomentumInput): MomentumState {
  const justReachedReward = solvedThisSession > 0 && solvedThisSession % REWARD_EVERY === 0;
  const intoCycle = solvedThisSession % REWARD_EVERY;
  const solvedToNextReward = justReachedReward ? REWARD_EVERY : REWARD_EVERY - intoCycle;
  const progressFraction = justReachedReward ? 1 : intoCycle / REWARD_EVERY;
  const tier = streakTier(streak);

  let message: MomentumMessage;
  if (justReachedReward) {
    message = { kind: 'rewardEarned', rewardNumber: solvedThisSession / REWARD_EVERY };
  } else if (tier >= 2) {
    message = { kind: 'onFire', streak };
  } else if (solvedThisSession === 0 && streak === 0) {
    message = { kind: 'start', goal: REWARD_EVERY };
  } else {
    message = { kind: 'toReward', remaining: solvedToNextReward };
  }

  return { solvedToNextReward, progressFraction, justReachedReward, streak, streakTier: tier, message };
}
