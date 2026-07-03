import { BOT_DIFFICULTIES, type BotDifficulty } from './botDifficulty';
import { WORDCRAFT_MODIFIERS, type WordCraftModifier } from './modifiers';

const KEY = 'wordcraft.setup.v1';

/**
 * The player's pre-game choices from the WordCraft setup screen.
 * localStorage is the ONLY source (read synchronously before first paint) —
 * no DB column, no feature flag, so there is no late-resolving second source
 * to flash-override the UI.
 */
export interface WordCraftSetupChoice {
  /**
   * 'friend' = remote challenge: plays vs the bot, then the results screen
   * pushes the beat-my-score duel link to send to a player who isn't nearby.
   */
  opponent: 'bot' | 'hotseat' | 'friend';
  difficulty: BotDifficulty;
  /** 'surprise' = keep the seeded per-game roll (the pre-overhaul behavior). */
  modifier: WordCraftModifier | 'surprise';
}

export const DEFAULT_SETUP: WordCraftSetupChoice = { opponent: 'bot', difficulty: 'easy', modifier: 'surprise' };

export function loadSetupPrefs(): WordCraftSetupChoice {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETUP;
    const p = JSON.parse(raw) as Partial<WordCraftSetupChoice>;
    return {
      opponent: p.opponent === 'hotseat' || p.opponent === 'friend' ? p.opponent : 'bot',
      difficulty: BOT_DIFFICULTIES.includes(p.difficulty as BotDifficulty)
        ? (p.difficulty as BotDifficulty)
        : DEFAULT_SETUP.difficulty,
      modifier:
        p.modifier === 'surprise' || WORDCRAFT_MODIFIERS.includes(p.modifier as WordCraftModifier)
          ? (p.modifier as WordCraftSetupChoice['modifier'])
          : 'surprise',
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

export function saveSetupPrefs(c: WordCraftSetupChoice): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // private mode / storage quota — non-fatal, next visit just shows defaults
  }
}
