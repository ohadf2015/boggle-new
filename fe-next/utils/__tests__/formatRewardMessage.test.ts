/**
 * Format Reward Message Tests
 *
 * Tests for the reward message formatting used in game toasts
 * to ensure clarity with emojis for life and tokens.
 */

import { formatRewardMessage } from '@/utils/formatRewardMessage';

describe('formatRewardMessage', () => {
  it('formats life gain only', () => {
    const result = formatRewardMessage({ lifeGained: 10 });
    expect(result).toBe('+10 ❤️');
  });

  it('formats life and token gains', () => {
    const result = formatRewardMessage({ lifeGained: 15, tokensGained: 2 });
    expect(result).toBe('+15 ❤️ +2 💰');
  });

  it('handles zero tokens (omits token display)', () => {
    const result = formatRewardMessage({ lifeGained: 5, tokensGained: 0 });
    expect(result).toBe('+5 ❤️');
  });

  it('handles undefined optional parameters', () => {
    const result = formatRewardMessage({ lifeGained: 25 });
    expect(result).toBe('+25 ❤️');
  });

  it('formats various token amounts correctly', () => {
    expect(formatRewardMessage({ lifeGained: 20, tokensGained: 4 })).toBe('+20 ❤️ +4 💰');
    expect(formatRewardMessage({ lifeGained: 25, tokensGained: 1 })).toBe('+25 ❤️ +1 💰');
  });
});
