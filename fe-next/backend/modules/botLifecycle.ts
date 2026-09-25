/**
 * Bot Lifecycle — per-bot timer primitives.
 *
 * Every bot turn in every mode is scheduled through `setBotTimeout` (see
 * services/gameLifecycle/botEngine.ts), so `stopBot` — which the one per-round
 * reset and every stop path call — cancels all of a bot's pending work.
 */

import type { Bot } from './botBehavior';
import logger from '../utils/logger';

/**
 * Create a self-cleaning timeout for a bot. The callback is skipped if the
 * bot was stopped in the meantime.
 */
export function setBotTimeout(bot: Bot, callback: () => void, delay: number): ReturnType<typeof setTimeout> {
  const timerId = setTimeout(() => {
    bot.activeTimers.delete(timerId);
    if (bot.isActive) {
      callback();
    }
  }, delay);

  bot.activeTimers.add(timerId);
  return timerId;
}

/**
 * Clear a specific bot timer
 */
export function clearBotTimeout(bot: Bot, timerId: ReturnType<typeof setTimeout>): void {
  if (bot.activeTimers.has(timerId)) {
    clearTimeout(timerId);
    bot.activeTimers.delete(timerId);
  }
}

/**
 * Stop a bot from playing: deactivate it and cancel every pending timer.
 */
export function stopBot(bot: Bot): void {
  bot.isActive = false;

  for (const timerId of bot.activeTimers) {
    clearTimeout(timerId);
  }
  bot.activeTimers.clear();

  logger.debug('BOT', `Stopped bot "${bot.username}"`);
}
