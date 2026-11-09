/**
 * Shown name for another player, never an id.
 *
 * Most profiles were never named: the signup trigger stores `Player_<8hex>`
 * (the start of the UUID) as username. Shown raw, the round results read
 * "Player_9ed33e25". This resolves a real chosen name first (display_name,
 * then username) and otherwise gives the player a stable, readable stand-in
 * from the same localized name pool guests get ("Sneaky Pickle").
 *
 * Server-side only: it reads the bot/guest name pools.
 */
import { BOT_CONFIG } from '@/backend/modules/botConfig';
import { resolveDisplayName } from './displayName';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A readable name derived from `seedId` (same id → same name). Pass `taken` to
 * keep one board free of duplicates; the chosen name is added to it.
 */
export function friendlyPlayerName(seedId: string, language: string = 'en', taken?: Set<string>): string {
  const pool = BOT_CONFIG.PLAYER_NAMES[language] ?? BOT_CONFIG.PLAYER_NAMES.en;
  const start = hash(seedId) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const name = pool[(start + i) % pool.length].name;
    if (!taken?.has(name)) {
      taken?.add(name);
      return name;
    }
  }
  return pool[start].name;
}

export interface NamedProfile {
  id: string;
  display_name?: string | null;
  username?: string | null;
}

/** A profile's shown name: its chosen name, else a stable friendly one. */
export function shownPlayerName(profile: NamedProfile, language: string = 'en', taken?: Set<string>): string {
  const real = resolveDisplayName([profile.display_name, profile.username], '');
  if (real) {
    taken?.add(real);
    return real;
  }
  return friendlyPlayerName(profile.id, language, taken);
}
