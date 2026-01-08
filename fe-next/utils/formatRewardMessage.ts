/**
 * Format Reward Message Utility
 *
 * Formats reward messages for game toasts with clear emojis
 * for life and tokens.
 */

export interface RewardMessageParams {
  lifeGained: number;
  tokensGained?: number;
}

/**
 * Formats a reward message with appropriate emojis for clarity.
 *
 * @param params - The reward parameters
 * @returns Formatted message like "+10 ❤️ +2 💰"
 */
export function formatRewardMessage(params: RewardMessageParams): string {
  const { lifeGained, tokensGained = 0 } = params;

  const parts: string[] = [];

  // Life gained (always shown)
  parts.push(`+${lifeGained} ❤️`);

  // Tokens gained (only if > 0)
  if (tokensGained > 0) {
    parts.push(`+${tokensGained} 💰`);
  }

  return parts.join(' ');
}
