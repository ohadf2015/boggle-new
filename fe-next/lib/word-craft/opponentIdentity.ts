import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface ScoreboardOpponent {
  name: string;
  /** Explicit avatar config, or null to let the Avatar seed a fallback from `seed`. */
  avatar: CustomAvatarConfig | null;
  /** Stable string the Avatar uses to derive a deterministic fallback face. */
  seed: string;
  isBot: boolean;
}

export interface ResolveOpponentArgs {
  hotseat: boolean;
  botLabel: string;
  hotseatLabel: string;
}

/**
 * Identity for the scoreboard's right-hand side — the side that actually plays
 * on the board, and whose live score the kinetic bar tracks. The goal is that
 * this slot ALWAYS has a face (never a bare "WordBot").
 *
 * Note this is deliberately NOT the duel friend. A duel is async: the friend
 * already played the seed and their *recorded* score is the target. A bot
 * contests the live board. So the friend belongs in WordCraftDuelTargetStrip
 * (with their own avatar + target score) — putting their name beside the bot's
 * live score here would show one person with two different scores.
 */
export function resolveScoreboardOpponent({
  hotseat,
  botLabel,
  hotseatLabel,
}: ResolveOpponentArgs): ScoreboardOpponent {
  if (hotseat) {
    return { name: hotseatLabel, avatar: null, seed: hotseatLabel, isBot: false };
  }
  return { name: botLabel, avatar: null, seed: 'wordbot', isBot: true };
}
