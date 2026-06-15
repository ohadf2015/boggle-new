/**
 * Per-device latch for the multiplayer Blast showcase opener.
 *
 * The server forces the FIRST random round of a new room to be Blast (a strong
 * first impression). Without a latch that fires for every new room, so a returning
 * player keeps getting Blast first every time. This flag records that the player
 * has already seen the opener once; the host sends it on `startGame` so the server
 * rolls weighted-random from round 1 thereafter.
 *
 * SSR-safe: all access is guarded so it no-ops during server render.
 */

export const MP_BLAST_INTRO_KEY = 'lexiclash_mp_blast_intro_seen';

export function hasSeenMpBlastIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MP_BLAST_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markMpBlastIntroSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MP_BLAST_INTRO_KEY, '1');
  } catch {
    // localStorage unavailable (private mode / quota) — degrade silently.
  }
}
