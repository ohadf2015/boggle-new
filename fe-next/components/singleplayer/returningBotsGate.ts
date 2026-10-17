/**
 * Returning-player bots → MP Quick Play gate.
 *
 * Intent: the in-app FTUE ladder (`?autoStart=bots` / `?preset=bots`) graduates
 * a player to multiplayer after their first solo-bots game.
 *
 * It must NOT steal Google/SEO landers on bare `/singleplayer`. Production
 * 7d (2026-10-17 UR P2): 37 `singleplayer_bots_stale_redirect` events / 5 users.
 * One ES Google lander fired 30 of them — SEO "play solo" → /es/singleplayer →
 * yanked to MP → back to the SEO page → click again.
 */

const SEARCH_ENGINE_HOST = /(?:^|\.)(?:google|bing|duckduckgo|yahoo|yandex|baidu)(?:\.[a-z]{2,})+$/i;

export const BOTS_REDIRECT_SESSION_KEY = 'lc_sp_bots_mp_redirected';

export function isSearchEngineReferrer(referrer: string): boolean {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '');
    return SEARCH_ENGINE_HOST.test(host);
  } catch {
    return false;
  }
}

export function shouldRedirectReturningBots(input: {
  hasPlayedBots: boolean;
  isBotsEntry: boolean;
  isBareEntry: boolean;
  referrer: string;
  alreadyRedirectedThisSession: boolean;
}): boolean {
  if (!input.hasPlayedBots) return false;
  if (!input.isBotsEntry) return false;
  // Bare /singleplayer is the SEO/CTA URL. Keep the player on a solo game.
  if (input.isBareEntry) return false;
  if (input.alreadyRedirectedThisSession) return false;
  if (isSearchEngineReferrer(input.referrer)) return false;
  return true;
}

export function readBotsRedirectedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(BOTS_REDIRECT_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markBotsRedirectedThisSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(BOTS_REDIRECT_SESSION_KEY, '1');
  } catch {
    /* private mode / quota — skip cap */
  }
}

/** Bare SEO hits get the coached first round, not bots (and never the MP yank). */
export const BARE_SINGLEPLAYER_AUTOSTART = 'coach' as const;
