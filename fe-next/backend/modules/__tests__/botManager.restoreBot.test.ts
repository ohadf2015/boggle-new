/**
 * Test: restoreBotFromUser — re-register a bot after Redis rehydration.
 *
 * After a server restart the in-memory Bot is gone but its identity survives on
 * the game.users entry. restoreBotFromUser must rebuild it PRESERVING the
 * username/id/avatar (scores + word-hunt life are keyed by username) and must
 * not double-spawn a bot that's already registered.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { restoreBotFromUser, getGameBots, getBotByUsername, cleanupGameBots } from '../botManager';

const GAME = 'GBOT1';

describe('restoreBotFromUser', () => {
  beforeEach(() => {
    cleanupGameBots(GAME);
  });

  it('rebuilds a bot preserving username, id and avatar, with the persisted difficulty', () => {
    const avatar = { emoji: '🤖', color: '#123456' };
    const bot = restoreBotFromUser(
      GAME,
      'מתחיל Bot',
      { playerId: 'bot-7', avatar, botDifficulty: 'hard' },
      'he',
    );

    expect(bot).not.toBeNull();
    expect(bot!.username).toBe('מתחיל Bot');
    expect(bot!.id).toBe('bot-7');
    expect(bot!.avatar).toEqual(avatar);
    expect(bot!.difficulty).toBe('hard');
    expect(bot!.isBot).toBe(true);

    // It is now discoverable by startBotsForGame (getGameBots) and by username.
    expect(getGameBots(GAME).map(b => b.username)).toContain('מתחיל Bot');
    expect(getBotByUsername(GAME, 'מתחיל Bot')).not.toBeNull();
  });

  it('defaults difficulty to medium when botDifficulty is missing', () => {
    const bot = restoreBotFromUser(GAME, 'NoDiffBot', { playerId: 'bot-1' }, 'en');
    expect(bot!.difficulty).toBe('medium');
  });

  it('does NOT double-spawn a bot that is already registered (idempotent)', () => {
    restoreBotFromUser(GAME, 'DupBot', { playerId: 'bot-2', botDifficulty: 'easy' }, 'en');
    const second = restoreBotFromUser(GAME, 'DupBot', { playerId: 'bot-2', botDifficulty: 'easy' }, 'en');

    expect(second).toBeNull();
    expect(getGameBots(GAME).filter(b => b.username === 'DupBot')).toHaveLength(1);
  });
});
